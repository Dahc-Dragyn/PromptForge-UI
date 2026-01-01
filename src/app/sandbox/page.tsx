// src/app/sandbox/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePrompts } from '@/hooks/usePrompts';
import Modal from '@/components/Modal';
import AutoSizingTextarea from '@/components/AutoSizingTextarea';
import { TrashIcon, SparklesIcon } from '@heroicons/react/24/solid';

// --- Type Definitions ---
interface SandboxResult {
    prompt_id: string;
    generated_text: string;
    latency_ms: number;
    input_token_count: number;
    output_token_count: number;
    error?: string;
}

// --- FIX: Updated model list to match backend ---
const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash-lite', name: 'Google Gemini 2.5 Flash-Lite' },
    { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
];
const AI_MODEL_ID = 'gemini-2.5-flash-lite';

// --- Main Component ---
function SandboxContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createPrompt } = usePrompts();

    const [prompts, setPrompts] = useState<string[]>(['']);
    const [sharedInput, setSharedInput] = useState('');
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SandboxResult[]>([]);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [promptToSave, setPromptToSave] = useState('');
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptDescription, setNewPromptDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

    useEffect(() => {
        const promptA = searchParams.get('promptA');
        const promptB = searchParams.get('promptB');
        if (promptA && promptB) {
            setPrompts([decodeURIComponent(promptA), decodeURIComponent(promptB)]);
        } else {
            const singlePrompt = searchParams.get('prompt');
            if (singlePrompt) setPrompts([decodeURIComponent(singlePrompt)]);
        }
    }, [searchParams]);

    const handlePromptChange = (index: number, value: string) => {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    };

    const addPromptVariation = () => {
        if (prompts.length < 4) setPrompts(p => [...p, '']);
    };
    
    const removePromptVariation = (index: number) => {
        if (prompts.length > 1) setPrompts(p => p.filter((_, i) => i !== index));
    };

    const addAiVariation = async () => {
        const lastPrompt = [...prompts].reverse().find(p => p.trim());
        if (!lastPrompt || prompts.length >= 4) return toast.error("Max 4 variations. At least one prompt needed to generate from.");
        
        setIsLoading(true);
        const toastId = toast.loading('Generating AI variation...');
        const metaPrompt = `Based on this prompt, create one distinct variation with a different approach:\n\n"${lastPrompt}"`;
        
        try {
            const response = await apiClient.post<{ final_text: string }>('/prompts/execute', {
                prompt_text: metaPrompt,
                model: AI_MODEL_ID
            });
            const newVariation = response.final_text.trim().replace(/^"|"$/g, '');
            setPrompts(p => [...p, newVariation]);
            toast.success('AI variation added!', { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate variation.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    const runAbTest = async () => {
        const activePrompts = prompts.map((p, i) => ({ id: `v${i}`, text: p.trim() })).filter(p => p.text);
        if (activePrompts.length === 0) return toast.error("Please provide at least one prompt.");
        
        setIsLoading(true);
        setResults([]);
        const toastId = toast.loading('Running A/B test...');

        try {
            // --- FIX: Corrected the entire payload structure ---
            const payload = {
                model: selectedModel,
                input_text: sharedInput,
                prompts: activePrompts.map(p => ({
                    id: p.id,
                    text: p.text,
                }))
            };
            
            const response = await apiClient.post<{ results: SandboxResult[] }>('/sandbox/run', payload);
            setResults(response.results);
            toast.success('Test complete!', { id: toastId });
        } catch (err: any) {
            toast.error(err.message || "A/B test failed.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSaveModal = async (promptContent: string) => {
        setPromptToSave(promptContent);
        setIsSaveModalOpen(true);
        setNewPromptName('');
        setNewPromptDescription('');
        setIsGeneratingDetails(true);
        try {
            const namePromise = apiClient.post<{final_text: string}>('/prompts/execute', { prompt_text: `Generate a 3-5 word title for this prompt: "${promptContent}"`, model: AI_MODEL_ID });
            const descPromise = apiClient.post<{final_text: string}>('/prompts/execute', { prompt_text: `Generate a one-sentence description for this prompt: "${promptContent}"`, model: AI_MODEL_ID });
            const [nameRes, descRes] = await Promise.all([namePromise, descPromise]);
            setNewPromptName(nameRes.final_text.trim().replace(/"/g, ''));
            setNewPromptDescription(descRes.final_text.trim());
        } catch (err) {
            toast.error("Could not auto-generate details.");
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleSavePrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const promise = createPrompt({
            name: newPromptName,
            description: newPromptDescription,
            text: promptToSave,
        });
        
        toast.promise(promise, {
            loading: 'Saving prompt...',
            success: 'Prompt saved successfully!',
            error: (err) => err.message || 'Failed to save prompt.'
        });

        try {
            await promise;
            setIsSaveModalOpen(false);
        } catch (error) {
            // Error is handled by the toast
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8 text-center">A/B Test Sandbox</h1>
                    <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {prompts.map((prompt, index) => (
                                <div key={index} className="flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="font-bold text-gray-800">Prompt Variation #{index + 1}</label>
                                        {prompts.length > 1 && <button onClick={() => removePromptVariation(index)}><TrashIcon className="h-5 w-5 text-red-500"/></button>}
                                    </div>
                                    <AutoSizingTextarea value={prompt} onChange={(e) => handlePromptChange(index, e.target.value)} rows={8} />
                                    <button onClick={() => handleOpenSaveModal(prompt)} disabled={!prompt.trim()} className="mt-2 py-2 text-sm bg-blue-600 text-white rounded font-semibold disabled:opacity-50">Save...</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            {prompts.length < 4 && <button onClick={addPromptVariation} className="px-4 py-2 bg-gray-600 text-white rounded font-semibold">+ Add Variation</button>}
                            {prompts.length < 4 && <button onClick={addAiVariation} disabled={isLoading} className="px-4 py-2 bg-sky-600 text-white rounded font-semibold flex items-center gap-2"><SparklesIcon className="h-5 w-5" /> AI Variation</button>}
                        </div>
                        <div className="mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <AutoSizingTextarea placeholder="Shared Input (use {shared_input})" value={sharedInput} onChange={(e) => setSharedInput(e.target.value)} rows={3} className="w-full border rounded p-2"/>
                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border rounded p-2 bg-gray-100 h-11">
                                {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <button onClick={runAbTest} disabled={isLoading} className="w-full mt-6 py-3 bg-purple-600 text-white rounded font-semibold text-lg">{isLoading ? 'Running Test...' : 'Run A/B Test'}</button>
                    </div>

                    {results.length > 0 && <div className="mt-10">
                        <h2 className="text-3xl font-bold mb-6 text-center">Test Results</h2>
                        <div className={`grid grid-cols-1 md:grid-cols-${results.length > 1 ? '2' : '1'} gap-6`}>
                            {results.map((result) => (
                                <div key={result.prompt_id} className="bg-gray-800 rounded-lg p-5">
                                    <h3 className="text-xl font-semibold mb-3">Result for Variation #{parseInt(result.prompt_id.replace('v', '')) + 1}</h3>
                                    {result.error ? 
                                        <p className="text-red-400">{result.error}</p> :
                                        <pre className="whitespace-pre-wrap text-gray-300 bg-gray-900 p-4 rounded-md">{result.generated_text}</pre>
                                    }
                                </div>
                            ))}
                        </div>
                    </div>}
                </div>
            </div>
            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
                <form onSubmit={handleSavePrompt} className="space-y-4">
                    {/* FIX 1: Change text-black to text-white and add dark background/border */}
                    <input 
                        type="text" 
                        value={newPromptName} 
                        onChange={(e) => setNewPromptName(e.target.value)} 
                        placeholder="Prompt Name" 
                        disabled={isGeneratingDetails} 
                        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded" 
                        required 
                    />
                    {/* FIX 2: Change text-black to text-white and add dark background/border */}
                    <textarea 
                        value={newPromptDescription} 
                        onChange={(e) => setNewPromptDescription(e.target.value)} 
                        placeholder="Description" 
                        disabled={isGeneratingDetails} 
                        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded" 
                        rows={3} 
                        required 
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                        <button type="submit" disabled={isSaving || isGeneratingDetails} className="px-4 py-2 bg-blue-600 rounded">{isSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

const SandboxPage = () => (<Suspense fallback={<div className="bg-gray-900 text-white text-center p-8">Loading Sandbox...</div>}><SandboxContent /></Suspense>);
export default SandboxPage;
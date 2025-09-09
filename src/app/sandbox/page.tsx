// src/app/sandbox/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;

const AVAILABLE_MODELS = [
    { id: 'gemini-2.0-flash-lite-001', name: 'Google Gemini Flash' },
    { id: 'gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano' },
];

// --- NEW: Expanded list of response styles ---
const RESPONSE_STYLES = [
    { value: 'default', label: 'Default' },
    { value: 'concise', label: 'Concise', instruction: 'System Note: Respond as concisely as possible.' },
    { value: 'detailed', label: 'Detailed', instruction: 'System Note: Provide a detailed and thorough response.' },
    { value: 'creative', label: 'Creative', instruction: 'System Note: Respond in an imaginative way, using analogies and storytelling elements.' },
    { value: 'technical', label: 'Technical', instruction: 'System Note: Use precise terminology and focus on implementation details.' },
    { value: 'conversational', label: 'Conversational', instruction: 'System Note: Use a casual, friendly tone, like talking to a peer.' },
    { value: 'academic', label: 'Academic', instruction: 'System Note: Use a formal, evidence-based tone with systematic reasoning.' },
    { value: 'step-by-step', label: 'Step-by-step', instruction: 'System Note: Break the response into clear, sequential instructions.' },
    { value: 'executive', label: 'Executive', instruction: 'System Note: Be bottom-line focused, emphasizing key takeaways.' },
    { value: 'beginner-friendly', label: 'Beginner-friendly', instruction: 'System Note: Avoid jargon and explain concepts from first principles.' },
    { value: 'funny', label: 'Funny', instruction: 'System Note: Respond with humor and wit.' },
    { value: 'hilarious', label: 'Hilarious', instruction: 'System Note: Respond in an over-the-top, hilarious manner.' },
];

type TestResult = {
    variationIndex: number;
    output: string;
    latency: number;
    token_count: number;
    error?: string;
};

function SandboxContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [prompts, setPrompts] = useState<string[]>(['', '']);
    const [sharedInput, setSharedInput] = useState('');
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [responseStyle, setResponseStyle] = useState('default');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [promptToSave, setPromptToSave] = useState('');
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptDescription, setNewPromptDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);

    useEffect(() => {
        const promptsFromUrl = searchParams.getAll('prompt');
        if (promptsFromUrl.length > 0) {
            const decoded = promptsFromUrl.map(p => decodeURIComponent(p));
            while (decoded.length < 2) {
                decoded.push('');
            }
            setPrompts(decoded);
        } else {
            setPrompts(['', '']);
        }
    }, [searchParams]);

    const handlePromptChange = (index: number, value: string) => {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    };

    const addPromptVariation = () => {
        if (prompts.length < 4) {
            setPrompts([...prompts, '']);
        }
    };

    const removePromptVariation = (index: number) => {
        if (prompts.length > 2) {
            const newPrompts = prompts.filter((_, i) => i !== index);
            setPrompts(newPrompts);
        }
    };
    
    const addAiVariation = async () => {
        const lastPopulatedPrompt = [...prompts].reverse().find(p => p.trim() !== '');
        if (prompts.length >= 4 || !lastPopulatedPrompt) {
            toast.error("You need at least one prompt to generate a variation from, and you can have a maximum of 4 variations.");
            return;
        }
        
        setIsGeneratingVariation(true);
        const toastId = toast.loading('Generating AI variation...');

        const metaPrompt = `Based on the following prompt, generate one new, distinct variation. The new variation should aim to achieve the same goal but use a different approach (e.g., be more concise, more detailed, use a different tone, or add a new constraint). Only output the new prompt text, with no extra commentary.\n\nOriginal Prompt:\n"${lastPopulatedPrompt}"`;

        try {
            const response = await fetch(`${API_BASE_URL}/prompts/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ prompt_text: metaPrompt }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to generate variation.');
            
            setPrompts([...prompts, data.generated_text]);
            toast.success('AI variation added!', { id: toastId });
        } catch (error: any) {
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setIsGeneratingVariation(false);
        }
    };

    const runAbTest = async () => {
        setLoading(true);
        setResults([]);
        const activePrompts = prompts.filter(p => p.trim() !== '');

        const getModifiedPrompt = (promptText: string, style: string): string => {
            const selectedStyle = RESPONSE_STYLES.find(s => s.value === style);
            if (selectedStyle && selectedStyle.instruction) {
                return `${selectedStyle.instruction}\n\n---\n\n${promptText}`;
            }
            return promptText;
        };

        const payload = {
            prompts: activePrompts.map((p, i) => ({ 
                id: `v${i+1}`, 
                text: getModifiedPrompt(p, responseStyle)
            })),
            input_text: sharedInput,
            model: selectedModel,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/sandbox/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'An API error occurred.');
            }

            const data = await response.json();
            const formattedResults = data.results.map((res: any) => ({
                variationIndex: parseInt(res.prompt_id.replace('v', ''), 10) -1,
                output: res.generated_text,
                latency: Math.round(res.latency_ms),
                token_count: res.total_tokens || 0,
            }));
            setResults(formattedResults);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSaveModal = async (promptContent: string) => {
        setPromptToSave(promptContent);
        setIsSaveModalOpen(true);
        setNewPromptName('');
        setNewPromptDescription('');
        setIsGeneratingDetails(true);
        try {
            const nameMetaPrompt = `Based on the following prompt, generate a short, descriptive, 3-5 word title. Do not use quotes. The prompt is: "${promptContent}"`;
            const descMetaPrompt = `Based on the following prompt, generate a one-sentence description of the task it performs. The prompt is: "${promptContent}"`;

            const [nameRes, descRes] = await Promise.all([
                fetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
                fetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: descMetaPrompt }) })
            ]);

            if (!nameRes.ok || !descRes.ok) throw new Error('Failed to generate prompt details.');
            const nameData = await nameRes.json();
            const descData = await descRes.json();

            setNewPromptName(nameData.generated_text.trim().replace(/"/g, ''));
            setNewPromptDescription(descData.generated_text.trim());
        } catch (err) {
            console.error("Failed to generate details:", err);
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleSavePrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const docRef = await addDoc(collection(db, 'prompts'), {
                name: newPromptName,
                task_description: newPromptDescription,
                userId: user.uid,
                isArchived: false,
                created_at: serverTimestamp(),
            });

            const versionsUrl = `${API_BASE_URL}/prompts/${docRef.id}/versions`;
            await fetch(versionsUrl, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_text: promptToSave,
                    commit_message: "Initial version from Sandbox test.",
                }),
            });
            
            setIsSaveModalOpen(false);
            router.push('/dashboard');
            toast.success(`Prompt "${newPromptName}" saved successfully!`);
        } catch (err: any) {
            toast.error(`Save failed: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (authLoading || !user) {
        return <div className="text-center p-8">Loading...</div>;
    }

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold mb-4 text-center">A/B Test Sandbox</h1>
                    <p className="text-gray-400 text-center mb-8">Compare multiple prompt variations side-by-side to find the optimal wording.</p>

                    <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {prompts.map((prompt, index) => (
                                <div key={index} className="flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-lg font-bold text-gray-800">Prompt Variation #{index + 1}</label>
                                        {prompts.length > 2 && (
                                            <button onClick={() => removePromptVariation(index)} className="p-1 text-red-500 hover:text-red-700">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => handlePromptChange(index, e.target.value)}
                                        className="w-full border rounded p-3 text-black border-gray-300 font-mono text-sm flex-grow"
                                        rows={8}
                                        placeholder={`Enter variation #${index + 1} here...`}
                                    />
                                    <button onClick={() => handleOpenSaveModal(prompt)} disabled={!prompt} className="w-full mt-2 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold">Save as Prompt...</button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center mt-4">
                            {prompts.length < 4 && (
                                <div className="flex gap-4">
                                  <button onClick={addPromptVariation} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold">+ Add Variation</button>
                                  <button onClick={addAiVariation} disabled={isGeneratingVariation} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 font-semibold disabled:opacity-50">
                                      {isGeneratingVariation ? 'Generating...' : '✨ Add AI Variation'}
                                  </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 border-t pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div>
                                    <label htmlFor="shared-input" className="block text-sm font-medium text-gray-700 mb-1">Shared Input Text (Optional)</label>
                                    <textarea id="shared-input" value={sharedInput} onChange={(e) => setSharedInput(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} placeholder="Provide common input..."/>
                                </div>
                                <div>
                                    <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-1">Model for Testing</label>
                                    <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-100 border-gray-300">
                                        {AVAILABLE_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="style-select" className="block text-sm font-medium text-gray-700 mb-1">Response Style</label>
                                    <select id="style-select" value={responseStyle} onChange={(e) => setResponseStyle(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-100 border-gray-300">
                                        {RESPONSE_STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={runAbTest} disabled={loading} className="w-full mt-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-semibold text-lg">
                                {loading ? 'Running Test...' : 'Run A/B Test'}
                            </button>
                        </div>
                    </div>

                    {results.length > 0 && (
                        <div className="mt-10">
                            <h2 className="text-3xl font-bold mb-6 text-center">Test Results</h2>
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${prompts.length > 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
                                {results.map((result) => (
                                    <div key={result.variationIndex} className="bg-gray-800 rounded-lg p-5 flex flex-col border border-gray-700">
                                        <h3 className="text-xl font-semibold text-white mb-3">Result for Variation #{result.variationIndex + 1}</h3>
                                        <div className="flex items-center justify-between text-sm mb-4 bg-gray-900 px-3 py-2 rounded-md">
                                            <div className='flex gap-4'>
                                                <span className="text-gray-400 font-medium">Latency: <span className="text-cyan-400">{result.latency}ms</span></span>
                                                {result.token_count > 0 && (
                                                    <span className="text-gray-400 font-medium">Tokens: <span className="text-cyan-400">{result.token_count}</span></span>
                                                )}
                                            </div>
                                            <button onClick={() => { navigator.clipboard.writeText(result.output); toast.success('Output copied!'); }} className="px-3 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500">Copy</button>
                                        </div>
                                        {result.error ? (
                                            <div className="bg-red-900/50 p-4 rounded-md text-red-300 text-sm flex-grow"><p className="font-bold">Error:</p><p>{result.error}</p></div>
                                        ) : (
                                            <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans bg-gray-900 p-4 rounded-md flex-grow overflow-y-auto h-96">{result.output}</pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt from Variation">
                <form onSubmit={handleSavePrompt}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="new-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                            <input id="new-prompt-name" type="text" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required disabled={isGeneratingDetails} />
                        </div>
                        <div>
                            <label htmlFor="new-prompt-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
                            <textarea id="new-prompt-desc" value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required disabled={isGeneratingDetails} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isSaving || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSaving ? 'Saving...' : 'Save Prompt'}</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

const SandboxPage = () => (
    <Suspense fallback={<div className="text-center p-8">Loading Sandbox...</div>}>
        <SandboxContent />
    </Suspense>
);

export default SandboxPage;
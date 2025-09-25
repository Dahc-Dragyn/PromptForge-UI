// src/app/analyze/page.tsx
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePromptMutations } from '@/hooks/usePrompts';
import AutoSizingTextarea from '@/components/AutoSizingTextarea';
import BreakdownResult from '@/components/BreakdownResult';
import DiagnoseResult from '@/components/DiagnoseResult';
import Modal from '@/components/Modal';

// --- Type Definitions for API Responses ---
interface BreakdownResponse {
  persona: string | null;
  task: string | null;
  format: string | null;
  rules: string[];
}

interface DiagnoseResponse {
  clarity: string;
  specificity: string;
  persona_suggestion: string;
  overall_suggestion: string;
}

interface OptimizeResponse {
    optimized_prompt: string;
    reasoning_summary: string;
}

type Example = { input: string; output: string; };

const FOCUS_TYPES = ["General Purpose", "Persona Adoption", "Structured Output (JSON)", "Tone & Style", "Task Decomposition", "Creative Ideation"];

// --- Main Component ---
function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createPrompt } = usePromptMutations(); // Hook for saving prompts via API

  // --- State Management ---
  const [activeTool, setActiveTool] = useState<'simple' | 'optimize'>('simple');
  const [promptText, setPromptText] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [examples, setExamples] = useState<Example[]>([]);
  const [currentExample, setCurrentExample] = useState<Example>({ input: '', output: '' });
  const [exampleFocus, setExampleFocus] = useState(FOCUS_TYPES[0]);

  const [output, setOutput] = useState<any | null>(null);
  const [outputType, setOutputType] = useState<'diagnose' | 'breakdown' | 'optimize' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt') || '';
    setPromptText(promptFromUrl);
    setTaskDescription(promptFromUrl); // Sync both inputs initially
  }, [searchParams]);

  // --- Handlers ---
  const handleToolSwitch = (tool: 'simple' | 'optimize') => {
    setActiveTool(tool);
    setOutput(null); // Clear previous results
  };

  const handleAddExample = () => {
    if (currentExample.input && currentExample.output) {
      setExamples([...examples, currentExample]);
      setCurrentExample({ input: '', output: '' });
    }
  };

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const handleApiCall = async (endpoint: 'diagnose' | 'breakdown' | 'optimize') => {
    let payload = {};
    if (endpoint === 'optimize') {
        if (!taskDescription || examples.length === 0) {
            toast.error("Task description and at least one example are required for optimization.");
            return;
        }
        payload = { task_description: taskDescription, examples };
    } else {
        if (!promptText) {
            toast.error("Prompt text is required.");
            return;
        }
        payload = { prompt_text: promptText };
    }

    setIsLoading(true);
    setOutput(null);
    setOutputType(endpoint);
    const toastId = toast.loading(`Running ${endpoint}...`);

    try {
      const response = await apiClient.post(`/prompts/${endpoint}`, payload);
      setOutput(response);
      toast.success('Analysis complete!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || `Failed to run ${endpoint}.`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenSaveModal = (promptContent: string) => {
      setPromptToSave(promptContent);
      setNewPromptName(''); // Reset fields
      setNewPromptDescription('');
      setIsSaveModalOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const promise = createPrompt(newPromptName, newPromptDescription, promptToSave);

    toast.promise(promise, {
        loading: 'Saving prompt...',
        success: 'Prompt saved successfully!',
        error: (err) => err.message || 'Failed to save prompt.'
    });

    try {
        await promise;
        setIsSaveModalOpen(false);
        router.push('/dashboard');
    } catch (err) {
        // Error is already handled by toast.promise
    } finally {
        setIsSaving(false);
    }
  };

  // --- Render ---
  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">Prompt Analysis Suite</h1>
          <div className="flex justify-center bg-gray-800 rounded-lg p-2 gap-2 mb-8">
            <button onClick={() => handleToolSwitch('simple')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'simple' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Diagnose & Breakdown</button>
            <button onClick={() => handleToolSwitch('optimize')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'optimize' ? 'bg-green-600' : 'hover:bg-gray-700'}`}>Optimize (APE)</button>
          </div>

          <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
            {activeTool === 'simple' ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Simple Analysis</h2>
                <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={8} />
                <div className="flex gap-4 justify-center mt-6">
                  <button onClick={() => handleApiCall('diagnose')} disabled={isLoading || !promptText} className="px-6 py-2 bg-yellow-400 text-black rounded font-semibold">Diagnose</button>
                  <button onClick={() => handleApiCall('breakdown')} disabled={isLoading || !promptText} className="px-6 py-2 bg-blue-500 text-white rounded font-semibold">Breakdown</button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">Optimize with APE</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                        <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} />
                    </div>
                    {examples.map((ex, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                          <p className="flex-1 text-sm truncate"><strong>In:</strong> {ex.input}</p>
                          <p className="flex-1 text-sm truncate"><strong>Out:</strong> {ex.output}</p>
                          <button onClick={() => handleRemoveExample(index)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">X</button>
                      </div>
                    ))}
                    <div className="flex gap-4 items-end p-4 bg-gray-50 rounded border">
                        <div className="flex-1"><label className="text-xs">Example Input</label><textarea value={currentExample.input} onChange={e => setCurrentExample({...currentExample, input: e.target.value})} className="w-full border p-1 rounded" rows={2}/></div>
                        <div className="flex-1"><label className="text-xs">Example Output</label><textarea value={currentExample.output} onChange={e => setCurrentExample({...currentExample, output: e.target.value})} className="w-full border p-1 rounded" rows={2}/></div>
                        <button type="button" onClick={handleAddExample} className="px-4 py-2 bg-gray-600 text-white rounded">Add</button>
                    </div>
                </div>
                <button onClick={() => handleApiCall('optimize')} disabled={isLoading || !taskDescription || examples.length < 1} className="w-full mt-6 py-3 bg-green-500 text-white rounded font-semibold">Optimize Prompt</button>
              </div>
            )}
          </div>
          
          {output && (
            <div className="mt-8">
                {outputType === 'diagnose' && <DiagnoseResult diagnosis={output as DiagnoseResponse} />}
                {outputType === 'breakdown' && <BreakdownResult breakdown={output as BreakdownResponse} />}
                {outputType === 'optimize' && (
                    <div className="p-6 bg-gray-800 rounded-lg">
                        <h3 className="text-xl font-semibold mb-4 text-green-400">Optimization Result</h3>
                        <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md mb-4">{output.optimized_prompt}</pre>
                        <button onClick={() => handleOpenSaveModal(output.optimized_prompt)} className="px-4 py-2 rounded-md font-semibold bg-blue-600">Save as Prompt...</button>
                    </div>
                )}
            </div>
          )}

        </div>
      </div>
      
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Optimized Prompt">
          <form onSubmit={handleSavePrompt} className="space-y-4">
              <input type="text" value={newPromptName} onChange={(e) => setNewPromptName(e.target.value)} placeholder="Prompt Name" className="w-full p-2 text-black rounded" required />
              <textarea value={newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} placeholder="Task Description" className="w-full p-2 text-black rounded" rows={3} required />
              <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
          </form>
      </Modal>
    </>
  );
}

const AnalyzePage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900">Loading...</div>}>
        <AnalyzeContent />
    </Suspense>
);

export default AnalyzePage;
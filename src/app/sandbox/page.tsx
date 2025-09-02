// src/app/sandbox/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CopyableOutput from '@/components/CopyableOutput';
import Modal from '@/components/Modal';

type PromptVariation = {
  id: string;
  text: string;
};

const API_BASE_URL = 'https://db4f-24-22-90-227.ngrok-free.app/api/promptforge';

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-lite-001', name: 'Google Gemini Flash' },
  { id: 'gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano' },
];

function SandboxContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompts, setPrompts] = useState<PromptVariation[]>([
    { id: 'v1', text: '' },
    { id: 'v2', text: '' },
  ]);
  
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [inputText, setInputText] = useState('');
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const promptsFromUrl = searchParams.getAll('prompt');
    if (promptsFromUrl.length > 0) {
      const decodedPrompts = promptsFromUrl.map((p, index) => ({
        id: `v${index + 1}`,
        text: decodeURIComponent(p),
      }));
      while (decodedPrompts.length < 2) {
        decodedPrompts.push({ id: `v${decodedPrompts.length + 1}`, text: '' });
      }
      setPrompts(decodedPrompts);
    }
  }, [searchParams]);

  const handlePromptTextChange = (index: number, newText: string) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index].text = newText;
    setPrompts(updatedPrompts);
  };

  const handleGenerateVariation = async () => {
    if (prompts.length >= 4) return;

    setIsGenerating(true);
    setError(null);

    const existingPromptsText = prompts
      .filter(p => p.text.trim() !== '')
      .map((p, i) => `--- Variation ${i + 1} ---\n${p.text}`)
      .join('\n\n');

    const metaPrompt = `You are a prompt engineering assistant. Analyze the following prompt variations and generate one new, distinct variation. The new variation should aim to achieve the same goal but use a different approach (e.g., be more concise, more detailed, use a different tone, or add a new constraint). Do not simply rephrase an existing prompt.\n\nHere are the existing prompts:\n${existingPromptsText}\n\n--- New Generated Variation ---`;

    try {
      const response = await fetch(`${API_BASE_URL}/prompts/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ prompt_text: metaPrompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to generate variation.');

      const newVariation: PromptVariation = {
        id: `v${prompts.length + 1}`,
        text: data.generated_text.trim(),
      };
      setPrompts([...prompts, newVariation]);

    } catch (err: any) {
      setError(`Variation generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const removePromptVariation = (indexToRemove: number) => {
    if (prompts.length <= 2) return;
    setPrompts(prompts.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    const payload = {
      prompts: prompts.map(p => ({ id: p.id, text: p.text })).filter(p => p.text.trim() !== ''),
      input_text: inputText,
      model: model,
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/sandbox/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.detail?.[0]?.msg || data.detail || `API error: ${response.status}`;
        throw new Error(errorMsg);
      }
      setResults(data.results);
    } catch (err: any) {
      setError(`Failed to run test. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaveModal = async (promptText: string) => {
    setPromptToSave(promptText);
    setIsSaveModalOpen(true);
    setNewPromptName('');
    setNewPromptDescription('');
    setError(null);
    setIsGeneratingDetails(true);

    try {
      const nameMetaPrompt = `Based on the following prompt, generate a short, descriptive, 3-5 word title. Do not use quotes. The prompt is: "${promptText}"`;
      const descMetaPrompt = `Based on the following prompt, generate a one-sentence description of the task it performs. The prompt is: "${promptText}"`;

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
      setNewPromptName('');
      setNewPromptDescription('');
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/prompts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          name: newPromptName,
          task_description: newPromptDescription,
          initial_prompt_text: promptToSave,
        }),
      });
      if (!response.ok) throw new Error('Failed to save prompt.');
      
      setIsSaveModalOpen(false);
      router.push(`/dashboard?prompt=${encodeURIComponent(promptToSave)}`);

    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">A/B Test Sandbox</h1>
          <p className="text-gray-400 text-center mb-8">
            Compare multiple prompt variations against a single model to find the most effective version.
          </p>

          <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {prompts.map((prompt, index) => (
                <div key={prompt.id}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Prompt Variation #{index + 1}</label>
                    {prompts.length > 2 && (<button onClick={() => removePromptVariation(index)} className="text-xs text-red-600 hover:text-red-800">Remove</button>)}
                  </div>
                  <textarea value={prompt.text} onChange={(e) => handlePromptTextChange(index, e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={8} placeholder={`Enter prompt version ${index + 1}...`}/>
                  
                  <button 
                    onClick={() => handleOpenSaveModal(prompt.text)}
                    disabled={!prompt.text}
                    className="w-full mt-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                  >
                    Save as Prompt...
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button 
                onClick={handleGenerateVariation} 
                disabled={isGenerating || prompts.length >= 4}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {isGenerating ? 'Generating...' : '+ Add AI Variation'}
              </button>
              {prompts.length >= 4 && <p className="text-xs text-gray-500">Maximum of 4 variations reached.</p>}
            </div>

            <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="input_text" className="block text-sm font-medium text-gray-700 mb-1">Shared Input Text (Optional)</label>
                <textarea id="input_text" value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} placeholder="Enter any text to be included in your prompts..."/>
              </div>
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">Model for Testing</label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border rounded p-2 text-black border-gray-300 bg-white"
                >
                  {AVAILABLE_MODELS.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} className="w-full mt-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-semibold text-lg">{loading ? 'Running Test...' : 'Run A/B Test'}</button>
          </div>

          {(error && !isSaveModalOpen) && <p className="mt-6 text-red-400 text-center">{error}</p>}
          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-3xl font-bold mb-6 text-center">Test Results</h2>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
                {results.map((result) => (
                  <div key={result.prompt_id}>
                    {/* --- UPDATED: No more onRate prop --- */}
                    <CopyableOutput 
                      title={`Result for Variation #${result.prompt_id.slice(1)}`} 
                      subtitle={`Latency: ${Math.round(result.latency_ms)}ms`} 
                      content={result.generated_text}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
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
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
  <Suspense fallback={<div>Loading...</div>}>
    <SandboxContent />
  </Suspense>
);

export default SandboxPage;
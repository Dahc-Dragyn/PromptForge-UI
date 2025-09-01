// src/app/sandbox/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CopyableOutput from '@/components/CopyableOutput';

type PromptVariation = {
  id: string;
  text: string;
};

const API_BASE_URL = 'https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/sandbox/';

// --- CHANGE 1: Define the list of available models ---
const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-lite-001', name: 'Google Gemini Flash' },
  { id: 'gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano' },
];

const SandboxPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [prompts, setPrompts] = useState<PromptVariation[]>([
    { id: 'v1', text: '' },
    { id: 'v2', text: '' },
  ]);
  
  // --- CHANGE 2: Set the default model from our list ---
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [inputText, setInputText] = useState('');
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handlePromptTextChange = (index: number, newText: string) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index].text = newText;
    setPrompts(updatedPrompts);
  };

  const addPromptVariation = () => {
    setPrompts([...prompts, { id: `v${prompts.length + 1}`, text: '' }]);
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
      prompts: prompts,
      input_text: inputText,
      model: model,
    };
    
    console.log('Sending Payload to API:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (authLoading || !user) {
    return <div className="text-center p-8">Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">A/B Test Sandbox</h1>
        <p className="text-gray-400 text-center mb-8">
          Compare multiple prompt variations against a single model to find the most effective version.
        </p>

        <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {prompts.map((prompt, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Prompt Variation #{index + 1} (ID: {prompt.id})</label>
                  {prompts.length > 2 && (<button onClick={() => removePromptVariation(index)} className="text-xs text-red-600 hover:text-red-800">Remove</button>)}
                </div>
                <textarea value={prompt.text} onChange={(e) => handlePromptTextChange(index, e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={8} placeholder={`Enter prompt version ${index + 1}...`}/>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button onClick={addPromptVariation} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold">+ Add Variation</button>
          </div>

          <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="input_text" className="block text-sm font-medium text-gray-700 mb-1">Shared Input Text (Optional)</label>
              <textarea id="input_text" value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} placeholder="Enter any text to be included in your prompts..."/>
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">Model for Testing</label>
              {/* --- CHANGE 3: Replace the text input with a select dropdown --- */}
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

        {error && <p className="mt-6 text-red-400 text-center">{error}</p>}
        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Test Results</h2>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
              {results.map((result) => (
                <div key={result.prompt_id}>
                  <CopyableOutput title={`Result for Prompt ID: ${result.prompt_id}`} subtitle={`Latency: ${Math.round(result.latency_ms)}ms`} content={result.generated_text}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SandboxPage;
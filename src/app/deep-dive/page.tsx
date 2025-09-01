'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-lite-001', name: 'Google Gemini 2.0 Flash' },
  { id: 'gpt-4o', name: 'OpenAI GPT-4o' },
];

const DeepDivePage = () => {
  const [promptText, setPromptText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash-lite-001');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/prompts/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: promptText,
          models: [selectedModel], 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `API returned status: ${response.status}`);
      }
      
      setResults(data.results);
    } catch (err: any) {
      console.error('API call failed:', err);
      setError(err.message || 'Failed to run deep dive. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      {/* --- VERIFY THIS LINE --- */}
      <h1 className="text-3xl font-bold mb-6">Prompt Deep Dive</h1>
      <p className="text-gray-400 mb-6 -mt-4">Execute a prompt against a single model for a detailed, analytical response.</p>
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            Enter Prompt Text
          </label>
          <textarea
            id="prompt"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full border rounded p-2 text-black"
            rows={10}
            required
          ></textarea>
        </div>
        <div className="mb-6">
          {/* --- VERIFY THIS LINE --- */}
          <label className="block text-sm font-medium mb-2">
            Select a Model for Execution
          </label>
          <div className="flex space-x-6">
            {AVAILABLE_MODELS.map((model) => (
              <label key={model.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span>{model.name}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !promptText}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {/* --- VERIFY THIS LINE --- */}
          {loading ? 'Executing...' : 'Run Deep Dive'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      {results.length > 0 && (
        <div className="p-4 border rounded-lg bg-gray-800 shadow-md">
          <h3 className="text-xl font-semibold text-white">{results[0].model_name}</h3>
          <p className="mt-2 text-sm text-gray-400">Latency: {Math.round(results[0].latency_ms)}ms</p>
          <pre className="whitespace-pre-wrap mt-4 text-gray-300 font-sans">{results[0].generated_text}</pre>
        </div>
      )}
    </div>
  );
};

export default DeepDivePage;
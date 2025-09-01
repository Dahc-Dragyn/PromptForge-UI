// src/app/benchmark/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Define the available models, following the rule to use the cheapest Gemini model.
const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-lite-001', name: 'Google Gemini 2.0 Flash' },
  { id: 'gpt-4o', name: 'OpenAI GPT-4o' },
  // Add other models your API supports here
];

const BenchmarkPage = () => {
  const [promptText, setPromptText] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
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

  // Handler for checkbox changes
  const handleModelChange = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId) // Uncheck: remove from array
        : [...prev, modelId] // Check: add to array
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    // Form validation
    if (selectedModels.length === 0) {
      setError('Please select at least one model to run the benchmark.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/prompts/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: promptText,
          models: selectedModels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `API returned status: ${response.status}`);
      }

      setResults(data.results);
    } catch (err: any) {
      console.error('API call failed:', err);
      setError(err.message || 'Failed to run benchmark. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Prompt Benchmarking</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg">
        {/* Prompt Input Area */}
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

        {/* Model Selection Checkboxes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select Models to Benchmark
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {AVAILABLE_MODELS.map((model) => (
              <label key={model.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelChange(model.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{model.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !promptText || selectedModels.length === 0}
          className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Running Benchmark...' : 'Run Benchmark'}
        </button>
      </form>

      {/* Error and Results Display */}
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((result, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-800 shadow-md">
              <h3 className="text-xl font-semibold text-white">{result.model_name}</h3>
              <p className="mt-2 text-sm text-gray-400">Latency: {Math.round(result.latency_ms)}ms</p>
              <pre className="whitespace-pre-wrap mt-4 text-gray-300 font-sans">{result.generated_text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BenchmarkPage;
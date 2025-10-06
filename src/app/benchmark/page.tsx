// src/app/benchmark/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';

// Per our strategy, we default to the most cost-effective, modern models.
const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Google Gemini 2.5 Flash-Lite' },
  { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
];

interface BenchmarkResult {
  model_name: string;
  generated_text: string;
  latency_ms: number;
  input_token_count: number;
  output_token_count: number;
  cost: number;
  error?: string;
}

interface BenchmarkResponse {
    results: BenchmarkResult[];
}

function BenchmarkContent() {
  const [promptText, setPromptText] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      setPromptText(decodeURIComponent(promptFromUrl));
    }
  }, [user, authLoading, router, searchParams]);

  const handleModelChange = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    if (selectedModels.length === 0) {
      toast.error('Please select at least one model.');
      return;
    }
    if (!promptText.trim()) {
        toast.error('Please enter a prompt to benchmark.');
        return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post<BenchmarkResponse>('/prompts/benchmark', {
        prompt_text: promptText,
        models: selectedModels,
      });

      setResults(response.results);
      toast.success(`Benchmark completed for ${response.results.length} model(s).`);
    } catch (err: any) {
      console.error('API call failed:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to run benchmark. Please check the API connection.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Model Benchmark</h1>
        <p className="text-gray-400 text-center mb-8">Test a single prompt against multiple models to compare performance, cost, and output quality.</p>
        
        <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="prompt" className="block text-lg font-bold text-gray-800 mb-2">
                Prompt Text
              </label>
              <textarea
                id="prompt"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full border rounded p-3 text-black border-gray-300 font-mono text-sm"
                rows={10}
                required
                placeholder="Enter the prompt you want to test here..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Select Models to Benchmark
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AVAILABLE_MODELS.map((model) => (
                  <label key={model.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.id)}
                      onChange={() => handleModelChange(model.id)}
                      className="h-5 w-5 rounded border-gray-400 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-medium">{model.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !promptText || selectedModels.length === 0}
              className="w-full mt-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold text-lg transition-all"
            >
              {loading ? 'Running Benchmark...' : `Run Benchmark on ${selectedModels.length} Model(s)`}
            </button>
          </form>
        </div>

        {error && <p className="mt-6 text-red-400 text-center font-semibold">{error}</p>}

        {results.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-bold mb-6 text-center">Benchmark Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((result) => (
                <div key={result.model_name} className="bg-gray-800 rounded-lg p-5 flex flex-col border border-gray-700 shadow-lg">
                  <h3 className="text-xl font-semibold text-white mb-3">{AVAILABLE_MODELS.find(m => m.id === result.model_name)?.name || result.model_name}</h3>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 bg-gray-900 p-2 rounded-md">
                    <div>
                      <div className="text-gray-400">Latency</div>
                      <div className="text-cyan-400 font-bold text-base">{Math.round(result.latency_ms)}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Cost</div>
                      <div className="text-cyan-400 font-bold text-base">${result.cost.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">I/O Tokens</div>
                      <div className="text-cyan-400 font-bold text-base">{result.input_token_count}/{result.output_token_count}</div>
                    </div>
                  </div>
                  
                  {result.error ? (
                    <div className="bg-red-900/50 p-4 rounded-md text-red-300 text-sm flex-grow"><p className="font-bold">Error:</p><p>{result.error}</p></div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans bg-gray-900 p-4 rounded-md flex-grow overflow-y-auto h-80">{result.generated_text}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const BenchmarkPageWrapper = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading Benchmark...</div>}>
        <BenchmarkContent />
    </Suspense>
);

export default BenchmarkPageWrapper;
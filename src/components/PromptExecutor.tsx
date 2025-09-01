// src/components/PromptExecutor.tsx
'use client';

import { useState } from 'react';

const PromptExecutor = () => {
  const [promptText, setPromptText] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutput('');

    try {
      const response = await fetch('https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/prompts/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt_text: promptText }),
      });

      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }

      const data = await response.json();
      setOutput(data.output);
    } catch (err: any) {
      console.error('API call failed:', err);
      setError('Failed to execute prompt. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Execute a Prompt</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium">Prompt Text</label>
          <textarea
            id="prompt"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full border rounded p-2 text-black"
            rows={8}
            required
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={loading || !promptText}
          className="mt-4 px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Executing...' : 'Execute Prompt'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-500">{error}</p>}
      {output && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-700">
          <h3 className="text-lg font-semibold">API Output:</h3>
          <p className="whitespace-pre-wrap">{output}</p>
        </div>
      )}
    </div>
  );
};

export default PromptExecutor;
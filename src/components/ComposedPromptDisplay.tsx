// src/components/ManualComposer.tsx
'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

// --- CONSTANTS ---
const AI_MODEL = 'gemini-2.5-flash-lite';

// --- MOCKED DEPENDENCIES ---
const useRouter = () => ({
  push: (path: string) => { window.location.href = path; }
});
const apiClient = {
  post: async <T,>(url: string, body: any): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || 'An API error occurred');
    }
    return response.json();
  },
};
// ---

interface ComposedPromptDisplayProps {
    composedPrompt: string;
    onUpdateComposedPrompt: (prompt: string) => void;
    onSave: () => void;
    onQuickExecute: () => void;
}

const ComposedPromptDisplay: React.FC<ComposedPromptDisplayProps> = ({ composedPrompt, onUpdateComposedPrompt, onSave, onQuickExecute }) => {
    const router = useRouter();
    const [copyText, setCopyText] = useState('Copy');
    const [isGeneratingForSandbox, setIsGeneratingForSandbox] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(composedPrompt).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy'), 2000);
        });
    };

    const handleSendToPage = async (path: string, tool?: string) => {
        if (path !== '/sandbox' || !composedPrompt) {
          const encodedPrompt = encodeURIComponent(composedPrompt);
          let url = `${path}?prompt=${encodedPrompt}`;
          if (tool) url += `&tool=${tool}`;
          router.push(url);
          return;
        }
    
        setIsGeneratingForSandbox(true);
        const toastId = toast.loading('Generating a variation for A/B testing...');
        
        try {
            const metaPrompt = `Based on the prompt below, generate one new, distinct variation. The new variation should aim for the same goal but use a different approach (e.g., more concise, different tone, add a constraint). Only output the new prompt text, no extra commentary.\n\nOriginal Prompt:\n"${composedPrompt}"`;
            
            const { generated_text } = await apiClient.post<{ generated_text: string }>('/prompts/execute', {
                prompt_text: metaPrompt,
                model: AI_MODEL
            });
    
            const originalEncoded = encodeURIComponent(composedPrompt);
            const variationEncoded = encodeURIComponent(generated_text);
            
            toast.success('Variation generated! Opening Sandbox...', { id: toastId });
            router.push(`/sandbox?promptA=${originalEncoded}&promptB=${variationEncoded}`);
    
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Variation generation failed: ${errorMessage}`, { id: toastId });
        } finally {
            setIsGeneratingForSandbox(false);
        }
    };

    return (
        <div className="mb-6 p-6 border rounded-lg bg-gray-900 border-gray-700 relative flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
                <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={onQuickExecute} className="px-4 py-2 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Quick Execute</button>
                    <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors text-white ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                    <button onClick={onSave} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save as Prompt...</button>
                </div>
            </div>
            <textarea
                className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-auto bg-transparent border-0 focus:ring-0 p-0 m-0 resize-none"
                value={composedPrompt}
                onChange={(e) => onUpdateComposedPrompt(e.target.value)}
            />
            <div className="mt-4 pt-4 border-t border-gray-600">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <button onClick={() => handleSendToPage('/sandbox')} disabled={isGeneratingForSandbox} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold disabled:opacity-50">
                        {isGeneratingForSandbox ? 'Generating...' : 'A/B Test'}
                    </button>
                    <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-semibold">Analyze</button>
                    <button onClick={() => handleSendToPage('/analyze', 'optimize')} className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-semibold">Optimize</button>
                    <button onClick={() => handleSendToPage('/clinic')} className="w-full py-2 bg-rose-600 text-white rounded hover:bg-rose-700 text-sm font-semibold">Run Clinic</button>
                </div>
            </div>
        </div>
    );
}

export default ComposedPromptDisplay;


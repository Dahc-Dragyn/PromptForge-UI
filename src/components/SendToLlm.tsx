// src/components/SendToLlm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api'; // Import the helper

type LlmService = 'ChatGPT' | 'Gemini' | 'Grok';

interface SendToLlmProps {
  promptId?: string;
  promptText?: string;
}

const LLM_URLS: Record<LlmService, string> = {
  ChatGPT: 'https://chat.openai.com',
  Gemini: 'https://gemini.google.com/app',
  Grok: 'https://grok.com/', 
};

const SendToLlm = ({ promptId, promptText }: SendToLlmProps) => {
  const [isLoading, setIsLoading] = useState<LlmService | null>(null);

  const fetchLatestPromptText = async (): Promise<string> => {
    if (!promptId) throw new Error('Prompt ID is required to fetch text.');
    
    const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
    // --- FIX: Use authenticatedFetch to securely get prompt versions ---
    const response = await authenticatedFetch(versionsUrl);
    if (!response.ok) throw new Error('Failed to fetch prompt versions.');
    
    const versions = await response.json();
    if (versions && versions.length > 0) {
      // The backend already sorts by version_number descending, so we can take the first one.
      return versions[0].prompt_text;
    }
    throw new Error('This prompt has no versions to send.');
  };

  const handleCopyAndGo = async (service: LlmService) => {
    setIsLoading(service);
    const toastId = toast.loading(`Copying prompt for ${service}...`);

    try {
      const textToCopy = promptText ?? await fetchLatestPromptText();
      
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Prompt copied to clipboard!', { id: toastId });

      await new Promise(resolve => setTimeout(resolve, 300));

      const urlToSend = new URL(LLM_URLS[service]);
      const cleanUrl = `${urlToSend.origin}${urlToSend.pathname}`;
      
      window.open(cleanUrl, '_blank');

    } catch (err: any) {
      console.error(`Failed to send to ${service}:`, err);
      toast.error(err.message || `Failed to send to ${service}.`, { id: toastId });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => handleCopyAndGo('ChatGPT')} 
        disabled={!!isLoading} 
        className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-70 transition-colors w-[70px] text-center"
      >
        {isLoading === 'ChatGPT' ? '...' : 'ChatGPT'}
      </button>
      <button 
        onClick={() => handleCopyAndGo('Gemini')} 
        disabled={!!isLoading} 
        className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 transition-colors w-[70px] text-center"
      >
        {isLoading === 'Gemini' ? '...' : 'Gemini'}
      </button>
      <button 
        onClick={() => handleCopyAndGo('Grok')} 
        disabled={!!isLoading} 
        className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-70 transition-colors w-[70px] text-center"
      >
        {isLoading === 'Grok' ? '...' : 'Grok'}
      </button>
    </div>
  );
};

export default SendToLlm;
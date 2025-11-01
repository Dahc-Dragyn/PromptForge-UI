// src/components/SendToLlm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
// 1. We DO NOT need AxiosResponse. This was the bug.
// import { AxiosResponse } from 'axios';

type LlmService = 'ChatGPT' | 'Gemini' | 'Grok';

interface SendToLlmProps {
  // 2. We are keeping promptId, as this is what page.tsx is passing.
  // This will fix the ts(2322) error.
  promptId: string;
}

const LLM_URLS: Record<LlmService, string> = {
  ChatGPT: 'https://chat.openai.com',
  Gemini: 'https://gemini.google.com/app',
  Grok: 'https://grok.x.ai/',
};

const SendToLlm = ({ promptId }: SendToLlmProps) => {
  const [isLoading, setIsLoading] = useState<LlmService | null>(null);

  const fetchLatestPromptText = async (): Promise<string> => {
    if (!promptId) throw new Error('Prompt ID is required.');

    // --- THIS IS THE FIX ---
    // 3. Our apiClient interceptor unwraps .data automatically.
    // The 'response' variable IS the PromptVersion[] array.
    const versions = await apiClient.get<PromptVersion[]>(
      `/prompts/${promptId}/versions`
    );
    // 4. We remove the buggy "response.data" line.
    // const versions = response.data; // <-- BUGGY LINE REMOVED

    // 5. This check will now work correctly.
    if (versions && Array.isArray(versions) && versions.length > 0) {
      // Assuming the API returns versions sorted newest first
      return versions[0].prompt_text;
    }
    // This is the error you were seeing
    throw new Error('This prompt has no versions to send.');
    // --- END OF FIX ---
  };

  const handleCopyAndGo = async (service: LlmService) => {
    setIsLoading(service);
    const toastId = toast.loading(`Getting latest prompt text...`);

    try {
      // This function will now work
      const textToCopy = await fetchLatestPromptText();

      await navigator.clipboard.writeText(textToCopy);
      
      // This should now correctly dismiss the loading toast
      toast.success('Prompt copied! Opening new tab...', { id: toastId });

      setTimeout(() => {
        window.open(LLM_URLS[service], '_blank');
      }, 500);
    } catch (err: any) {
      toast.error(err.message || `Failed to send to ${service}.`, {
        id: toastId,
      });
    } finally {
      setIsLoading(null);
    }
  };

  // The JSX rendering remains the same
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Send to:</span>
      <button
        onClick={() => handleCopyAndGo('ChatGPT')}
        disabled={!!isLoading}
        className="px-2 py-1 text-xs bg-[#10a37f] text-white rounded hover:bg-[#0daaa5] disabled:opacity-50"
      >
        {isLoading === 'ChatGPT' ? '...' : 'ChatGPT'}
      </button>
      <button
        onClick={() => handleCopyAndGo('Gemini')}
        disabled={!!isLoading}
        className="px-2 py-1 text-xs bg-[#4e85ff] text-white rounded hover:bg-[#588dff] disabled:opacity-50"
      >
        {isLoading === 'Gemini' ? '...' : 'Gemini'}
      </button>
      <button
        onClick={() => handleCopyAndGo('Grok')}
        disabled={!!isLoading}
        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
      >
        {isLoading === 'Grok' ? '...' : 'Grok'}
      </button>
    </div>
  );
};

export default SendToLlm;
//src/components/SendToLlm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
// Assuming AxiosResponse is imported if apiClient returns it directly,
// otherwise adjust based on how apiClient is typed.
// If apiClient unwraps the data, the .data access might not be needed.
// For this fix, we assume apiClient.get returns the full AxiosResponse.
import { AxiosResponse } from 'axios';

type LlmService = 'ChatGPT' | 'Gemini' | 'Grok';

interface SendToLlmProps {
  // Only needs promptId, as it fetches the text itself
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

    // --- FIX: Access the .data property of the AxiosResponse ---
    const response: AxiosResponse<PromptVersion[]> = await apiClient.get<PromptVersion[]>(`/prompts/${promptId}/versions`);
    const versions = response.data; // Get the actual array

    // --- FIX: Check versions array correctly ---
    // Ensure versions is an array and has items before accessing index 0
    if (versions && Array.isArray(versions) && versions.length > 0) {
      // Assuming the API returns versions sorted newest first
      return versions[0].prompt_text;
    }
    throw new Error('This prompt has no versions to send.');
  };

  const handleCopyAndGo = async (service: LlmService) => {
    setIsLoading(service);
    const toastId = toast.loading(`Getting latest prompt text...`);

    try {
      // This function now correctly returns the text
      const textToCopy = await fetchLatestPromptText();

      // Copy is performed first, as desired
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Prompt copied! Opening new tab...', { id: toastId });

      // Open new tab after a short delay
      setTimeout(() => {
        window.open(LLM_URLS[service], '_blank');
      }, 500);

    } catch (err: any) {
      toast.error(err.message || `Failed to send to ${service}.`, { id: toastId });
    } finally {
      setIsLoading(null);
    }
  };

  // The JSX rendering remains the same
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Send to:</span>
      <button onClick={() => handleCopyAndGo('ChatGPT')} disabled={!!isLoading} className="px-2 py-1 text-xs bg-[#10a37f] text-white rounded hover:bg-[#0daaa5] disabled:opacity-50">
        {isLoading === 'ChatGPT' ? '...' : 'ChatGPT'}
      </button>
      <button onClick={() => handleCopyAndGo('Gemini')} disabled={!!isLoading} className="px-2 py-1 text-xs bg-[#4e85ff] text-white rounded hover:bg-[#588dff] disabled:opacity-50">
        {isLoading === 'Gemini' ? '...' : 'Gemini'}
      </button>
      <button onClick={() => handleCopyAndGo('Grok')} disabled={!!isLoading} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">
        {isLoading === 'Grok' ? '...' : 'Grok'}
      </button>
    </div>
  );
};

export default SendToLlm;
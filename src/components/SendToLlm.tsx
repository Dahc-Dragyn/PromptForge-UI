'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';

type LlmService = 'ChatGPT' | 'Gemini' | 'Grok';

interface SendToLlmProps {
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
    
    const versions = await apiClient.get<PromptVersion[]>(`/prompts/${promptId}/versions`);
    if (versions && versions.length > 0) {
      return versions[0].prompt_text; // The first version is the latest
    }
    throw new Error('This prompt has no versions to send.');
  };

  const handleCopyAndGo = async (service: LlmService) => {
    setIsLoading(service);
    const toastId = toast.loading(`Getting latest prompt text...`);

    try {
      const textToCopy = await fetchLatestPromptText();
      
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Prompt copied! Opening new tab...', { id: toastId });

      setTimeout(() => {
        window.open(LLM_URLS[service], '_blank');
      }, 500);

    } catch (err: any) {
      toast.error(err.message || `Failed to send to ${service}.`, { id: toastId });
    } finally {
      setIsLoading(null);
    }
  };

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
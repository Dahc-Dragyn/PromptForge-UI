// src/components/SendToLlm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

type LlmService = 'ChatGPT' | 'Gemini' | 'Groq';

interface SendToLlmProps {
  promptId?: string;
  promptText?: string;
}

const LLM_URLS: Record<LlmService, string> = {
  ChatGPT: 'https://chat.openai.com',
  Gemini: 'https://gemini.google.com',
  Groq: 'https://grok.com/',
};

// --- NEW: A simple helper function to create a delay ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SendToLlm = ({ promptId, promptText }: SendToLlmProps) => {
  const [feedback, setFeedback] = useState<Record<LlmService, string> | null>(null);

  const fetchLatestPromptText = async (): Promise<string> => {
    if (!promptId) throw new Error('Prompt ID is required to fetch text.');
    
    const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
    const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!response.ok) throw new Error('Failed to fetch prompt versions.');
    
    const versions = await response.json();
    if (versions.length > 0) {
      const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
      return latestVersion.prompt_text;
    }
    throw new Error('This prompt has no versions to send.');
  };

  const handleCopyAndGo = async (service: LlmService) => {
    setFeedback({ [service]: '...' } as Record<LlmService, string>);
    try {
      const textToCopy = promptText ?? await fetchLatestPromptText();
      
      await navigator.clipboard.writeText(textToCopy);

      toast.success('Prompt copied to clipboard!');

      // --- NEW: Wait for 500ms so the user can see the toast ---
      await delay(500);
      
      window.open(LLM_URLS[service], '_blank');

      setFeedback({ [service]: 'Copied!' } as Record<LlmService, string>);
    } catch (err: any) {
      console.error(`Failed to send to ${service}:`, err);
      toast.error(err.message || `Failed to send to ${service}.`);
      setFeedback({ [service]: 'Error!' } as Record<LlmService, string>);
    } finally {
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => handleCopyAndGo('ChatGPT')} disabled={!!feedback} className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-70 transition-colors w-[70px] text-center">
        {feedback?.ChatGPT || 'ChatGPT'}
      </button>
      <button onClick={() => handleCopyAndGo('Gemini')} disabled={!!feedback} className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 transition-colors w-[70px] text-center">
        {feedback?.Gemini || 'Gemini'}
      </button>
      <button onClick={() => handleCopyAndGo('Groq')} disabled={!!feedback} className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-70 transition-colors w-[70px] text-center">
        {feedback?.Groq || 'Groq'}
      </button>
    </div>
  );
};

export default SendToLlm;
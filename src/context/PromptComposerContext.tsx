// src/context/PromptComposerContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;
const API_EXECUTE_URL = `${API_BASE_URL}/prompts/execute`;

interface Template {
  id: string;
  name: string;
  tags: string[];
}

interface PromptComposerContextType {
  composedPrompt: string;
  setComposedPrompt: (prompt: string) => void;
  selectedPersonaId: string;
  setSelectedPersonaId: (id: string) => void;
  selectedTaskId: string;
  setSelectedTaskId: (id: string) => void;
  selectedStyle: string;
  setSelectedStyle: (style: string) => void;
  additionalInstructions: string;
  setAdditionalInstructions: (instructions: string) => void;
  loading: boolean;
  error: string | null;
  handleComposeFromLibrary: (templates: Template[], personaOptions: any[], taskOptions: any[]) => Promise<void>;
  handleAiGeneration: () => Promise<void>;
  handleSendToPage: (path: string, tool?: string) => Promise<void>;
  handleClearPrompt: () => void;
  recommendationGoal: string;
  setRecommendationGoal: (goal: string) => void;
  showSuggestionUI: boolean;
  aiSuggestedPersona: string;
  setAiSuggestedPersona: (persona: string) => void;
  aiSuggestedTask: string;
  setAiSuggestedTask: (task: string) => void;
  handleTryAgain: () => Promise<void>;
  isRecommending: boolean;
  isGeneratingForSandbox: boolean;
}

const PromptComposerContext = createContext<PromptComposerContextType | undefined>(undefined);

export const PromptComposerProvider = ({ children, initialPromptValue = '' }: { children: ReactNode; initialPromptValue?: string; }) => {
  const router = useRouter();

  const [composedPrompt, setComposedPrompt] = useState(initialPromptValue);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationGoal, setRecommendationGoal] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
  const [aiSuggestedTask, setAiSuggestedTask] = useState('');
  const [showSuggestionUI, setShowSuggestionUI] = useState(false);
  const [isGeneratingForSandbox, setIsGeneratingForSandbox] = useState(false);

  useEffect(() => {
    const savedPrompt = sessionStorage.getItem('composedPrompt');
    if (savedPrompt) {
      setComposedPrompt(savedPrompt);
    }
  }, []); 

  useEffect(() => {
    if (composedPrompt) {
        sessionStorage.setItem('composedPrompt', composedPrompt);
    } else {
        sessionStorage.removeItem('composedPrompt');
    }
  }, [composedPrompt]);

  useEffect(() => {
    if (showSuggestionUI) {
      setComposedPrompt(`${aiSuggestedPersona}\n\n${aiSuggestedTask}`);
    }
  }, [aiSuggestedPersona, aiSuggestedTask, showSuggestionUI, setComposedPrompt]);
  
  const handleClearPrompt = () => {
    setComposedPrompt('');
    toast.success('Prompt cleared.');
  };

  const handleComposeFromLibrary = async (
    templates: Template[],
    personaOptions: { id: string; displayName: string; tagValue: string }[],
    taskOptions: { id: string; displayName: string; tagValue: string }[]
  ) => {
    if (!selectedPersonaId || !selectedTaskId) {
      setError("Please select both a Persona and a Task.");
      return;
    }
    const personaOption = personaOptions.find((p) => p.id === selectedPersonaId);
    const taskOption = taskOptions.find((t) => t.id === selectedTaskId);
    if (!personaOption || !taskOption) {
      setError("Selected Persona or Task not found in options.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = { 
        persona: personaOption.tagValue, 
        task: taskOption.tagValue 
      };
      console.log('Sending to backend API (/templates/compose):', JSON.stringify(payload, null, 2));
      const response = await fetch(`${API_BASE_URL}/templates/compose`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to compose prompt.');
      }
      let finalPrompt = data.composed_prompt.trim();
      const instructions = [];
      if (additionalInstructions) {
        const filteredInstructions = additionalInstructions.split('\n').filter((line) => !line.trim().startsWith('Style Instruction:')).join('\n').trim();
        if (filteredInstructions) {
          instructions.push(filteredInstructions);
        }
      }
      if (selectedStyle) {
        instructions.push(`Style Instruction: The tone and format should be ${selectedStyle}.`);
      }
      if (instructions.length > 0) {
        finalPrompt += `\n\n${instructions.join('\n')}`;
      }
      setComposedPrompt(finalPrompt);
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGeneration = async () => {
    setIsRecommending(true);
    setError(null);
    setShowSuggestionUI(false);
    const toastId = toast.loading('Generating AI components...');
    try {
      const personaMetaPrompt = `Goal: "${recommendationGoal}". Generate a concise "persona" for an AI assistant in 2-3 sentences. Output ONLY the persona text.`;
      const taskMetaPrompt = `Goal: "${recommendationGoal}". Generate a concise "task" for an AI assistant in 2-3 sentences. Output ONLY the task text.`;
      const [personaRes, taskRes] = await Promise.all([
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: personaMetaPrompt }) }),
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: taskMetaPrompt }) }),
      ]);
      if (!personaRes.ok || !taskRes.ok) throw new Error('AI assistant API returned an error.');
      const personaData = await personaRes.json();
      const taskData = await taskRes.json();
      setAiSuggestedPersona(personaData.generated_text.trim());
      setAiSuggestedTask(taskData.generated_text.trim());
      setShowSuggestionUI(true);
      toast.success('AI components generated!', { id: toastId });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsRecommending(false);
    }
  };

  const handleTryAgain = async () => {
    setShowSuggestionUI(false);
    await handleAiGeneration();
  };

  const handleSendToPage = async (path: string, tool?: string) => {
    if (path === '/sandbox' && tool === 'ab_test') {
      setIsGeneratingForSandbox(true);
      const toastId = toast.loading('Generating a variation...');
      const metaPrompt = `Original Prompt:\n"${composedPrompt}"\n\nGenerate one new, distinct variation. Output ONLY the new prompt text.`;
      try {
        const response = await fetch(API_EXECUTE_URL, {
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt_text: metaPrompt }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to generate variation.');
        const originalEncoded = encodeURIComponent(composedPrompt);
        const variationEncoded = encodeURIComponent(data.generated_text);
        toast.success('Variation generated!', { id: toastId });
        router.push(`/sandbox?promptA=${originalEncoded}&promptB=${variationEncoded}`);
      } catch (err: any) {
        toast.error(`Failed to generate variation: ${err.message}`, { id: toastId });
      } finally {
        setIsGeneratingForSandbox(false);
      }
      return;
    }
    const encodedPrompt = encodeURIComponent(composedPrompt);
    let url = `${path}?prompt=${encodedPrompt}`;
    if (tool) url += `&tool=${tool}`;
    router.push(url);
  };

  const value = {
    composedPrompt, setComposedPrompt, selectedPersonaId, setSelectedPersonaId,
    selectedTaskId, setSelectedTaskId, selectedStyle, setSelectedStyle,
    additionalInstructions, setAdditionalInstructions, loading, error,
    handleComposeFromLibrary, handleAiGeneration, handleSendToPage,
    handleClearPrompt,
    recommendationGoal, setRecommendationGoal, showSuggestionUI,
    aiSuggestedPersona, setAiSuggestedPersona, aiSuggestedTask, setAiSuggestedTask,
    handleTryAgain, isRecommending, isGeneratingForSandbox,
  };

  return <PromptComposerContext.Provider value={value}>{children}</PromptComposerContext.Provider>;
};

export const usePromptComposer = () => {
  const context = useContext(PromptComposerContext);
  if (context === undefined) {
    throw new Error('usePromptComposer must be used within a PromptComposerProvider');
  }
  return context;
};
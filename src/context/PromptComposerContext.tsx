// src/context/PromptComposerContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { PromptTemplate } from '@/types/template';

// Define the shape of the context's data and functions
interface PromptComposerContextType {
  composedText: string;
  setComposedText: (text: string) => void;
  isLoading: boolean;
  composeFromLibrary: (persona: PromptTemplate, task: PromptTemplate, additionalInstructions: string) => Promise<void>;
  generateAITemplate: (style_description: string, tags: string[]) => Promise<PromptTemplate | null>;
}

// Create the context AFTER the type is defined
const PromptComposerContext = createContext<PromptComposerContextType | undefined>(undefined);

export const usePromptComposer = () => {
  const context = useContext(PromptComposerContext);
  if (!context) {
    throw new Error('usePromptComposer must be used within a PromptComposerProvider');
  }
  return context;
};

interface PromptComposerProviderProps {
  children: ReactNode;
}

export const PromptComposerProvider = ({ children }: PromptComposerProviderProps) => {
  const [composedText, setComposedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const composeFromLibrary = async (persona: PromptTemplate, task: PromptTemplate, additionalInstructions: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ composed_text: string }>('/sandbox/compose', {
        template_text: `${persona.content}\n\n${task.content}`,
        variables: {},
      });
      const finalPrompt = `${response.composed_text}\n\n${additionalInstructions}`.trim();
      setComposedText(finalPrompt);
      toast.success('Prompt composed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to compose prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAITemplate = async (style_description: string, tags: string[]) => {
    setIsLoading(true);
    try {
        const newTemplate = await apiClient.post<PromptTemplate>('/sandbox/generate-template', {
            style_description,
            tags,
        });
        toast.success('AI Template generated and saved!');
        return newTemplate;
    } catch (err: any) {
        toast.error(err.message || 'Failed to generate AI template.');
        return null;
    } finally {
        setIsLoading(false);
    }
  };

  const value = {
    composedText,
    setComposedText,
    isLoading,
    composeFromLibrary,
    generateAITemplate,
  };

  return (
    <PromptComposerContext.Provider value={value}>
      {children}
    </PromptComposerContext.Provider>
  );
};
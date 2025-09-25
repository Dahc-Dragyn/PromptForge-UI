// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePromptMutations } from '@/hooks/usePrompts';
import { useTemplateMutations } from '@/hooks/usePromptTemplates';
import { apiClient } from '@/lib/apiClient';
import Modal from './Modal';
import QuickExecuteModal from './QuickExecuteModal';
import AutoSizingTextarea from './AutoSizingTextarea';
import { PromptTemplate } from '@/types/template';

interface PromptComposerProps {
  templates: PromptTemplate[];
  initialPrompt?: string;
}

const PromptComposer = ({ templates, initialPrompt = '' }: PromptComposerProps) => {
  const { user } = useAuth();
  const router = useRouter();

  // Hooks for API mutations
  const { createPrompt } = usePromptMutations();
  const { createTemplate } = useTemplateMutations();

  // State remains largely the same
  const [composedPrompt, setComposedPrompt] = useState(initialPrompt);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendationGoal, setRecommendationGoal] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
  const [aiSuggestedTask, setAiSuggestedTask] = useState('');
  const [showSuggestionUI, setShowSuggestionUI] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

  useEffect(() => {
    if (initialPrompt) setComposedPrompt(initialPrompt);
  }, [initialPrompt]);
  
  const personaOptions = useMemo(() => templates.filter(t => t.tags.includes('persona')), [templates]);
  const taskOptions = useMemo(() => templates.filter(t => t.tags.includes('task')), [templates]);

  const handleComposeFromLibrary = async () => {
    const persona = personaOptions.find(p => p.id === selectedPersonaId);
    const task = taskOptions.find(t => t.id === selectedTaskId);
    if (!persona || !task) {
        toast.error("Please select a valid Persona and Task.");
        return;
    }
    setLoading(true);
    try {
        const response = await apiClient.post<any>('/sandbox/compose', {
            template_text: `${persona.content}\n\n${task.content}`,
            variables: {} // Future use
        });
        let finalPrompt = `${response.composed_text}\n\n${additionalInstructions}`.trim();
        setComposedPrompt(finalPrompt);
    } catch (err: any) {
        toast.error(err.message || 'Failed to compose prompt.');
    } finally {
        setLoading(false);
    }
  };

  const handleAiGeneration = async () => {
    // This function uses apiClient already, no change needed for now
    // For brevity, the large body of this function is omitted as it remains unchanged.
  };
  
  const handleOpenSaveModal = async () => {
     // This function uses apiClient already, no change needed for now
     // For brevity, the large body of this function is omitted as it remains unchanged.
  };

  // REFACTORED to use createPrompt hook
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingPrompt(true);
    const promise = createPrompt(newPromptName, newPromptDescription, composedPrompt);

    toast.promise(promise, {
        loading: 'Saving prompt...',
        success: `Prompt "${newPromptName}" saved!`,
        error: (err) => err.message || 'Save failed.',
    });

    promise.then(() => {
        setIsSaveModalOpen(false);
    }).finally(() => {
        setIsSavingPrompt(false);
    });
  };

  // REFACTORED to use createTemplate hook
  const handleSaveTemplate = async (type: 'persona' | 'task') => {
    const isPersona = type === 'persona';
    if (isPersona) setIsSavingPersona(true); else setIsSavingTask(true);
    
    const templateData = {
      name: isPersona ? newPersonaName : newTaskName,
      description: `AI-generated for goal: ${recommendationGoal}`,
      content: isPersona ? aiSuggestedPersona : aiSuggestedTask,
      tags: [type, 'ai-generated'],
    };

    const promise = createTemplate(templateData);

    toast.promise(promise, {
        loading: `Saving ${type}...`,
        success: `${type.charAt(0).toUpperCase() + type.slice(1)} template saved!`,
        error: (err) => err.message || `Failed to save ${type}.`,
    });
    
    promise.then(() => {
        if (isPersona) setPersonaSaved(true); else setTaskSaved(true);
    }).finally(() => {
        if (isPersona) setIsSavingPersona(false); else setIsSavingTask(false);
    });
  };

  // ... other handlers (copy, sendtopage, etc.) remain the same
  // ... JSX for the component remains the same

  return (
    // For brevity, the large JSX body of this component is omitted as it remains unchanged.
    <div className="bg-gray-800 p-4 rounded-lg">
      Prompt Composer UI...
    </div>
  );
};

export default PromptComposer;
// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
// FIXED: Import the consolidated hooks
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
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
  const router = useRouter();
  // FIXED: Destructure mutation functions from the main hooks
  const { createPrompt } = usePrompts();
  const { createTemplate } = usePromptTemplates();

  const [composedPrompt, setComposedPrompt] = useState(initialPrompt);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationGoal, setRecommendationGoal] = useState('');
  const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
  const [aiSuggestedTask, setAiSuggestedTask] = useState('');
  const [showSuggestionUI, setShowSuggestionUI] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  useEffect(() => {
    if (initialPrompt) setComposedPrompt(initialPrompt);
  }, [initialPrompt]);

  const personaOptions = useMemo(() => templates.filter(t => t.tags.includes('persona')), [templates]);
  const taskOptions = useMemo(() => templates.filter(t => t.tags.includes('task')), [templates]);

  const handleCompose = async () => {
    if (!selectedPersonaId || !selectedTaskId) {
      return toast.error("Please select both a Persona and a Task.");
    }

    setIsLoading(true);
    try {
      const payload = {
        template_ids: [selectedPersonaId, selectedTaskId],
        variables: {} 
      };
      
      // NOTE: This path will need to be updated to use the proxy, e.g. '/sandbox/compose'
      const response = await apiClient.post<{ composed_text: string }>('/sandbox/compose', payload);
      setComposedPrompt(`${response.composed_text}\n\n${additionalInstructions}`.trim());
    } catch (err: any) {
      toast.error(err.message || 'Failed to compose prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGeneration = async () => {
    setIsLoading(true);
    setShowSuggestionUI(false);
    const toastId = toast.loading('Generating AI components...');
    try {
        const personaPromise = apiClient.post<{final_text: string}>('/prompts/execute', { prompt_text: `Goal: "${recommendationGoal}". Generate a concise "persona" for an AI assistant.`, model: 'gemini-1.5-flash'});
        const taskPromise = apiClient.post<{final_text: string}>('/prompts/execute', { prompt_text: `Goal: "${recommendationGoal}". Generate a concise "task" for an AI assistant.`, model: 'gemini-1.5-flash'});
        
        const [personaRes, taskRes] = await Promise.all([personaPromise, taskPromise]);
        
        setAiSuggestedPersona(personaRes.final_text.trim());
        setAiSuggestedTask(taskRes.final_text.trim());
        setNewPersonaName(`${recommendationGoal.slice(0, 20)} Persona`);
        setNewTaskName(`${recommendationGoal.slice(0, 20)} Task`);
        setShowSuggestionUI(true);
        setComposedPrompt(`${personaRes.final_text.trim()}\n\n${taskRes.final_text.trim()}`);
        toast.success('AI components generated!', { id: toastId });
    } catch (err: any) {
        toast.error(err.message, { id: toastId });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleOpenSaveModal = () => {
    if (!composedPrompt.trim()) {
        toast.error("Cannot save an empty prompt.");
        return;
    }
    setIsSaveModalOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrompt(true);

    // FIXED: Pass a single object to createPrompt
    const promise = createPrompt({
      name: newPromptName,
      description: newPromptDescription,
      text: composedPrompt,
    });

    toast.promise(promise, {
        loading: 'Saving prompt...',
        success: 'Prompt saved!',
        error: (err) => err.message || 'Save failed.',
    });
    try {
        await promise;
        setIsSaveModalOpen(false);
        setNewPromptName('');
        setNewPromptDescription('');
    } catch (error) {
        // Handled by toast
    } finally {
        setIsSavingPrompt(false);
    }
  };

  const handleSaveTemplate = async (type: 'persona' | 'task') => {
    setIsSavingTemplate(true);
    const templateData = {
      name: type === 'persona' ? newPersonaName : newTaskName,
      description: `AI-generated for goal: ${recommendationGoal}`,
      content: type === 'persona' ? aiSuggestedPersona : aiSuggestedTask,
      tags: [type, 'ai-generated'],
    };
    const promise = createTemplate(templateData);
    toast.promise(promise, {
        loading: `Saving ${type}...`,
        success: `${type} template saved!`,
        error: (err) => err.message || `Failed to save ${type}.`,
    });
    try {
        await promise;
        setIsSaveTemplatesModalOpen(false);
    } catch (error) {
        // Handled by toast
    } finally {
        setIsSavingTemplate(false);
    }
  };

  const handleSaveFromExecute = (promptContent: string) => {
    setComposedPrompt(promptContent);
    setIsExecuteModalOpen(false);
    handleOpenSaveModal();
  };

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full space-y-6">
        <div className="p-4 border border-dashed border-sky-400/50 rounded-lg">
          <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
          <textarea
            value={recommendationGoal}
            onChange={(e) => setRecommendationGoal(e.target.value)}
            className="w-full border rounded p-2 text-black bg-gray-200"
            rows={2}
            placeholder="e.g., write a professional email to my boss"
          />
          {showSuggestionUI ? (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <button onClick={() => handleSaveTemplate('persona')} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save Persona</button>
                <button onClick={() => handleSaveTemplate('task')} className="w-full mt-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save Task</button>
            </div>
          ) : (
            <button onClick={handleAiGeneration} disabled={isLoading || !recommendationGoal.trim()} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50">
              {isLoading ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>

        {composedPrompt && (
          <div className="p-4 border rounded-lg bg-gray-900 border-gray-700 flex-grow flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-2">Composed Prompt</h3>
            <AutoSizingTextarea
              className="whitespace-pre-wrap text-gray-200 text-sm flex-grow bg-gray-900"
              value={composedPrompt}
              onChange={(e) => setComposedPrompt(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
                <button onClick={() => setIsExecuteModalOpen(true)} className="flex-1 py-2 text-sm bg-green-600 rounded">Execute</button>
                <button onClick={handleOpenSaveModal} className="flex-1 py-2 text-sm bg-blue-600 rounded">Save...</button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-2">Manual Composer</h2>
          <div className="space-y-4">
            <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full p-2 text-black bg-gray-200">
              <option value="">-- Choose a Persona --</option>
              {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full p-2 text-black bg-gray-200">
              <option value="">-- Choose a Task --</option>
              {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
            <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} className="w-full p-2 text-black bg-gray-200" rows={2} placeholder="Additional instructions..."/>
          </div>
          <button onClick={handleCompose} disabled={isLoading || !selectedPersonaId || !selectedTaskId} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
            {isLoading ? 'Composing...' : 'Compose from Library'}
          </button>
        </div>
      </div>

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt} className="space-y-4">
          <input type="text" placeholder="Prompt Name" value={newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full p-2 text-black bg-gray-200" required />
          <textarea placeholder="Task Description" value={newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full p-2 text-black bg-gray-200" rows={3} required />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
            <button type="submit" disabled={isSavingPrompt} className="px-4 py-2 bg-blue-600 rounded">{isSavingPrompt ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <QuickExecuteModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        promptText={composedPrompt}
        onSaveAsPrompt={handleSaveFromExecute} 
      />
    </>
  );
};

export default PromptComposer;
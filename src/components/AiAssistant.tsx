// src/components/AiAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// --- CONSTANTS (previously in PromptComposer) ---
export const AI_MODEL = 'gemini-2.5-flash-lite';
export const META_PROMPT_BASE = `Based on the user's goal, generate a concise component. Crucially, do not include any preamble, introduction, or conversational text like "Certainly, here is...". Output ONLY the text for the component itself.`;

// --- MOCKED/PLACEHOLDER COMPONENTS AND HOOKS (should be imported from shared libs) ---
interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-600">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

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

const usePromptTemplates = () => ({
  createTemplate: async (templateData: any) => {
    console.log('Mock creating template:', templateData);
    return apiClient.post('/api/templates', templateData);
  },
  mutate: () => {
    console.log('Mock mutate templates called.');
  }
});
// ---

// --- CHILD COMPONENT: SaveTemplatesModal ---
interface SaveTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPersonaName: string;
    setNewPersonaName: (name: string) => void;
    newTaskName: string; // Corrected prop name
    setNewTaskName: (name: string) => void;
    recommendationGoal: string;
    aiSuggestedPersona: string;
    aiSuggestedTask: string;
}

const SaveTemplatesModal: React.FC<SaveTemplatesModalProps> = ({
    isOpen,
    onClose,
    newPersonaName,
    setNewPersonaName,
    newTaskName,
    setNewTaskName,
    recommendationGoal,
    aiSuggestedPersona,
    aiSuggestedTask
}) => {
    const [isSavingPersona, setIsSavingPersona] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [personaSaved, setPersonaSaved] = useState(false);
    const [taskSaved, setTaskSaved] = useState(false);
    const { createTemplate, mutate: mutateTemplates } = usePromptTemplates();

    // Reset save status when modal is opened
    useEffect(() => {
        if (isOpen) {
            setPersonaSaved(false);
            setTaskSaved(false);
        }
    }, [isOpen]);

    const handleSaveTemplate = async (type: 'persona' | 'task') => {
        const isPersona = type === 'persona';
        if (isPersona) setIsSavingPersona(true); else setIsSavingTask(true);
        
        const templateData = {
          name: isPersona ? newPersonaName : newTaskName,
          description: `AI-generated ${type} for goal: ${recommendationGoal}`,
          content: isPersona ? aiSuggestedPersona : aiSuggestedTask,
          tags: [type, 'ai-generated'],
        };
    
        const promise = createTemplate(templateData);
        
        await toast.promise(promise, {
            loading: `Saving ${type} template...`,
            success: () => {
                if (isPersona) setPersonaSaved(true); else setTaskSaved(true);
                mutateTemplates();
                return `${type.charAt(0).toUpperCase() + type.slice(1)} template saved!`;
            },
            error: (err: any) => err.message || `Failed to save ${type} template.`
        });
    
        if (isPersona) setIsSavingPersona(false); else setIsSavingTask(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save Generated Templates">
            <div className="space-y-6">
                <div className="p-4 bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Persona Template Name</label>
                    <div className="flex gap-2 items-center">
                        <input type="text" value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} className="flex-grow border rounded p-2 bg-gray-700 border-gray-600 text-white" required />
                        <button type="button" onClick={() => handleSaveTemplate('persona')} disabled={isSavingPersona || personaSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${personaSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                            {isSavingPersona ? 'Saving...' : personaSaved ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Task Template Name</label>
                    <div className="flex gap-2 items-center">
                        <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-grow border rounded p-2 bg-gray-700 border-gray-600 text-white" required />
                        <button type="button" onClick={() => handleSaveTemplate('task')} disabled={isSavingTask || taskSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${taskSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                            {isSavingTask ? 'Saving...' : taskSaved ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Close</button>
            </div>
      </Modal>
    );
}


// --- PARENT COMPONENT: AiAssistant ---
interface AiAssistantProps {
    onAiComponentsGenerated: (persona: string, task: string) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onAiComponentsGenerated }) => {
    const [recommendationGoal, setRecommendationGoal] = useState('');
    const [isRecommending, setIsRecommending] = useState(false);
    const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
    const [aiSuggestedTask, setAiSuggestedTask] = useState('');
    const [showSuggestionUI, setShowSuggestionUI] = useState(false);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);

    useEffect(() => {
        if (showSuggestionUI) {
            onAiComponentsGenerated(aiSuggestedPersona, aiSuggestedTask);
        }
    }, [aiSuggestedPersona, aiSuggestedTask, showSuggestionUI, onAiComponentsGenerated]);

    const handleAiGeneration = async () => {
        setIsRecommending(true);
        setShowSuggestionUI(false);
        const toastId = toast.loading('Generating AI components...');
        try {
          const goalMetaPrompt = `${META_PROMPT_BASE} The user's goal is: "${recommendationGoal}"`;
          const executePayload = (prompt_text: string) => ({ prompt_text, model: AI_MODEL });
          
          const personaPromise = apiClient.post<{ generated_text: string }>('/prompts/execute', executePayload(`${goalMetaPrompt} The component is a "persona" for an AI assistant.`));
          const taskPromise = apiClient.post<{ generated_text: string }>('/prompts/execute', executePayload(`${goalMetaPrompt} The component is a "task" for an AI assistant.`));
          const namePromise = apiClient.post<{ generated_text: string }>('/prompts/execute', executePayload(`Based on the goal "${recommendationGoal}", generate a short 3-5 word title. No quotes.`));
          
          const [personaRes, taskRes, nameRes] = await Promise.all([personaPromise, taskPromise, namePromise]);
    
          const generatedPersona = personaRes.generated_text?.trim();
          const generatedTask = taskRes.generated_text?.trim();
          const generatedName = nameRes.generated_text?.trim().replace(/"/g, '') || 'AI Generated';
    
          if (!generatedPersona || !generatedTask) throw new Error("AI returned an empty response.");
    
          setAiSuggestedPersona(generatedPersona);
          setAiSuggestedTask(generatedTask);
          setNewPersonaName(`${generatedName} - Persona`);
          setNewTaskName(`${generatedName} - Task`);
          setShowSuggestionUI(true);
          toast.success('AI components generated!', { id: toastId });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'AI Generation Failed';
          toast.error(errorMessage, { id: toastId });
        } finally {
          setIsRecommending(false);
        }
    };
    
    const handleTryAgain = () => {
        setShowSuggestionUI(false);
        setAiSuggestedPersona('');
        setAiSuggestedTask('');
        setRecommendationGoal('');
        onAiComponentsGenerated('', '');
    };

    return (
        <>
            <div className="p-4 border border-dashed border-sky-400/50 rounded-lg mb-6">
                <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
                <p className="text-sm text-gray-400 mb-2">Describe your goal and let the AI generate a prompt for you.</p>
                <textarea
                    value={recommendationGoal}
                    onChange={(e) => setRecommendationGoal(e.target.value)}
                    className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                    rows={2}
                    placeholder="e.g., write a professional email to my boss about a project delay"
                />
                {showSuggestionUI ? (
                    <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <p className="text-white font-medium mb-4">AI Generated the following (editable):</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Generated Persona</label>
                                <textarea value={aiSuggestedPersona} onChange={(e) => setAiSuggestedPersona(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white text-sm" rows={5} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Generated Task</label>
                                <textarea value={aiSuggestedTask} onChange={(e) => setAiSuggestedTask(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white text-sm" rows={5} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsSaveTemplatesModalOpen(true)} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save to Library...</button>
                            <button onClick={handleTryAgain} className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold">Try Again</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleAiGeneration} disabled={isRecommending || !recommendationGoal} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 font-semibold">
                        {isRecommending ? 'Generating...' : 'Generate with AI'}
                    </button>
                )}
            </div>
            <SaveTemplatesModal 
                isOpen={isSaveTemplatesModalOpen}
                onClose={() => setIsSaveTemplatesModalOpen(false)}
                newPersonaName={newPersonaName}
                setNewPersonaName={setNewPersonaName}
                newTaskName={newTaskName} // Corrected prop name
                setNewTaskName={setNewTaskName}
                recommendationGoal={recommendationGoal}
                aiSuggestedPersona={aiSuggestedPersona}
                aiSuggestedTask={aiSuggestedTask}
            />
        </>
    );
}

export default AiAssistant;


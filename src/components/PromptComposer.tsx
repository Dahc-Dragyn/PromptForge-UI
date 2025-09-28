// src/components/PromptComposer.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// --- TYPE DEFINITIONS ---
export interface Template {
  id: string;
  name: string;
  tags: string[];
  content: string;
}

interface PromptComposerProps {
  templates: Template[];
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

// --- CONSTANTS ---
const AI_MODEL = 'gemini-2.5-flash-lite';
const META_PROMPT_BASE = `Based on the user's goal, generate a concise component. Crucially, do not include any preamble, introduction, or conversational text like "Certainly, here is...". Output ONLY the text for the component itself.`;
const STYLE_OPTIONS = [
    "professional", "humorous", "academic", "Direct Instruction", "Scenario-Based",
    "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
    "Creative Writing", "Role-Playing", "Explanatory", "Debate",
    "Summarization", "Instructional", "Reflective", "Predictive",
    "Analytical", "Interactive Dialogue"
];

// --- MOCKED DEPENDENCIES (for standalone functionality) ---
const useRouter = () => ({
  push: (path: string) => { console.log(`Navigating to: ${path}`); }
});

const apiClient = {
  post: async <T,>(url: string, body: any): Promise<T> => {
    // This is a mock implementation
    console.log(`API POST to ${url}`, body);
    if (url.includes('execute')) {
        return Promise.resolve({ generated_text: 'Mocked AI response.', final_text: 'Mocked AI response.' } as T);
    }
    if (url.includes('compose')) {
        return Promise.resolve({ composed_prompt: `Persona: ${body.persona}\n\nTask: ${body.task}` } as T);
    }
    return Promise.resolve({} as T);
  },
};

const usePrompts = () => ({
  createPrompt: async ({ name, description, text }: { name: string, description: string, text: string }) => {
    console.log('Mock creating prompt:', { name, description, text });
    return Promise.resolve({ name, description, text });
  },
});

const usePromptTemplates = () => ({
  createTemplate: async (templateData: any) => {
    console.log('Mock creating template:', templateData);
    return Promise.resolve(templateData);
  },
  mutate: () => {
    console.log('Mock mutate templates called.');
  }
});

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

interface QuickExecuteModalProps { isOpen: boolean; onClose: () => void; promptText: string; onSaveAsPrompt: (promptContent: string) => void; }
const QuickExecuteModal = ({ isOpen, onClose, promptText, onSaveAsPrompt }: QuickExecuteModalProps) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Execute Prompt">
            <div className="space-y-4">
                <p className="text-sm text-gray-400">The following prompt would be executed:</p>
                <textarea readOnly className="w-full h-40 p-2 text-sm bg-gray-900 border border-gray-600 rounded-md text-gray-200 resize-none" value={promptText}/>
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => onSaveAsPrompt(promptText)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold">Save as New Prompt...</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm font-semibold">Close</button>
                </div>
            </div>
        </Modal>
    );
};
// --- END MOCKED DEPENDENCIES ---


// =================================================================================
// --- CHILD COMPONENT: AiAssistant ---
// =================================================================================
interface AiAssistantProps {
    onAiComponentsGenerated: (persona: string, task: string) => void;
    onReset: () => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onAiComponentsGenerated, onReset }) => {
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
        onReset();
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
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
                recommendationGoal={recommendationGoal}
                aiSuggestedPersona={aiSuggestedPersona}
                aiSuggestedTask={aiSuggestedTask}
            />
        </>
    );
}

// =================================================================================
// --- CHILD COMPONENT: ManualComposer ---
// =================================================================================
interface ManualComposerProps {
    templates: Template[];
    onCompose: (prompt: string) => void;
}

const ManualComposer: React.FC<ManualComposerProps> = ({ templates = [], onCompose }) => {
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [userInstructions, setUserInstructions] = useState('');
    const [loading, setLoading] = useState(false);

    const findPrimaryTag = (template: Template) => template.tags.find(tag => tag !== 'persona' && tag !== 'task') || template.name;

    const personaOptions = useMemo(() =>
        templates.filter(t => t.tags.includes('persona')).map(t => ({
            id: t.id,
            displayName: t.name,
            tagValue: findPrimaryTag(t)
    })), [templates]);

    const taskOptions = useMemo(() =>
        templates.filter(t => t.tags.includes('task')).map(t => ({
            id: t.id,
            displayName: t.name,
            tagValue: findPrimaryTag(t)
    })), [templates]);
    
    const additionalInstructions = useMemo(() => {
        const styleInstruction = selectedStyle ? `Style Instruction: The tone and format should be ${selectedStyle}.` : '';
        return [userInstructions, styleInstruction].filter(Boolean).join('\n');
    }, [selectedStyle, userInstructions]);

    const handleComposeFromLibrary = async () => {
        if (!selectedPersonaId || !selectedTaskId) return;
        
        const personaTag = personaOptions.find(p => p.id === selectedPersonaId)?.tagValue;
        const taskTag = taskOptions.find(t => t.id === selectedTaskId)?.tagValue;

        if (!personaTag || !taskTag) {
            toast.error("Could not find selected persona or task. It may have been updated. Please re-select.");
            if (!personaTag) setSelectedPersonaId('');
            if (!taskTag) setSelectedTaskId('');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Composing from library...');
        try {
            const { composed_prompt } = await apiClient.post<{ composed_prompt: string }>('/templates/compose', {
                persona: personaTag,
                task: taskTag
            });
            let finalPrompt = composed_prompt;
            if (additionalInstructions.trim()) {
                finalPrompt += `\n\n${additionalInstructions.trim()}`;
            }
            onCompose(finalPrompt);
            toast.success('Prompt composed!', { id: toastId });
        } catch (err: unknown) {
            toast.error((err instanceof Error ? err.message : 'Failed to compose prompt.'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Manual Composer</h2>
            <div className="space-y-4">
                <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white">
                    <option value="">-- Choose a Persona --</option>
                    {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
                </select>
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white">
                    <option value="">-- Choose a Task --</option>
                    {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
                </select>
                <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white">
                    <option value="">-- No Specific Style --</option>
                    {STYLE_OPTIONS.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
                <textarea value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white" placeholder="Additional instructions..." rows={3} />
            </div>
            <button onClick={handleComposeFromLibrary} disabled={loading || !selectedPersonaId || !selectedTaskId} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                {loading ? 'Composing...' : 'Compose from Library'}
            </button>
        </div>
    );
}

// =================================================================================
// --- CHILD COMPONENT: ComposedPromptDisplay ---
// =================================================================================
interface ComposedPromptDisplayProps {
    composedPrompt: string;
    onUpdateComposedPrompt: (prompt: string) => void;
    onSave: () => void;
    onQuickExecute: () => void;
}

const ComposedPromptDisplay: React.FC<ComposedPromptDisplayProps> = ({ composedPrompt, onUpdateComposedPrompt, onSave, onQuickExecute }) => {
    const router = useRouter();
    const [copyText, setCopyText] = useState('Copy');
    const [isGeneratingForSandbox, setIsGeneratingForSandbox] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(composedPrompt).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy'), 2000);
        });
    };

    const handleSendToPage = async (path: string, tool?: string) => {
        if (path !== '/sandbox' || !composedPrompt) {
          const encodedPrompt = encodeURIComponent(composedPrompt);
          let url = `${path}?prompt=${encodedPrompt}`;
          if (tool) url += `&tool=${tool}`;
          router.push(url);
          return;
        }
    
        setIsGeneratingForSandbox(true);
        const toastId = toast.loading('Generating a variation for A/B testing...');
        
        try {
            const metaPrompt = `Based on the prompt below, generate one new, distinct variation. The new variation should aim for the same goal but use a different approach (e.g., more concise, different tone, add a constraint). Only output the new prompt text, no extra commentary.\n\nOriginal Prompt:\n"${composedPrompt}"`;
            
            const { generated_text } = await apiClient.post<{ generated_text: string }>('/prompts/execute', {
                prompt_text: metaPrompt,
                model: AI_MODEL
            });
    
            const originalEncoded = encodeURIComponent(composedPrompt);
            const variationEncoded = encodeURIComponent(generated_text);
            
            toast.success('Variation generated! Opening Sandbox...', { id: toastId });
            router.push(`/sandbox?promptA=${originalEncoded}&promptB=${variationEncoded}`);
    
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Variation generation failed: ${errorMessage}`, { id: toastId });
        } finally {
            setIsGeneratingForSandbox(false);
        }
    };

    return (
        <div className="mb-6 p-6 border rounded-lg bg-gray-900 border-gray-700 relative flex flex-col max-h-[50vh] min-h-[300px]">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
                <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={onQuickExecute} className="px-4 py-2 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Quick Execute</button>
                    <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors text-white ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                    <button onClick={onSave} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save as Prompt...</button>
                </div>
            </div>
            <textarea
                className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-auto bg-transparent border-0 focus:ring-0 p-0 m-0 resize-none"
                value={composedPrompt}
                onChange={(e) => onUpdateComposedPrompt(e.target.value)}
            />
            <div className="mt-4 pt-4 border-t border-gray-600 flex-shrink-0">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <button onClick={() => handleSendToPage('/sandbox')} disabled={isGeneratingForSandbox} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold disabled:opacity-50">
                        {isGeneratingForSandbox ? 'Generating...' : 'A/B Test'}
                    </button>
                    <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-semibold">Analyze</button>
                    <button onClick={() => handleSendToPage('/analyze', 'optimize')} className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-semibold">Optimize</button>
                    <button onClick={() => handleSendToPage('/clinic')} className="w-full py-2 bg-rose-600 text-white rounded hover:bg-rose-700 text-sm font-semibold">Run Clinic</button>
                </div>
            </div>
        </div>
    );
}

// =================================================================================
// --- CHILD COMPONENT: SavePromptModal ---
// =================================================================================
interface SavePromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    composedPrompt: string;
    onPromptSaved: () => void;
}

const SavePromptModal: React.FC<SavePromptModalProps> = ({ isOpen, onClose, composedPrompt, onPromptSaved }) => {
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptDescription, setNewPromptDescription] = useState('');
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);
    const { createPrompt } = usePrompts();
    const isMounted = useRef(true);
  
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (isOpen && composedPrompt) {
            generateDetails();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, composedPrompt]);

    const generateDetails = async () => {
        setIsGeneratingDetails(true);
        setNewPromptName('');
        setNewPromptDescription('');
        try {
            const executePayload = (prompt_text: string) => ({ prompt_text, model: AI_MODEL });
            const nameMetaPrompt = `Based on the prompt below, generate a short, 3-5 word title. No quotes.\n\nPrompt: "${composedPrompt}"`;
            const descMetaPrompt = `Based on the prompt below, generate a one-sentence description.\n\nPrompt: "${composedPrompt}"`;
    
            const [nameRes, descRes] = await Promise.all([
                apiClient.post<{ generated_text: string }>('/prompts/execute', executePayload(nameMetaPrompt)),
                apiClient.post<{ generated_text: string }>('/prompts/execute', executePayload(descMetaPrompt))
            ]);
            
            if (isMounted.current) {
                setNewPromptName(nameRes.generated_text.trim().replace(/"/g, ''));
                setNewPromptDescription(descRes.generated_text.trim());
            }
        } catch (err) {
            toast.error("AI failed to generate details.");
            console.error(err);
        } finally {
            if (isMounted.current) {
                setIsGeneratingDetails(false);
            }
        }
    };

    const handleSavePrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPrompt(true);
        const promise = createPrompt({
            name: newPromptName,
            description: newPromptDescription,
            text: composedPrompt,
        });
  
        await toast.promise(promise, {
            loading: 'Saving prompt...',
            success: (savedPrompt) => {
                onPromptSaved();
                onClose();
                return `Prompt "${(savedPrompt as any).name}" saved!`;
            },
            error: (err: any) => err.message || 'Failed to save prompt.',
        });
        setIsSavingPrompt(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save New Prompt">
            <form onSubmit={handleSavePrompt}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                        <input type="text" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white" required disabled={isGeneratingDetails} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white" rows={3} required disabled={isGeneratingDetails} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSavingPrompt || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSavingPrompt ? 'Saving...' : 'Save Prompt'}</button>
                </div>
            </form>
        </Modal>
    );
}

// =================================================================================
// --- CHILD COMPONENT: SaveTemplatesModal ---
// =================================================================================
interface SaveTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPersonaName: string;
    setNewPersonaName: (name: string) => void;
    newTaskName: string;
    setNewTaskName: (name: string) => void;
    recommendationGoal: string;
    aiSuggestedPersona: string;
    aiSuggestedTask: string;
}

const SaveTemplatesModal: React.FC<SaveTemplatesModalProps> = ({ isOpen, onClose, newPersonaName, setNewPersonaName, newTaskName, setNewTaskName, recommendationGoal, aiSuggestedPersona, aiSuggestedTask }) => {
    const [isSavingPersona, setIsSavingPersona] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [personaSaved, setPersonaSaved] = useState(false);
    const [taskSaved, setTaskSaved] = useState(false);
    const { createTemplate, mutate: mutateTemplates } = usePromptTemplates();

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


// =================================================================================
// --- MAIN PARENT COMPONENT: PromptComposer ---
// =================================================================================
const PromptComposer = ({ templates = [], onPromptSaved, initialPrompt = '' }: PromptComposerProps) => {
    const [composedPrompt, setComposedPrompt] = useState(() => {
        if (typeof window !== 'undefined') {
            return initialPrompt || sessionStorage.getItem('composedPrompt') || '';
        }
        return initialPrompt;
    });

    const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('composedPrompt', composedPrompt);
        }
    }, [composedPrompt]);

    const handleAiComponentsGenerated = (persona: string, task: string) => {
        setComposedPrompt(`${persona}\n\n${task}`);
    };

    const handleResetAi = () => {
        setComposedPrompt('');
    };

    const handlePromptSaved = () => {
        if(onPromptSaved) {
            onPromptSaved();
        }
    }

    return (
        <>
            <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full overflow-y-auto">
                <div className="flex-shrink-0">
                    <AiAssistant
                        onAiComponentsGenerated={handleAiComponentsGenerated}
                        onReset={handleResetAi}
                    />
                </div>

                {composedPrompt && (
                    <div className="flex-shrink-0">
                        <ComposedPromptDisplay
                            composedPrompt={composedPrompt}
                            onUpdateComposedPrompt={setComposedPrompt}
                            onSave={() => setIsSavePromptModalOpen(true)}
                            onQuickExecute={() => setIsExecuteModalOpen(true)}
                        />
                    </div>
                )}
                
                <div className="flex-shrink-0">
                    <ManualComposer
                        templates={templates}
                        onCompose={setComposedPrompt}
                    />
                </div>
            </div>
            
            <SavePromptModal
                isOpen={isSavePromptModalOpen}
                onClose={() => setIsSavePromptModalOpen(false)}
                composedPrompt={composedPrompt}
                onPromptSaved={handlePromptSaved}
            />

            <QuickExecuteModal
                isOpen={isExecuteModalOpen}
                onClose={() => setIsExecuteModalOpen(false)}
                promptText={composedPrompt}
                onSaveAsPrompt={() => {
                    setIsExecuteModalOpen(false);
                    setIsSavePromptModalOpen(true);
                }}
            />
        </>
    );
};

export default PromptComposer;


// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Modal from './Modal';
import QuickExecuteModal from './QuickExecuteModal';
import toast from 'react-hot-toast';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;
const API_EXECUTE_URL = `${API_BASE_URL}/prompts/execute`;

const STYLE_OPTIONS = [
  "professional", "humorous", "academic", "Direct Instruction", "Scenario-Based",
  "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
  "Creative Writing", "Role-Playing", "Explanatory", "Debate",
  "Summarization", "Instructional", "Reflective", "Predictive",
  "Analytical", "Interactive Dialogue"
];

interface Template {
  id: string;
  name: string;
  tags: string[];
}

interface PromptComposerProps {
  templates: Template[];
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

const findPrimaryTag = (template: any, category: string) => {
  if (!template || !template.tags) return '';
  return template.tags.find((tag: string) => tag !== category) || template.name;
};

const PromptComposer = ({ templates, onPromptSaved, initialPrompt = '' }: PromptComposerProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // --- BUG FIX: Initialize state from sessionStorage to persist across navigation ---
  const [composedPrompt, setComposedPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = sessionStorage.getItem('composedPrompt');
      return savedPrompt || initialPrompt;
    }
    return initialPrompt;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyText, setCopyText] = useState('Copy');
  const [recommendationGoal, setRecommendationGoal] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
  const [aiSuggestedTask, setAiSuggestedTask] = useState('');
  const [showSuggestionUI, setShowSuggestionUI] = useState(false);
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isGeneratingForSandbox, setIsGeneratingForSandbox] = useState(false);

  // --- BUG FIX: Save prompt to sessionStorage on change ---
  useEffect(() => {
    sessionStorage.setItem('composedPrompt', composedPrompt);
  }, [composedPrompt]);

  useEffect(() => {
    // This effect should only run if the initialPrompt prop changes, to allow overwriting
    if (initialPrompt) {
        setComposedPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (selectedStyle) {
      setAdditionalInstructions(prev => {
        const cleanedInstructions = prev.split('\n').filter(line => !line.startsWith("Style Instruction:")).join('\n');
        const newInstruction = `Style Instruction: The tone and format of the response should be ${selectedStyle}.`;
        return cleanedInstructions ? `${cleanedInstructions.trim()}\n${newInstruction}` : newInstruction;
      });
    }
  }, [selectedStyle]);

  useEffect(() => {
    if (showSuggestionUI) {
      const finalPrompt = `${aiSuggestedPersona}\n\n${aiSuggestedTask}`;
      setComposedPrompt(finalPrompt);
    }
  }, [aiSuggestedPersona, aiSuggestedTask, showSuggestionUI]);

  const personaOptions = useMemo(() =>
    templates
      .filter(t => t.tags.includes('persona'))
      .map(t => ({
        id: t.id,
        displayName: t.name,
        tagValue: findPrimaryTag(t, 'persona')
      })), [templates]
  );
  const taskOptions = useMemo(() =>
    templates
      .filter(t => t.tags.includes('task'))
      .map(t => ({
        id: t.id,
        displayName: t.name,
        tagValue: findPrimaryTag(t, 'task')
      })), [templates]
  );

  const handleComposeFromLibrary = async () => {
    if (!selectedPersonaId || !selectedTaskId) {
      setError("Please select a Persona and a Task from the dropdowns.");
      return;
    }

    const personaTag = personaOptions.find(p => p.id === selectedPersonaId)?.tagValue;
    const taskTag = taskOptions.find(t => t.id === selectedTaskId)?.tagValue;

    if (!personaTag || !taskTag) {
      setError("Could not find the selected persona or task. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);
    setComposedPrompt('');
    try {
      const response = await fetch(`${API_BASE_URL}/templates/compose`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: personaTag, task: taskTag }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to compose prompt.');
      let finalPrompt = data.composed_prompt;
      if (additionalInstructions.trim()) {
        finalPrompt += `\n\n${additionalInstructions}`;
      }
      setComposedPrompt(finalPrompt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaveModal = async () => {
    setIsSavePromptModalOpen(true);
    setNewPromptName('');
    setNewPromptDescription('');
    setError(null);
    setIsGeneratingDetails(true);

    try {
      const nameMetaPrompt = `Based on the following prompt, generate a short, descriptive, 3-5 word title. Do not use quotes. The prompt is: "${composedPrompt}"`;
      const descMetaPrompt = `Based on the following prompt, generate a one-sentence description of the task it performs. The prompt is: "${composedPrompt}"`;

      const [nameRes, descRes] = await Promise.all([
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: descMetaPrompt }) })
      ]);

      if (!nameRes.ok || !descRes.ok) throw new Error('Failed to generate prompt details.');

      const nameData = await nameRes.json();
      const descData = await descRes.json();

      setNewPromptName(nameData.generated_text.trim().replace(/"/g, ''));
      setNewPromptDescription(descData.generated_text.trim());

    } catch (err) {
      console.error("Failed to generate details:", err);
    } finally {
      setIsGeneratingDetails(false);
    }
  };


  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("You must be logged in to save a prompt.");
        return;
    }
    setIsSavingPrompt(true);
    setError(null);

    const newPrompt = {
        name: newPromptName,
        task_description: newPromptDescription,
        userId: user.uid,
        isArchived: false,
        created_at: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'prompts'), newPrompt);
      
      const versionsUrl = `${API_BASE_URL}/prompts/${docRef.id}/versions`;
      const versionResponse = await fetch(versionsUrl, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: composedPrompt,
          commit_message: "Initial version created from Composer.",
        }),
      });

      if (!versionResponse.ok) {
        throw new Error('Prompt document was created, but failed to save the initial version text.');
      }

      if (onPromptSaved) onPromptSaved();

      setIsSavePromptModalOpen(false);
      toast.success(`Prompt "${newPromptName}" saved!`);

    } catch (err: any) {
      setError(`Failed to save the new prompt: ${err.message}`);
      toast.error(`Failed to save: ${err.message}`);
      console.error(err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSaveTemplate = async (type: 'persona' | 'task') => {
    const isPersona = type === 'persona';
    if (isPersona) setIsSavingPersona(true);
    else setIsSavingTask(true);
    
    setError(null);

    try {
        const template = {
            name: isPersona ? newPersonaName : newTaskName,
            description: `AI-generated ${type} for goal: ${recommendationGoal}`,
            content: isPersona ? aiSuggestedPersona : aiSuggestedTask,
            tags: [type, 'ai-generated'],
            created_at: serverTimestamp(),
            isArchived: false
        };
        await addDoc(collection(db, 'prompt_templates'), template);
        
        if (isPersona) setPersonaSaved(true);
        else setTaskSaved(true);

        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} template saved!`);
    } catch (err) {
        const errorMsg = `Failed to save ${type} template.`;
        setError(errorMsg);
        toast.error(errorMsg);
        console.error(err);
    } finally {
        if (isPersona) setIsSavingPersona(false);
        else setIsSavingTask(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(composedPrompt).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    });
  };

  const handleAiGeneration = async () => {
    setIsRecommending(true);
    setError(null);
    setShowSuggestionUI(false);
    setComposedPrompt('');
    const toastId = toast.loading('Generating AI components...');
    try {
      const personaMetaPrompt = `Based on the user's goal, generate a concise "persona" for an AI assistant in 2-3 sentences. Crucially, do not include any preamble, introduction, or conversational text like "Certainly, here is a persona...". Output ONLY the text for the persona itself. The user's goal is: "${recommendationGoal}"`;
      const taskMetaPrompt = `Based on the user's goal, generate a concise "task" for an AI assistant to perform in 2-3 sentences. Crucially, do not include any preamble, introduction, or conversational text like "Certainly, here is a task...". Output ONLY the text for the task itself. The user's goal is: "${recommendationGoal}"`;
      const nameMetaPrompt = `Based on the user's goal, generate a short, descriptive, 3-5 word title for a prompt template. Do not use quotes or any surrounding text. Output only the title. The goal is: "${recommendationGoal}"`;

      const [personaRes, taskRes, nameRes] = await Promise.all([
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: personaMetaPrompt }) }),
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: taskMetaPrompt }) }),
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
      ]);

      if (!personaRes.ok || !taskRes.ok || !nameRes.ok) throw new Error('The AI assistant API returned an error.');

      const personaData = await personaRes.json();
      const taskData = await taskRes.json();
      const nameData = await nameRes.json();

      const generatedPersonaText = (typeof personaData.generated_text === 'string') ? personaData.generated_text.trim() : '';
      const generatedTaskText = (typeof taskData.generated_text === 'string') ? taskData.generated_text.trim() : '';
      const generatedName = (typeof nameData.generated_text === 'string') ? nameData.generated_text.trim().replace(/"/g, '') : 'AI Generated';

      if (!generatedPersonaText || !generatedTaskText) throw new Error("AI Assistant returned an empty or invalid response. Please try rephrasing your goal.");

      setAiSuggestedPersona(generatedPersonaText);
      setAiSuggestedTask(generatedTaskText);
      setNewPersonaName(`${generatedName} - Persona`);
      setNewTaskName(`${generatedName} - Task`);
      setShowSuggestionUI(true);
      toast.success('AI components generated!', { id: toastId });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsRecommending(false);
    }
  };

  const handleOpenSaveTemplatesModal = () => {
    setPersonaSaved(false);
    setTaskSaved(false);
    setIsSaveTemplatesModalOpen(true);
  };

  const handleTryAgain = () => {
    setShowSuggestionUI(false);
    setAiSuggestedPersona('');
    setAiSuggestedTask('');
    setRecommendationGoal('');
    setComposedPrompt('');
    setSelectedPersonaId('');
    setSelectedTaskId('');
  };

  const isComposeDisabled = loading || !selectedPersonaId || !selectedTaskId;

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

    const metaPrompt = `Based on the following prompt, generate one new, distinct variation. The new variation should aim to achieve the same goal but use a different approach (e.g., be more concise, more detailed, use a different tone, or add a new constraint). Only output the new prompt text, with no extra commentary.\n\nOriginal Prompt:\n"${composedPrompt}"`;

    try {
        const response = await fetch(API_EXECUTE_URL, {
            method: 'POST',
            headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_text: metaPrompt }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to generate variation.');
        }

        const originalEncoded = encodeURIComponent(composedPrompt);
        const variationEncoded = encodeURIComponent(data.generated_text);
        
        toast.success('Variation generated! Opening Sandbox...', { id: toastId });
        router.push(`/sandbox?promptA=${originalEncoded}&promptB=${variationEncoded}`);

    } catch (err: any) {
        toast.error(`Failed to generate variation: ${err.message}`, { id: toastId });
        console.error(err);
    } finally {
        setIsGeneratingForSandbox(false);
    }
  };

  const handleSaveFromQuickExecute = (promptContent: string) => {
    setIsExecuteModalOpen(false);
    setComposedPrompt(promptContent);
    handleOpenSaveModal();
  };

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full">
        {/* SECTION 1: AI Assistant */}
        <div className="p-4 border border-dashed border-sky-400/50 rounded-lg mb-6">
          <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
          <p className="text-sm text-gray-400 mb-2">Describe your goal and let the AI generate and compose a prompt for you.</p>
          <textarea
            value={recommendationGoal}
            onChange={(e) => setRecommendationGoal(e.target.value)}
            className="w-full border rounded p-2 text-black bg-gray-200"
            rows={2}
            placeholder="e.g., write a professional email to my boss about a project delay"
          />
          {showSuggestionUI ? (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-white font-medium mb-4">AI Generated the following components (you can edit them below):</p>
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Generated Persona</label>
                    <textarea value={aiSuggestedPersona} onChange={(e) => setAiSuggestedPersona(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200 text-sm" rows={5}/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Generated Task</label>
                    <textarea value={aiSuggestedTask} onChange={(e) => setAiSuggestedTask(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200 text-sm" rows={5}/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleOpenSaveTemplatesModal} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save to Library...</button>
                <button onClick={handleTryAgain} className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold">Try Again</button>
              </div>
            </div>
          ) : (
            <button onClick={handleAiGeneration} disabled={isRecommending || !recommendationGoal} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 font-semibold">
              {isRecommending ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>

        {/* SECTION 2: Composed Prompt (Output) */}
        {composedPrompt && (
          <div className="mb-6 p-6 border rounded-lg bg-gray-900 border-gray-700 relative flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={() => setIsExecuteModalOpen(true)} className="px-4 py-2 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Quick Execute</button>
                <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                <button onClick={handleOpenSaveModal} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save as Prompt...</button>
              </div>
            </div>
            <textarea 
                className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-auto bg-gray-900 border-0 focus:ring-0 p-0 m-0 resize-none"
                value={composedPrompt}
                onChange={(e) => setComposedPrompt(e.target.value)}
            />
            <div className="mt-4 pt-4 border-t border-gray-600">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <button 
                      onClick={() => handleSendToPage('/sandbox')} 
                      disabled={isGeneratingForSandbox}
                      className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingForSandbox ? 'Generating...' : 'A/B Test'}
                    </button>
                    <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-semibold">Analyze</button>
                    <button onClick={() => handleSendToPage('/analyze', 'optimize')} className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-semibold">Optimize</button>
                    <button onClick={() => handleSendToPage('/clinic')} className="w-full py-2 bg-rose-600 text-white rounded hover:bg-rose-700 text-sm font-semibold">Run Clinic</button>
                </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Manual Composer */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Manual Composer</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="persona-select" className="block text-sm font-medium mb-1">Select Persona</label>
              <select id="persona-select" value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
                <option value="">-- Choose a Persona --</option>
                {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-select" className="block text-sm font-medium mb-1">Select Task</label>
              <select id="task-select" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
                <option value="">-- Choose a Task --</option>
                {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="style-select" className="block text-sm font-medium mb-1">Select Style (Optional Enhancement)</label>
              <select id="style-select" value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
                <option value="">-- No Specific Style --</option>
                {STYLE_OPTIONS.map(style => <option key={style} value={style}>{style}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="additional-instructions" className="block text-sm font-medium mb-1">Additional Instructions</label>
              <textarea id="additional-instructions" value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3}/>
            </div>
          </div>
          <button
            onClick={handleComposeFromLibrary}
            disabled={isComposeDisabled}
            className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Composing...' : 'Compose from Library'}
          </button>
          {isComposeDisabled && !loading && !composedPrompt && (
            <p className="text-xs text-gray-400 mt-2 text-center">Please select a Persona and a Task to compose from your library.</p>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isSavePromptModalOpen} onClose={() => setIsSavePromptModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
          {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
          <div className="space-y-4">
            <div>
              <label htmlFor="new-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
              <input id="new-prompt-name" type="text" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required disabled={isGeneratingDetails} />
            </div>
            <div>
              <label htmlFor="new-prompt-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
              <textarea id="new-prompt-desc" value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required disabled={isGeneratingDetails} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={() => setIsSavePromptModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
            <button type="submit" disabled={isSavingPrompt || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSavingPrompt ? 'Saving...' : 'Save Prompt'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSaveTemplatesModalOpen} onClose={() => setIsSaveTemplatesModalOpen(false)} title="Save Generated Templates to Library">
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="space-y-6">
            <div className="p-4 bg-gray-700/50 rounded-lg">
                <label htmlFor="new-persona-name" className="block text-sm font-medium text-gray-300 mb-1">Persona Template Name</label>
                <div className="flex gap-2 items-center">
                    <input id="new-persona-name" type="text" value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} className="flex-grow border rounded p-2 text-black bg-gray-200" required />
                    <button type="button" onClick={() => handleSaveTemplate('persona')} disabled={isSavingPersona || personaSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${personaSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                        {isSavingPersona ? 'Saving...' : personaSaved ? 'Saved!' : 'Save'}
                    </button>
                </div>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
                <label htmlFor="new-task-name" className="block text-sm font-medium text-gray-300 mb-1">Task Template Name</label>
                <div className="flex gap-2 items-center">
                    <input id="new-task-name" type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-grow border rounded p-2 text-black bg-gray-200" required />
                    <button type="button" onClick={() => handleSaveTemplate('task')} disabled={isSavingTask || taskSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${taskSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                         {isSavingTask ? 'Saving...' : taskSaved ? 'Saved!' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setIsSaveTemplatesModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
              Close
            </button>
        </div>
      </Modal>

      <QuickExecuteModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        promptText={composedPrompt}
        onSaveAsPrompt={handleSaveFromQuickExecute}
      />
    </>
  );
};

export default PromptComposer;
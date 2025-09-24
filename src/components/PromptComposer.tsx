// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Modal from './Modal';
import QuickExecuteModal from './QuickExecuteModal';
import AutoSizingTextarea from './AutoSizingTextarea';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/apiClient';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;

interface Template {
  id: string;
  name: string;
  tags: string[];
}

const STYLE_OPTIONS = [
  "professional", "humorous", "academic", "Direct Instruction", "Scenario-Based",
  "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
  "Creative Writing", "Role-Playing", "Explanatory", "Debate",
  "Summarization", "Instructional", "Reflective", "Predictive",
  "Analytical", "Interactive Dialogue"
];

const findPrimaryTag = (template: any, category: string) => {
  if (!template?.tags) return '';
  return template.tags.find((tag: string) => tag !== category) || template.name;
};

interface PromptComposerProps {
  templates: Template[];
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

const PromptComposer = ({ templates, onPromptSaved = () => {}, initialPrompt = '' }: PromptComposerProps) => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [composedPrompt, setComposedPrompt] = useState(initialPrompt);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
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
  
  const [copyText, setCopyText] = useState('Copy');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isGeneratingForSandbox, setIsGeneratingForSandbox] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
        setComposedPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (showSuggestionUI) {
      const title = recommendationGoal.split(' ').slice(0, 4).join(' ') || 'AI Generated';
      setNewPersonaName(`${title} - Persona`);
      setNewTaskName(`${title} - Task`);
    }
  }, [showSuggestionUI, recommendationGoal]);

  const personaOptions = useMemo(() =>
    templates.filter(t => t.tags.includes('persona')).map(t => ({ id: t.id, displayName: t.name, tagValue: findPrimaryTag(t, 'persona') })),
    [templates]
  );
  const taskOptions = useMemo(() =>
    templates.filter(t => t.tags.includes('task')).map(t => ({ id: t.id, displayName: t.name, tagValue: findPrimaryTag(t, 'task') })),
    [templates]
  );

  const handleComposeFromLibrary = async () => {
    if (!selectedPersonaId || !selectedTaskId) {
      toast.error("Please select both a Persona and a Task.");
      return;
    }
    const personaOption = personaOptions.find((p) => p.id === selectedPersonaId);
    const taskOption = taskOptions.find((t) => t.id === selectedTaskId);
    if (!personaOption || !taskOption) return;

    setLoading(true);
    try {
      const payload = { persona: personaOption.tagValue, task: taskOption.tagValue };
      const response = await authenticatedFetch(`${API_BASE_URL}/templates/compose`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to compose prompt.');
      
      let finalPrompt = data.composed_prompt.trim();
      const instructions = [];
      if (additionalInstructions) {
        const filteredInstructions = additionalInstructions.split('\n').filter((line) => !line.trim().startsWith('Style Instruction:')).join('\n').trim();
        if (filteredInstructions) instructions.push(filteredInstructions);
      }
      if (selectedStyle) {
        instructions.push(`Style Instruction: The tone and format should be ${selectedStyle}.`);
      }
      if (instructions.length > 0) finalPrompt += `\n\n${instructions.join('\n')}`;
      
      setComposedPrompt(finalPrompt);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGeneration = async () => {
    setIsRecommending(true);
    setShowSuggestionUI(false);
    const toastId = toast.loading('Generating AI components...');
    try {
      const personaMetaPrompt = `Goal: "${recommendationGoal}". Generate a concise "persona" for an AI assistant in 2-3 sentences. Output ONLY the persona text.`;
      const taskMetaPrompt = `Goal: "${recommendationGoal}". Generate a concise "task" for an AI assistant in 2-3 sentences. Output ONLY the task text.`;
      const modelToUse = "gemini-2.5-flash-lite";

      const [personaRes, taskRes] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', body: JSON.stringify({ prompt_text: personaMetaPrompt, model: modelToUse, variables: {} }) }),
        authenticatedFetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', body: JSON.stringify({ prompt_text: taskMetaPrompt, model: modelToUse, variables: {} }) })
      ]);

      if (!personaRes.ok || !taskRes.ok) throw new Error('AI assistant API returned an error.');
      
      const personaData = await personaRes.json();
      const taskData = await taskRes.json();
      
      setAiSuggestedPersona(personaData.final_text.trim());
      setAiSuggestedTask(taskData.final_text.trim());
      setShowSuggestionUI(true);
      setComposedPrompt(`${personaData.final_text.trim()}\n\n${taskData.final_text.trim()}`);
      toast.success('AI components generated!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsRecommending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(composedPrompt).then(() => {
      setCopyText('Copied!');
      toast.success('Prompt copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    });
  };

  const handleOpenSaveModal = async () => {
    if (!composedPrompt.trim()) {
        toast.error("Cannot save an empty prompt.");
        return;
    }
    setIsSaveModalOpen(true);
    setNewPromptName('');
    setNewPromptDescription('');
    setIsGeneratingDetails(true);
    const toastId = toast.loading('Generating details with AI...');
    try {
        const nameMetaPrompt = `Based on the prompt, generate a 3-5 word title. No quotes. Prompt: "${composedPrompt}"`;
        const descMetaPrompt = `Based on the prompt, generate a one-sentence description. Prompt: "${composedPrompt}"`;
        const modelToUse = "gemini-2.5-flash-lite";

        const [nameRes, descRes] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', body: JSON.stringify({ prompt_text: nameMetaPrompt, model: modelToUse, variables: {} }) }),
            authenticatedFetch(`${API_BASE_URL}/prompts/execute`, { method: 'POST', body: JSON.stringify({ prompt_text: descMetaPrompt, model: modelToUse, variables: {} }) })
        ]);

        if (!nameRes.ok || !descRes.ok) throw new Error('Failed to generate prompt details.');
        
        const nameData = await nameRes.json();
        const descData = await descRes.json();
        setNewPromptName(nameData.final_text.trim().replace(/"/g, ''));
        setNewPromptDescription(descData.final_text.trim());
        toast.success('Details generated!', { id: toastId });
    } catch (err) {
        toast.error("Failed to generate details.", { id: toastId });
    } finally {
        setIsGeneratingDetails(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPrompt(true);
    const toastId = toast.loading('Saving prompt...');
    try {
      const docRef = await addDoc(collection(db, 'prompts'), {
        name: newPromptName,
        task_description: newPromptDescription,
        owner_id: user.uid,
        isArchived: false,
        created_at: serverTimestamp(),
      });
      
      const response = await authenticatedFetch(`${API_BASE_URL}/prompts/${docRef.id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ prompt_text: composedPrompt, commit_message: "Initial version from Composer" }),
      });

      if (!response.ok) {
        await deleteDoc(doc(db, 'prompts', docRef.id));
        throw new Error('Failed to save the initial prompt version.');
      }

      toast.success(`Prompt "${newPromptName}" saved!`, { id: toastId });
      if (onPromptSaved) onPromptSaved();
      setIsSaveModalOpen(false);
      // FIX: Do not clear the prompt after saving, so user can use "Next Steps" buttons.
      // setComposedPrompt('');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSendToPage = (path: string) => {
    const encodedPrompt = encodeURIComponent(composedPrompt);
    router.push(`${path}?prompt=${encodedPrompt}`);
  };

  const handleSaveFromQuickExecute = (promptContent: string) => {
    setIsExecuteModalOpen(false);
    setComposedPrompt(promptContent);
    handleOpenSaveModal();
  };

  const handleOpenSaveTemplatesModal = () => {
    setPersonaSaved(false);
    setTaskSaved(false);
    setIsSaveTemplatesModalOpen(true);
  };

  const handleSaveTemplate = async (type: 'persona' | 'task') => {
    const isPersona = type === 'persona';
    if (isPersona) setIsSavingPersona(true); else setIsSavingTask(true);
    try {
      const template = {
        name: isPersona ? newPersonaName : newTaskName,
        description: `AI-generated for goal: ${recommendationGoal}`,
        content: isPersona ? aiSuggestedPersona : aiSuggestedTask,
        tags: [type, 'ai-generated', 'prompt-composer'],
        created_at: serverTimestamp(),
        isArchived: false
      };
      await addDoc(collection(db, 'prompt_templates'), template);
      if (isPersona) setPersonaSaved(true); else setTaskSaved(true);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} template saved!`);
    } catch (err) {
      toast.error(`Failed to save ${type} template.`);
    } finally {
      if (isPersona) setIsSavingPersona(false); else setIsSavingTask(false);
    }
  };

  const handleTryAgain = () => {
    // FIX: Do not hide the suggestion UI when trying again, just re-run generation.
    // setShowSuggestionUI(false); 
    handleAiGeneration();
  };

  const handleClearPrompt = () => {
    setComposedPrompt('');
    setShowSuggestionUI(false);
    setRecommendationGoal('');
    toast.success('Prompt cleared.');
  };
  
  const isComposeDisabled = loading || !selectedPersonaId || !selectedTaskId;

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full space-y-6">
        {/* AI Assistant Section */}
        <div className="p-4 border border-dashed border-sky-400/50 rounded-lg">
          <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
          <textarea
            value={recommendationGoal}
            onChange={(e) => setRecommendationGoal(e.target.value)}
            className="w-full border rounded p-2 text-black bg-gray-200"
            rows={2}
            placeholder="e.g., write a professional email to my boss about a project delay"
          />
          {showSuggestionUI ? (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-white font-medium mb-4">AI Generated Components:</p>
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Generated Persona</label>
                    <AutoSizingTextarea value={aiSuggestedPersona} onChange={(e) => setAiSuggestedPersona(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200 text-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Generated Task</label>
                    <AutoSizingTextarea value={aiSuggestedTask} onChange={(e) => setAiSuggestedTask(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200 text-sm"/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleOpenSaveTemplatesModal} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save to Library...</button>
                <button onClick={handleTryAgain} disabled={isRecommending} className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold disabled:opacity-50">
                  {isRecommending ? 'Trying...' : 'Try Again'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleAiGeneration} disabled={isRecommending || !recommendationGoal.trim()} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50">
              {isRecommending ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>

        {/* Composed Prompt Display Section */}
        {composedPrompt && (
          <div className="p-4 border rounded-lg bg-gray-900 border-gray-700 flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={handleClearPrompt} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white">Clear</button>
                <button onClick={() => setIsExecuteModalOpen(true)} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-600 hover:bg-green-700 text-white">Execute</button>
                <button onClick={handleCopy} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                <button onClick={handleOpenSaveModal} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save...</button>
              </div>
            </div>
            <AutoSizingTextarea
              className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow bg-gray-900 border-0 focus:ring-0 p-0 m-0 resize-none"
              value={composedPrompt}
              onChange={(e) => setComposedPrompt(e.target.value)}
            />
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onClick={() => handleSendToPage('/sandbox')} className="w-full py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">A/B Test</button>
                <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">Analyze</button>
                <button onClick={() => handleSendToPage('/benchmark')} className="w-full py-2 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Benchmark</button>
                <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 text-xs bg-rose-600 text-white rounded hover:bg-rose-700">Diagnose</button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Composer Section */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Manual Composer</h2>
          <p className="text-sm text-gray-400 mb-4">Build a prompt by selecting a Persona and Task from your Template Library.</p>
          <div className="space-y-4">
            <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Persona --</option>
              {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
            </select>
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Task --</option>
              {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
            </select>
            <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} placeholder="Additional instructions..."/>
          </div>
          <button onClick={handleComposeFromLibrary} disabled={loading || !selectedPersonaId || !selectedTaskId} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Composing...' : 'Compose from Library'}
          </button>
        </div>
      </div>

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
          <div className="space-y-4">
            <input type="text" placeholder="Prompt Name" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required disabled={isGeneratingDetails} />
            <textarea placeholder="Task Description" value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required disabled={isGeneratingDetails} />
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
            <button type="submit" disabled={isSavingPrompt || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{isSavingPrompt ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <QuickExecuteModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        promptText={composedPrompt}
        onSaveAsPrompt={handleSaveFromQuickExecute}
      />
      
      <Modal isOpen={isSaveTemplatesModalOpen} onClose={() => setIsSaveTemplatesModalOpen(false)} title="Save Generated Templates">
        <div className="space-y-6">
          <div className="p-4 bg-gray-700/50 rounded-lg">
              <label htmlFor="new-persona-name" className="block text-sm font-medium text-gray-300 mb-1">Persona Name</label>
              <div className="flex gap-2 items-center">
                  <input id="new-persona-name" type="text" value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} className="flex-grow border rounded p-2 text-black bg-gray-200" required />
                  <button type="button" onClick={() => handleSaveTemplate('persona')} disabled={isSavingPersona || personaSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${personaSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                      {isSavingPersona ? 'Saving...' : personaSaved ? 'Saved!' : 'Save'}
                  </button>
              </div>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
              <label htmlFor="new-task-name" className="block text-sm font-medium text-gray-300 mb-1">Task Name</label>
              <div className="flex gap-2 items-center">
                  <input id="new-task-name" type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-grow border rounded p-2 text-black bg-gray-200" required />
                  <button type="button" onClick={() => handleSaveTemplate('task')} disabled={isSavingTask || taskSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${taskSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                      {isSavingTask ? 'Saving...' : taskSaved ? 'Saved!' : 'Save'}
                  </button>
              </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setIsSaveTemplatesModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Close</button>
        </div>
      </Modal>
    </>
  );
};

export default PromptComposer;
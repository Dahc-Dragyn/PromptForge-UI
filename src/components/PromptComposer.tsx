// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PromptComposerProvider, usePromptComposer } from '@/context/PromptComposerContext';
import Modal from './Modal';
import QuickExecuteModal from './QuickExecuteModal';
import AutoSizingTextarea from './AutoSizingTextarea';
import toast from 'react-hot-toast';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;
const API_EXECUTE_URL = `${API_BASE_URL}/prompts/execute`;

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

interface PromptComposerViewProps {
  templates: Template[];
  onPromptSaved?: () => void;
}

const PromptComposerView = ({ templates, onPromptSaved }: PromptComposerViewProps) => {
  const { user } = useAuth();
  const {
    composedPrompt, setComposedPrompt,
    selectedPersonaId, setSelectedPersonaId,
    selectedTaskId, setSelectedTaskId,
    selectedStyle, setSelectedStyle,
    additionalInstructions, setAdditionalInstructions,
    loading,
    handleComposeFromLibrary, handleAiGeneration, handleSendToPage,
    handleClearPrompt,
    recommendationGoal, setRecommendationGoal,
    showSuggestionUI,
    aiSuggestedPersona, setAiSuggestedPersona,
    aiSuggestedTask, setAiSuggestedTask,
    handleTryAgain, isRecommending, isGeneratingForSandbox
  } = usePromptComposer();

  const [copyText, setCopyText] = useState('Copy');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(composedPrompt).then(() => {
      setCopyText('Copied!');
      toast.success('Prompt copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    });
  };

  const handleOpenSaveModal = async () => {
    setIsSaveModalOpen(true);
    setNewPromptName('');
    setNewPromptDescription('');
    setIsGeneratingDetails(true);
    try {
      const nameMetaPrompt = `Based on the prompt, generate a 3-5 word title. No quotes. Prompt: "${composedPrompt}"`;
      const descMetaPrompt = `Based on the prompt, generate a one-sentence description. Prompt: "${composedPrompt}"`;
      const [nameRes, descRes] = await Promise.all([
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
        fetch(API_EXECUTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: descMetaPrompt }) })
      ]);
      const nameData = await nameRes.json();
      const descData = await descRes.json();
      setNewPromptName(nameData.generated_text.trim().replace(/"/g, ''));
      setNewPromptDescription(descData.generated_text.trim());
    } catch (err) {
      toast.error("Failed to generate details.");
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPrompt(true);
    try {
      const docRef = await addDoc(collection(db, 'prompts'), {
        name: newPromptName,
        task_description: newPromptDescription,
        userId: user.uid,
        isArchived: false,
        created_at: serverTimestamp(),
      });
      await fetch(`${API_BASE_URL}/prompts/${docRef.id}/versions`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_text: composedPrompt, commit_message: "Initial version" }),
      });
      toast.success(`Prompt "${newPromptName}" saved!`);
      if (onPromptSaved) onPromptSaved();
      setIsSaveModalOpen(false);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSavingPrompt(false);
    }
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
        tags: [type, 'ai-generated'],
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

  const isComposeDisabled = loading || !selectedPersonaId || !selectedTaskId;

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full">
        <div className="p-4 border border-dashed border-sky-400/50 rounded-lg mb-6">
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
            <button onClick={handleAiGeneration} disabled={isRecommending || !recommendationGoal} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50">
              {isRecommending ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>

        {composedPrompt && (
          <div className="mb-6 p-6 border rounded-lg bg-gray-900 border-gray-700 flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={handleClearPrompt} className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 text-white">Clear</button>
                <button onClick={() => setIsExecuteModalOpen(true)} className="px-4 py-2 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Quick Execute</button>
                <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                <button onClick={handleOpenSaveModal} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save as Prompt...</button>
              </div>
            </div>
            <AutoSizingTextarea
              className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-hidden bg-gray-900 border-0 focus:ring-0 p-0 m-0 resize-none"
              value={composedPrompt}
              onChange={(e) => setComposedPrompt(e.target.value)}
            />
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button onClick={() => handleSendToPage('/sandbox', 'ab_test')} disabled={isGeneratingForSandbox} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
                  {isGeneratingForSandbox ? 'Generating...' : 'A/B Test'}
                </button>
                <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Analyze</button>
                <button onClick={() => handleSendToPage('/analyze', 'optimize')} className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Optimize</button>
                <button onClick={() => handleSendToPage('/clinic')} className="w-full py-2 bg-rose-600 text-white rounded hover:bg-rose-700">Run Clinic</button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-2">Manual Composer</h2>
          <p className="text-sm text-gray-400 mb-4">Build a prompt by selecting a Persona and Task from your Template Library below.</p>
          <div className="space-y-4">
            <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Persona --</option>
              {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
            </select>
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Task --</option>
              {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
            </select>
            <div>
              <label className="block text-sm font-medium mb-1">Select Style (Optional)</label>
              <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
                <option value="">-- No Specific Style --</option>
                {STYLE_OPTIONS.map(style => <option key={style} value={style}>{style}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Additional Instructions</label>
              <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3}/>
            </div>
          </div>
          <button onClick={() => handleComposeFromLibrary(templates, personaOptions, taskOptions)} disabled={isComposeDisabled} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
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

interface PromptComposerProps {
  templates: Template[];
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

const PromptComposer = ({ initialPrompt, ...props }: PromptComposerProps) => (
  <PromptComposerProvider initialPromptValue={initialPrompt}>
    <PromptComposerView {...props} />
  </PromptComposerProvider>
);

export default PromptComposer;
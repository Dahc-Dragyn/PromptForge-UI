// src/components/PromptComposer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import QuickExecuteModal from './QuickExecuteModal';

const API_COMPOSE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/compose`;
const API_PROMPTS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/`;
const API_EXECUTE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/execute`;

const STYLE_OPTIONS = [
  "professional", "humorous", "academic", "Direct Instruction", "Scenario-Based",
  "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
  "Creative Writing", "Role-Playing", "Explanatory", "Debate",
  "Summarization", "Instructional", "Reflective", "Predictive",
  "Analytical", "Interactive Dialogue"
];

interface PromptComposerProps {
  templates: any[];
  onPromptSaved?: () => void;
  initialPrompt?: string; 
}

// This helper function remains the same
const findPrimaryTag = (template: any, category: string) => {
  if (!template || !template.tags) return '';
  return template.tags.find((tag: string) => tag !== category) || template.name;
};

const PromptComposer = ({ templates, onPromptSaved, initialPrompt = '' }: PromptComposerProps) => {
  const router = useRouter();
  // FIX: State will now hold the template ID, not the tag value
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [composedPrompt, setComposedPrompt] = useState(initialPrompt);
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

  useEffect(() => {
    if (composedPrompt !== initialPrompt) {
        const params = new URLSearchParams(window.location.search);
        if (composedPrompt) {
            params.set('prompt', composedPrompt);
        } else {
            params.delete('prompt');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  }, [composedPrompt, initialPrompt, router]);

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

  // FIX: Dropdown options now include the unique ID
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

  // FIX: This function now looks up the tagValue from the selected ID
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
      const response = await fetch(API_COMPOSE_URL, {
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

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrompt(true);
    setError(null);
    try {
      const response = await fetch(API_PROMPTS_URL, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPromptName,
          task_description: newPromptDescription,
          initial_prompt_text: composedPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save prompt via API.');
      }

      if (onPromptSaved) onPromptSaved();
      
      setIsSavePromptModalOpen(false);
      setNewPromptName('');
      setNewPromptDescription('');

    } catch (err: any) {
      setError(`Failed to save the new prompt: ${err.message}`);
      console.error(err);
    } finally {
      setIsSavingPrompt(false);
    }
  };
  
  const handleSavePersonaTemplate = async () => {
    setIsSavingPersona(true);
    setError(null);
    try {
        const personaTemplate = { name: newPersonaName, description: `AI-generated persona for goal: ${recommendationGoal}`, content: aiSuggestedPersona, tags: ['persona', 'ai-generated'], created_at: serverTimestamp() };
        await addDoc(collection(db, 'prompt_templates'), personaTemplate);
        setPersonaSaved(true);
    } catch (err) {
        setError('Failed to save Persona template.');
        console.error(err);
    } finally {
        setIsSavingPersona(false);
    }
  };

  const handleSaveTaskTemplate = async () => {
    setIsSavingTask(true);
    setError(null);
    try {
        const taskTemplate = { name: newTaskName, description: `AI-generated task for goal: ${recommendationGoal}`, content: aiSuggestedTask, tags: ['task', 'ai-generated'], created_at: serverTimestamp() };
        await addDoc(collection(db, 'prompt_templates'), taskTemplate);
        setTaskSaved(true);
    } catch (err) {
        setError('Failed to save Task template.');
        console.error(err);
    } finally {
        setIsSavingTask(false);
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
    setLoading(true);
    try {
      const personaMetaPrompt = `Based on the user's goal, generate a single paragraph describing a suitable "persona" for an AI assistant. The goal is: "${recommendationGoal}"`;
      const taskMetaPrompt = `Based on the user's goal, generate a single paragraph describing the specific "task" for an AI assistant to perform. The goal is: "${recommendationGoal}"`;
      const nameMetaPrompt = `Based on the user's goal, generate a short, descriptive, 3-5 word title for a prompt template. Do not use quotes. The goal is: "${recommendationGoal}"`;

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRecommending(false);
      setLoading(false);
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
  
  const handleSendToPage = (path: string, tool?: string) => {
    const encodedPrompt = encodeURIComponent(composedPrompt);
    let url = `${path}?prompt=${encodedPrompt}`;
    if (tool) url += `&tool=${tool}`;
    router.push(url);
  };
  
  const handleSaveFromQuickExecute = (promptContent: string) => {
    setIsExecuteModalOpen(false);
    setComposedPrompt(promptContent);
    setIsSavePromptModalOpen(true);
  };

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full">
        {/* ... AI Assistant Section (no changes here) ... */}
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

        <h2 className="text-2xl font-bold mb-4">Manual Composer</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium mb-1">Select Persona</label>
            {/* FIX: Use selectedPersonaId and option.id for value and key */}
            <select id="persona-select" value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Persona --</option>
              {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-select" className="block text-sm font-medium mb-1">Select Task</label>
            {/* FIX: Use selectedTaskId and option.id for value and key */}
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
        
        {composedPrompt && (
            <div className="mt-4 p-6 border rounded-lg bg-gray-900 border-gray-700 relative flex-grow flex flex-col">
              {/* ... Display and Next Steps sections (no changes here) ... */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => setIsExecuteModalOpen(true)} className="px-4 py-2 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Quick Execute</button>
                  <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-emerald-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                  <button onClick={() => setIsSavePromptModalOpen(true)} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save as Prompt...</button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-auto">{composedPrompt}</pre>
              <div className="mt-4 pt-4 border-t border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Next Steps:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <button onClick={() => handleSendToPage('/sandbox')} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold">A/B Test</button>
                      <button onClick={() => handleSendToPage('/analyze')} className="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-semibold">Analyze</button>
                      <button onClick={() => handleSendToPage('/analyze', 'optimize')} className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-semibold">Optimize</button>
                      <button onClick={() => router.push(`/clinic?prompt=${encodeURIComponent(composedPrompt)}`)} className="w-full py-2 bg-rose-600 text-white rounded hover:bg-rose-700 text-sm font-semibold">Run Clinic</button>
                  </div>
              </div>
            </div>
        )}
      </div>
      
      {/* ... All Modals (no changes here) ... */}
      <Modal isOpen={isSavePromptModalOpen} onClose={() => setIsSavePromptModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
          {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
          <div className="space-y-4">
            <div>
              <label htmlFor="new-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
              <input id="new-prompt-name" type="text" value={newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required />
            </div>
            <div>
              <label htmlFor="new-prompt-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
              <textarea id="new-prompt-desc" value={newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={() => setIsSavePromptModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
            <button type="submit" disabled={isSavingPrompt} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSavingPrompt ? 'Saving...' : 'Save Prompt'}</button>
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
                    <button type="button" onClick={handleSavePersonaTemplate} disabled={isSavingPersona || personaSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${personaSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
                        {isSavingPersona ? 'Saving...' : personaSaved ? 'Saved!' : 'Save'}
                    </button>
                </div>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
                <label htmlFor="new-task-name" className="block text-sm font-medium text-gray-300 mb-1">Task Template Name</label>
                <div className="flex gap-2 items-center">
                    <input id="new-task-name" type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-grow border rounded p-2 text-black bg-gray-200" required />
                    <button type="button" onClick={handleSaveTaskTemplate} disabled={isSavingTask || taskSaved} className={`px-4 py-2 text-white rounded w-28 transition-colors ${taskSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}>
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
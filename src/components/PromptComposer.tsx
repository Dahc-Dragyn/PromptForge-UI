'use client';

import { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import CopyableOutput from './CopyableOutput';

const API_COMPOSE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/compose`;
const API_PROMPTS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/`;
const API_RECOMMEND_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/recommend`;

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
}

const findPrimaryTag = (template: any, category: string) => {
  return template.tags.find((tag: string) => tag !== category) || template.name;
};

const PromptComposer = ({ templates, onPromptSaved }: PromptComposerProps) => {
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [composedPrompt, setComposedPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyText, setCopyText] = useState('Copy');

  const [recommendationGoal, setRecommendationGoal] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
  const [aiSuggestedTask, setAiSuggestedTask] = useState('');
  const [showSuggestionUI, setShowSuggestionUI] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedStyle) {
      setAdditionalInstructions(prev => {
        const cleanedInstructions = prev.split('\n').filter(line => !line.startsWith("Style Instruction:")).join('\n');
        const newInstruction = `Style Instruction: The tone and format of the response should be ${selectedStyle}.`;
        return cleanedInstructions ? `${cleanedInstructions.trim()}\n${newInstruction}` : newInstruction;
      });
    }
  }, [selectedStyle]);

  const personaOptions = useMemo(() =>
    templates.filter(t => t.tags.includes('persona')).map(t => ({ displayName: t.name, tagValue: findPrimaryTag(t, 'persona') })), [templates]
  );
  const taskOptions = useMemo(() =>
    templates.filter(t => t.tags.includes('task')).map(t => ({ displayName: t.name, tagValue: findPrimaryTag(t, 'task') })), [templates]
  );

  const handleCompose = async () => {
    setLoading(true);
    setError(null);
    setComposedPrompt('');
    try {
      const response = await fetch(API_COMPOSE_URL, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: selectedPersona, task: selectedTask }),
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
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(API_PROMPTS_URL, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          task_description: newDescription,
          initial_prompt_text: composedPrompt,
        }),
      });
      if (!response.ok) throw new Error('Failed to save the new prompt.');
      if (onPromptSaved) onPromptSaved();
      setIsSaveModalOpen(false);
      setNewName('');
      setNewDescription('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(composedPrompt).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    });
  };

  const handleGetRecommendations = async () => {
    setIsRecommending(true);
    setError(null);
    setShowSuggestionUI(false);
    setComposedPrompt(''); // Clear previous composed prompt
    try {
      const response = await fetch(API_RECOMMEND_URL, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_description: recommendationGoal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to get recommendations.');

      const recommendedPersona = data.recommended_persona_tag || '';
      const recommendedTask = data.recommended_task_tag || '';
      
      setAiSuggestedPersona(recommendedPersona);
      setAiSuggestedTask(recommendedTask);
      setSelectedPersona(recommendedPersona);
      setSelectedTask(recommendedTask);
      setShowSuggestionUI(true);

      // --- NEW: Call handleCompose here after setting the state ---
      if (recommendedPersona && recommendedTask) {
        handleCompose();
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRecommending(false);
    }
  };

  const handleTryAgain = () => {
    setShowSuggestionUI(false);
    setAiSuggestedPersona('');
    setAiSuggestedTask('');
    setRecommendationGoal('');
    setSelectedPersona('');
    setSelectedTask('');
    setComposedPrompt(''); // Clear composed prompt on reset
  };

  const handleEdit = () => {
    setShowSuggestionUI(false);
    setComposedPrompt(''); // Clear composed prompt to allow user to manually compose a new one
  };

  const handleSaveFromSuggestions = () => {
    setIsSaveModalOpen(true);
  };

  const isComposeDisabled = loading || !selectedPersona || !selectedTask;

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full">
        {/* --- AI Assistant Section --- */}
        <div className="p-4 border border-dashed border-sky-400/50 rounded-lg mb-6">
          <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
          <p className="text-sm text-gray-400 mb-2">Describe your goal and let the AI suggest templates for you.</p>
          <textarea
            value={recommendationGoal}
            onChange={(e) => setRecommendationGoal(e.target.value)}
            className="w-full border rounded p-2 text-black bg-gray-200"
            rows={2}
            placeholder="e.g., Write a witty social media post about a new product..."
          />
          {showSuggestionUI ? (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-white font-medium mb-2">Suggestions Applied:</p>
              <p className="text-gray-300 text-sm">
                <span className="font-semibold">Persona:</span> {aiSuggestedPersona}<br/>
                <span className="font-semibold">Task:</span> {aiSuggestedTask}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveFromSuggestions}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={handleTryAgain}
                  className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGetRecommendations}
              disabled={isRecommending || !recommendationGoal}
              className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 font-semibold"
            >
              {isRecommending ? 'Thinking...' : 'Get Suggestions'}
            </button>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-4">Prompt Composer</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium mb-1">Select Persona</label>
            <select id="persona-select" value={selectedPersona} onChange={(e) => setSelectedPersona(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Persona --</option>
              {personaOptions.map(opt => <option key={opt.tagValue} value={opt.tagValue}>{opt.displayName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-select" className="block text-sm font-medium mb-1">Select Task</label>
            <select id="task-select" value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200">
              <option value="">-- Choose a Task --</option>
              {taskOptions.map(opt => <option key={opt.tagValue} value={opt.tagValue}>{opt.displayName}</option>)}
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
          onClick={handleCompose}
          disabled={isComposeDisabled}
          className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Composing...' : 'Compose Prompt'}
        </button>
        
        {isComposeDisabled && !loading && (
          <p className="text-xs text-gray-400 mt-2 text-center">Please select a Persona and a Task to enable composing.</p>
        )}

        {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
        
        {composedPrompt && (
          <div className="mt-4 p-6 border rounded-lg bg-gray-900 border-gray-700 relative flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Composed Prompt</h3>
              <div className="flex gap-2">
                <button onClick={handleCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button>
                <button onClick={() => setIsSaveModalOpen(true)} className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save...</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-gray-200 text-sm font-sans flex-grow overflow-y-auto">{composedPrompt}</pre>
          </div>
        )}
      </div>

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
              <input id="new-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required />
            </div>
            <div>
              <label htmlFor="new-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
              <textarea id="new-desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSaving ? 'Saving...' : 'Save Prompt'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default PromptComposer;
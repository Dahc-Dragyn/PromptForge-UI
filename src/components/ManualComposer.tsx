// src/components/ManualComposer.tsx
'use client';

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Template } from './PromptComposer';

// --- MOCKED API Client (should be imported from a shared lib) ---
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
// ---

const STYLE_OPTIONS = [
  "professional", "humorous", "academic", "Direct Instruction", "Scenario-Based",
  "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
  "Creative Writing", "Role-Playing", "Explanatory", "Debate",
  "Summarization", "Instructional", "Reflective", "Predictive",
  "Analytical", "Interactive Dialogue"
];

const findPrimaryTag = (template: Template) => {
    return template.tags.find(tag => tag !== 'persona' && tag !== 'task') || template.name;
};

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

export default ManualComposer;


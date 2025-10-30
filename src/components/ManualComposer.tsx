'use client';

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Template } from './PromptComposer';
// import { apiClient } from '@/lib/apiClient'; // No longer needed!

// --- CONSTANTS & HELPERS ---
const STYLE_OPTIONS = [
  "Professional", "Humorous", "Academic", "Direct Instruction", "Scenario-Based",
  "Hypothetical Questions", "Comparative Analysis", "Problem-Solving",
  "Creative Writing", "Role-Playing", "Explanatory", "Debate",
  "Summarization", "Instructional", "Reflective", "Predictive",
  "Analytical", "Interactive Dialogue"
];

// --- TYPE DEFINITIONS ---
interface ManualComposerProps {
    templates: Template[];
    onCompose: (prompt: string) => void;
}

// =================================================================================
// --- COMPONENT DEFINITION ---
// =================================================================================
const ManualComposer: React.FC<ManualComposerProps> = ({ templates = [], onCompose }) => {
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [userInstructions, setUserInstructions] = useState('');
    const [loading, setLoading] = useState(false);

    const personaOptions = useMemo(() =>
        templates.filter(t => t.tags.includes('persona')).map(t => ({
            id: t.id,
            displayName: t.name
        })), [templates]);

    const taskOptions = useMemo(() =>
        templates.filter(t => t.tags.includes('task')).map(t => ({
            id: t.id,
            displayName: t.name
        })), [templates]);
    
    const additionalInstructions = useMemo(() => {
        const styleInstruction = selectedStyle ? `Style Instruction: The tone and format should be ${selectedStyle}.` : '';
        return [userInstructions, styleInstruction].filter(Boolean).join('\n');
    }, [selectedStyle, userInstructions]);

    // This is our new, correct, local-only composition logic
    const handleComposeFromLibrary = () => {
        if (!selectedPersonaId || !selectedTaskId) return;

        setLoading(true);
        const toastId = toast.loading('Composing from library...');

        try {
            const personaTemplate = templates.find(t => t.id === selectedPersonaId);
            const taskTemplate = templates.find(t => t.id === selectedTaskId);

            if (!personaTemplate || !taskTemplate) {
                toast.error("Selected template not found. It may have been updated.", { id: toastId });
                setSelectedPersonaId('');
                setSelectedTaskId('');
                setLoading(false);
                return;
            }

            const personaContent = personaTemplate.content;
            const taskContent = taskTemplate.content;

            let finalPrompt = `${personaContent}\n\n${taskContent}`;
            if (additionalInstructions.trim()) {
                finalPrompt += `\n\n${additionalInstructions.trim()}`;
            }

            onCompose(finalPrompt);
            toast.success('Prompt composed!', { id: toastId });

        } catch (err: unknown) {
            toast.error((err instanceof Error ? err.message : 'Failed to compose prompt.'), { id: toastId });
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 250); 
        }
    };

    return (
        <div className="p-4 border border-indigo-400/30 rounded-lg mt-6">
            <h3 className="font-semibold text-lg mb-2 text-indigo-300">Manual Composer</h3>
              <p className="text-sm text-gray-400 mb-4">Combine pre-existing templates from your library.</p>
            <div className="space-y-4">
                <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">-- Choose a Persona --</option>
                    {personaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
                </select>
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">-- Choose a Task --</option>
                    {taskOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.displayName}</option>)}
                </select>
                <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">-- No Specific Style --</option>
                    {STYLE_OPTIONS.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
                <textarea value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)} className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Additional instructions..." rows={3} />
            </div>
            <button onClick={handleComposeFromLibrary} disabled={loading || !selectedPersonaId || !selectedTaskId} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                {loading ? 'Composing...' : 'Compose from Library'}
            </button>
            
            {/* --- UI FIX --- */}
            {/* Added this helper text to guide the user. */}
            <p className="text-xs text-center text-gray-400/80 mt-2">
                Your composed prompt will appear in the "Composed Prompt" box above.
            </p>
            {/* --- END UI FIX --- */}
            
        </div>
    );
}

export default ManualComposer;
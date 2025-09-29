// src/components/SaveTemplatesModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import Modal from './Modal';

// --- SaveTemplatesModal COMPONENT ---
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
    // CORRECTED: Removed `mutate` from destructuring
    const { createTemplate } = usePromptTemplates();

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
                // CORRECTED: Removed the call to `mutateTemplates()` as it's handled by the hook
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

export default SaveTemplatesModal;
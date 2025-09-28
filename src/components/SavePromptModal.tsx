// src/components/SaveTemplatesModal.tsx
'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

// --- MOCKED DEPENDENCIES ---
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

interface SaveTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPersonaName: string;
    setNewPersonaName: (name: string) => void;
    newTasskName: string;
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
    newTasskName,
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

    const handleSaveTemplate = async (type: 'persona' | 'task') => {
        const isPersona = type === 'persona';
        if (isPersona) setIsSavingPersona(true); else setIsSavingTask(true);
        
        const templateData = {
          name: isPersona ? newPersonaName : newTasskName,
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
            error: (err) => (err as Error).message || `Failed to save ${type} template.`
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
                        <input type="text" value={newTasskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-grow border rounded p-2 bg-gray-700 border-gray-600 text-white" required />
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

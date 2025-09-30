// src/components/SavePromptModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePrompts } from '@/hooks/usePrompts';
import { apiClient } from '@/lib/apiClient';
import Modal from './Modal';
import { AI_MODEL } from './AiAssistant';

interface SavePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onPromptSaved?: () => void;
}

const SavePromptModal: React.FC<SavePromptModalProps> = ({ isOpen, onClose, promptText, onPromptSaved }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { createPrompt } = usePrompts();

    useEffect(() => {
        if (isOpen && promptText) {
            const generateDetails = async () => {
                setIsGenerating(true);
                try {
                    const namePromise = apiClient.post<{ final_text: string }>('/prompts/execute', {
                        prompt_text: `Generate a concise, 3-5 word title for the following prompt. Output only the title, with no quotes:\n\n${promptText}`,
                        model: AI_MODEL,
                    });
                    const descPromise = apiClient.post<{ final_text: string }>('/prompts/execute', {
                        prompt_text: `Generate a one-sentence description for the following prompt:\n\n${promptText}`,
                        model: AI_MODEL,
                    });

                    const [nameRes, descRes] = await Promise.all([namePromise, descPromise]);
                    setName(nameRes.final_text.trim().replace(/"/g, ''));
                    setDescription(descRes.final_text.trim());
                } catch (error) {
                    toast.error('Could not generate prompt details.');
                } finally {
                    setIsGenerating(false);
                }
            };
            generateDetails();
        } else {
            setName('');
            setDescription('');
        }
    }, [isOpen, promptText]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const promise = createPrompt({
                name,
                description: description,
                text: promptText,
            });

            await toast.promise(promise, {
                loading: 'Saving new prompt...',
                success: (newPrompt) => {
                    if (onPromptSaved) onPromptSaved();
                    onClose();
                    return 'Prompt saved successfully!';
                },
                error: (err) => err.message || 'Failed to save prompt.',
            });
        } catch (error) {
            // This catch is a fallback, but toast.promise handles most UI errors.
            console.error("Save prompt failed:", error);
        } finally {
            // --- FIX: This ensures the button is re-enabled even if the promise fails ---
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save New Prompt">
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="promptName" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                        <input
                            id="promptName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                            placeholder={isGenerating ? "Generating name..." : "e.g., Professional Email Template"}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="promptDescription" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                            id="promptDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                            placeholder={isGenerating ? "Generating description..." : "A brief summary of what this prompt does."}
                        />
                    </div>
                     <div className="p-3 bg-gray-900/50 rounded-md">
                        <p className="text-sm font-medium text-gray-400 mb-1">Prompt Content:</p>
                        <p className="text-sm text-gray-200 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">{promptText}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSaving || isGenerating || !name} className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Prompt'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- FIX: Export as a named export for consistency ---
export { SavePromptModal };
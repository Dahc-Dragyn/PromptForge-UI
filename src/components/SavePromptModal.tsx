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
        if (isOpen && promptText && !name && !description) {
            const generateDetails = async () => {
                setIsGenerating(true);
                try {
                    const namePayload = {
                        prompt_text: `Generate a concise, 3-5 word title for the following prompt. Output only the title, with no quotes:\n\n${promptText}`,
                        model: AI_MODEL,
                        variables: {} 
                    };
                    const descPayload = {
                        prompt_text: `Generate a one-sentence description for the following prompt:\n\n${promptText}`,
                        model: AI_MODEL,
                        variables: {}
                    };

                    // *** THIS IS THE FIX ***
                    // We explicitly tell TypeScript that the *return type* (R) is the same as the *data type* (T)
                    // because the interceptor in apiClient.ts unwraps the response.
                    // apiClient.post<T = { final_text: string }, R = { final_text: string }>(...)
                    const namePromise = apiClient.post<{ final_text: string }, { final_text: string }>('/prompts/execute', namePayload);
                    const descPromise = apiClient.post<{ final_text: string }, { final_text: string }>('/prompts/execute', descPayload);

                    const [nameRes, descRes] = await Promise.all([namePromise, descPromise]);

                    // Now, 'nameRes' is correctly typed as { final_text: string }
                    // and this line is valid for both TypeScript and the runtime.
                    const generatedName = nameRes.final_text?.trim().replace(/"/g, '') || '';
                    const generatedDesc = descRes.final_text?.trim() || '';

                    if (generatedName) setName(generatedName);
                    if (generatedDesc) setDescription(generatedDesc);

                } catch (error: any) {
                    console.error("Failed to generate prompt details:", error);
                    if (error.response?.status === 422) {
                         toast.error('Failed to generate details: Invalid data sent to AI.');
                    } else {
                         toast.error('Could not generate prompt details via AI.');
                    }
                } finally {
                    setIsGenerating(false);
                }
            };
            generateDetails();
        } else if (!isOpen) {
            // Reset state when modal closes
            setName('');
            setDescription('');
            setIsSaving(false);
            setIsGenerating(false);
        }
    }, [isOpen, promptText, name, description]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !promptText) {
             toast.error('Prompt Name and Content are required.');
             return;
        }

        setIsSaving(true);

        try {
            // This works because usePrompts.ts was fixed to send the correct payload
            const promise = createPrompt({
                name: name,
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
                error: (err: any) => {
                    if (err.response?.status === 422) {
                        console.error("Save failed (422): ", err.response.data);
                        const errorMsg = err.response.data.detail?.[0]?.msg || 'Validation Error';
                        const errorField = err.response.data.detail?.[0]?.loc?.[1] || 'field';
                        return `Save failed: ${errorField} - ${errorMsg}`;
                    }
                    return err.message || 'Failed to save prompt.';
                }
            });
        } catch (error) {
            console.error("Save prompt failed unexpectedly:", error);
        } finally {
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
                            disabled={isGenerating}
                        />
                    </div>
                    <div>
                        <label htmlFor="promptDescription" className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
                        <textarea
                            id="promptDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                            placeholder={isGenerating ? "Generating description..." : "A brief summary of what this prompt does."}
                            disabled={isGenerating}
                        />
                    </div>
                     <div className="p-3 bg-gray-900/50 rounded-md">
                        <p className="text-sm font-medium text-gray-400 mb-1">Prompt Content:</p>
                        <p className="text-sm text-gray-200 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">{promptText}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={isSaving} className="py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSaving || isGenerating || !name} className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Prompt'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export { SavePromptModal };
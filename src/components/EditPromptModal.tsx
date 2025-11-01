'use client';

import { useState, useEffect } from 'react';
import { Prompt } from '@/types/prompt';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import toast from 'react-hot-toast';
import Modal from './Modal';
// This is the correct default import, fixing ts(2614)
import AutoSizingTextarea from '@/components/AutoSizingTextarea'; 

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt;
  latestVersionText: string | null | undefined;
}

export const EditPromptModal = ({
  isOpen,
  onClose,
  prompt,
  latestVersionText,
}: EditPromptModalProps) => {
  // Form state
  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.task_description);
  const [promptText, setPromptText] = useState(latestVersionText || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks for API calls
  const { updatePrompt } = usePrompts();
  const { createVersion } = usePromptVersions(prompt.id);

  // Effect to re-populate form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setName(prompt.name);
      setDescription(prompt.task_description);
      setPromptText(latestVersionText || '');
      setCommitMessage(''); // Always reset commit message
    }
  }, [isOpen, prompt, latestVersionText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const metadataChanged =
      name !== prompt.name || description !== prompt.task_description;
    const textChanged = promptText !== (latestVersionText || '');

    if (!metadataChanged && !textChanged) {
      toast.success('No changes detected.');
      setIsSubmitting(false);
      onClose();
      return;
    }

    // This promise will run all our API calls
    const savePromise = async () => {
      // Step 1: Update metadata if changed
      if (metadataChanged) {
        await updatePrompt(prompt.id, {
          name: name,
          task_description: description,
        });
      }

      // Step 2: Create new version if text changed
      if (textChanged) {
        // This is the logic from the old NewVersionForm
        // This line WILL STILL SHOW an error until we fix the next file
        await createVersion({
          prompt_text: promptText,
          commit_message: commitMessage || 'Updated via UI Edit',
        });
      }
    };

    toast.promise(savePromise(), {
      loading: 'Saving changes...',
      success: () => {
        setIsSubmitting(false);
        onClose();
        return 'Prompt updated successfully!';
      },
      error: (err) => {
        setIsSubmitting(false);
        
        // This will parse the 422 error from your logs
        let apiError = 'Failed to update prompt.';
        if (err.response?.data?.detail) {
            try {
                const details = err.response.data.detail;
                if (Array.isArray(details) && details[0]?.msg) {
                    apiError = `${details[0].loc[1]}: ${details[0].msg}`;
                }
            } catch (parseErr) {
                apiError = err.message;
            }
        } else {
            apiError = err.message;
        }
        return apiError;
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Prompt">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="edit-prompt-name"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Name
          </label>
          <input
            id="edit-prompt-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2 bg-gray-100 text-black focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="edit-prompt-description"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Task Description
          </label>
          <textarea
            id="edit-prompt-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded p-2 bg-gray-100 text-black focus:ring-2 focus:ring-indigo-500"
            rows={3}
            required
          />
        </div>
        <div>
          <label
            htmlFor="edit-prompt-text"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Prompt Text (Editing this will create a new version)
          </label>
          <AutoSizingTextarea
            id="edit-prompt-text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full border rounded p-2 bg-gray-100 text-black font-mono text-sm focus:ring-2 focus:ring-indigo-500"
            // --- FIX ---
            // Removed `minRows={6}` to fix ts(2322)
          />
        </div>
        <div>
          <label
            htmlFor="edit-prompt-commit"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Commit Message (Required if text is changed)
          </label>
          <input
            id="edit-prompt-commit"
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="e.g., 'Refined instructions for clarity'"
            className="w-full border rounded p-2 bg-gray-100 text-black focus:ring-2 focus:ring-indigo-500"
            // Make required only if text has changed
            required={promptText !== (latestVersionText || '')}
          />
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 hover:bg-indigo-700"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
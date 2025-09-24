// src/components/NewVersionForm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

// The specific shape of the version object is handled by the parent hook,
// so we only need to define the data required for creation.
interface NewVersionData {
  prompt_text: string;
  commit_message: string;
}

interface NewVersionFormProps {
  promptId: string;
  // FIX: The prop now expects the 'createVersion' function from our hook.
  onVersionAdded: (data: NewVersionData) => Promise<any>;
}

const NewVersionForm = ({ promptId, onVersionAdded }: NewVersionFormProps) => {
  const [promptText, setPromptText] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const versionData = {
      prompt_text: promptText,
      commit_message: commitMessage,
    };

    // FIX: The form now calls the function passed from the parent,
    // which contains all the API logic. We wrap it in a toast promise
    // to provide user feedback.
    toast.promise(
      onVersionAdded(versionData),
      {
        loading: 'Creating new version...',
        success: (newVersion) => {
          // Clear the form on success
          setPromptText('');
          setCommitMessage('');
          return `Successfully created Version ${newVersion.version_number}!`;
        },
        error: 'Failed to create new version.',
      }
    ).finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white">Create a New Version</h3>
      <div>
        <label htmlFor="prompt-text" className="block text-sm font-medium mb-1 text-gray-300">New Prompt Text</label>
        <textarea
          id="prompt-text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="w-full border rounded p-2 bg-gray-900 text-gray-200 border-gray-600 font-mono"
          rows={8}
          required
        />
      </div>

      <div>
        <label htmlFor="commit-message" className="block text-sm font-medium mb-1 text-gray-300">Commit Message</label>
        <input
          id="commit-message"
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          className="w-full border rounded p-2 bg-gray-900 text-gray-200 border-gray-600"
          placeholder="e.g., Added more specific constraints"
          required
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !promptText || !commitMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors font-semibold"
        >
          {isSubmitting ? 'Saving...' : 'Save New Version'}
        </button>
      </div>
    </form>
  );
};

export default NewVersionForm;
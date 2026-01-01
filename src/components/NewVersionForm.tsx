// src/components/NewVersionForm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import AutoSizingTextarea from './AutoSizingTextarea';

interface NewVersionFormProps {
  promptId: string;
}

const NewVersionForm = ({ promptId }: NewVersionFormProps) => {
  const [promptText, setPromptText] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const { createVersion } = usePromptVersions(promptId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      toast.error('Prompt text cannot be empty.');
      return;
    }

    const promise = createVersion(promptText, commitMessage);

    toast.promise(promise, {
      loading: 'Creating new version...',
      success: 'New version created!',
      error: (err) => err.message || 'Failed to create new version.',
    });

    // Reset form on success
    promise.then(() => {
        setPromptText('');
        setCommitMessage('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-300 mb-1">
          New Prompt Text
        </label>
        <AutoSizingTextarea
          id="prompt-text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter the new version of the prompt here..."
          className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="commit-message" className="block text-sm font-medium text-gray-300 mb-1">
          Commit Message (Optional)
        </label>
        <input
          id="commit-message"
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="e.g., Added persona, clarified instructions"
          className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="text-right">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={!promptText.trim()}
        >
          Save New Version
        </button>
      </div>
    </form>
  );
};

export default NewVersionForm;
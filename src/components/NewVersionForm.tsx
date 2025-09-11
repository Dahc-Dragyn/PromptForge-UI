// src/components/NewVersionForm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface NewVersionFormProps {
  promptId: string;
  onVersionCreated: () => void;
}

const NewVersionForm = ({ promptId, onVersionCreated }: NewVersionFormProps) => {
  const [promptText, setPromptText] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const toastId = toast.loading('Creating new version...');

    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_text: promptText,
          commit_message: commitMessage || 'No commit message.', // Provide a default
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create new version.');
      }
      
      toast.success(`Successfully created Version ${data.version}!`, { id: toastId });
      onVersionCreated(); // Trigger the refresh on the parent page
      
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div>
        <label htmlFor="prompt-text" className="block text-sm font-medium mb-1 text-gray-300">New Prompt Text</label>
        <textarea 
          id="prompt-text" 
          value={promptText} 
          onChange={(e) => setPromptText(e.target.value)} 
          // --- FIX: Updated styling for dark mode ---
          className="w-full border rounded p-2 bg-gray-900 text-gray-200 border-gray-600 font-mono" 
          rows={10} 
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
          // --- FIX: Updated styling for dark mode ---
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
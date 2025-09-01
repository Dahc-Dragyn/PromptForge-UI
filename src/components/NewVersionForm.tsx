// src/components/NewVersionForm.tsx
'use client';

import { useState } from 'react';

interface NewVersionFormProps {
  promptId: string;
  onVersionCreated: () => void; // Callback to refresh the versions list
}

const NewVersionForm = ({ promptId, onVersionCreated }: NewVersionFormProps) => {
  const [promptText, setPromptText] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

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
          commit_message: commitMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create new version.');
      }
      
      setSuccess(`Successfully created Version ${data.version}!`);
      onVersionCreated(); // Trigger the refresh on the parent page
      
      // Reset form
      setPromptText('');
      setCommitMessage('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-gray-800 mb-8">
      <h2 className="text-2xl font-bold mb-4">Create a New Version</h2>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
      {success && <p className="text-green-500 mb-2 text-sm">{success}</p>}

      <div className="mb-4">
        <label htmlFor="prompt-text" className="block text-sm font-medium mb-1">New Prompt Text</label>
        <textarea 
          id="prompt-text" 
          value={promptText} 
          onChange={(e) => setPromptText(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200 font-mono" 
          rows={10} 
          required 
        />
      </div>

      <div className="mb-4">
        <label htmlFor="commit-message" className="block text-sm font-medium mb-1">Commit Message (Optional)</label>
        <input 
          id="commit-message" 
          type="text" 
          value={commitMessage} 
          onChange={(e) => setCommitMessage(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200"
          placeholder="e.g., Added more specific constraints"
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting || !promptText} 
        className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700 transition-colors"
      >
        {isSubmitting ? 'Saving...' : 'Save New Version'}
      </button>
    </form>
  );
};

export default NewVersionForm;
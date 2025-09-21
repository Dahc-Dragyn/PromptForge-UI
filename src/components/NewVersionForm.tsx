// src/components/NewVersionForm.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api'; // Import the helper

// Define the shape of a Version object
type Version = {
  id: string;
  version_number: number;
  prompt_text: string;
  commit_message: string;
  created_at: string;
};

interface NewVersionFormProps {
  promptId: string;
  // --- FIX: Renamed prop to be more descriptive and expect a Version object ---
  onVersionAdded: (newVersion: Version) => void;
}

const NewVersionForm = ({ promptId, onVersionAdded }: NewVersionFormProps) => {
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
      // --- FIX: Use authenticatedFetch for the API call ---
      const response = await authenticatedFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          prompt_text: promptText,
          commit_message: commitMessage || 'Initial commit.',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create new version.');
      }
      
      toast.success(`Successfully created Version ${data.version_number}!`, { id: toastId });
      onVersionAdded(data); // Pass the full new version object back to the parent
      setPromptText('');   // Clear the form
      setCommitMessage('');// Clear the form
      
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      {error && <p className="text-red-400 text-sm">{error}</p>}
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
// src/components/PromptForm.tsx
'use client';

import { useState } from 'react';

const API_URL = 'https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/prompts/';

const PromptForm = () => {
  const [name, setName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [initialPromptText, setInitialPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name,
      task_description: taskDescription,
      initial_prompt_text: initialPromptText,
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create prompt.');
      }
      
      setSuccess(`Prompt "${data.name}" created successfully!`);
      // Reset form
      setName('');
      setTaskDescription('');
      setInitialPromptText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-800">
      <h2 className="text-xl font-bold mb-4">Create New Prompt</h2>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
      {success && <p className="text-green-500 mb-2 text-sm">{success}</p>}

      <div className="mb-4">
        <label htmlFor="prompt-name" className="block text-sm font-medium mb-1">Name</label>
        <input id="prompt-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required />
      </div>
      <div className="mb-4">
        <label htmlFor="prompt-desc" className="block text-sm font-medium mb-1">Task Description</label>
        <textarea id="prompt-desc" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required></textarea>
      </div>
      <div className="mb-4">
        <label htmlFor="prompt-text" className="block text-sm font-medium mb-1">Initial Prompt Text (Version 1)</label>
        <textarea id="prompt-text" value={initialPromptText} onChange={(e) => setInitialPromptText(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={6} required></textarea>
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700 transition-colors">
        {isSubmitting ? 'Creating...' : 'Create Prompt'}
      </button>
    </form>
  );
};

export default PromptForm;
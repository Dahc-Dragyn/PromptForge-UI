// src/components/AITemplateGenerator.tsx
'use client';

import { useState } from 'react';

const AITemplateGenerator = () => {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!description) {
      setError('A description is required to generate a template.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      style_description: description,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      const response = await fetch('https://db4f-24-22-90-227.ngrok-free.app/api/promptforge/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate template.');
      }

      setSuccess(`Successfully generated and saved template: "${data.name}"`);
      // Reset form
      setDescription('');
      setTags('');

    } catch (err: any) {
      console.error("Error generating template via API:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">AI Template Generator</h2>
      <p className="text-sm text-gray-400 mb-4">Describe the template you want, and the AI will create it for you.</p>
      
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}

      <div className="mb-4">
        <label htmlFor="gen-description" className="block text-sm font-medium">
          Template Description
        </label>
        <textarea 
          id="gen-description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="w-full border rounded p-2 text-black" 
          rows={3}
          placeholder="e.g., A persona for a skeptical pirate"
        ></textarea>
      </div>
      
      <div className="mb-4">
        <label htmlFor="gen-tags" className="block text-sm font-medium">
          Tags (comma-separated)
        </label>
        <input 
          id="gen-tags" 
          type="text" 
          value={tags} 
          onChange={(e) => setTags(e.target.value)} 
          className="w-full border rounded p-2 text-black"
          placeholder="e.g., persona, pirate, fantasy"
        />
      </div>

      <button type="submit" disabled={isSubmitting || !description} className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50 hover:bg-indigo-600 transition-colors">
        {isSubmitting ? 'Generating...' : 'Generate Template'}
      </button>
    </form>
  );
};

export default AITemplateGenerator;
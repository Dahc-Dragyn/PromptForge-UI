// src/components/AITemplateGenerator.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';

const AITemplateGenerator = () => {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTemplate } = usePromptTemplates(); // Use the mutation function from the hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('A description is required to generate a template.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      // NOTE: The backend expects 'description' and 'content' for a new template.
      // We are using the user's description as the basis for both.
      // A more advanced implementation might generate content separately.
      name: `${description.substring(0, 25)}... (AI)`,
      description: `AI-generated template for: "${description}"`,
      content: description, // The backend can enhance this if needed, or we can pre-generate.
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    const promise = createTemplate(payload);

    toast.promise(promise, {
      loading: 'Generating template...',
      success: (newTemplate) => {
        // Reset form on success
        setDescription('');
        setTags('');
        return `Template "${newTemplate.name}" created!`;
      },
      error: (err) => err.message || 'Failed to generate template.',
    });
    
    // We handle the final state within the toast promise
    promise.finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-800">
      <h2 className="text-xl font-bold mb-4">AI-Assisted Template Creation</h2>
      <p className="text-sm text-gray-400 mb-4">Describe the template content, and the AI will create and save it for you.</p>

      <div className="mb-4">
        <label htmlFor="gen-description" className="block text-sm font-medium text-gray-300 mb-1">
          Template Description / Content
        </label>
        <textarea 
          id="gen-description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200" 
          rows={3}
          placeholder="e.g., A persona for a skeptical pirate who questions every command."
          required
        ></textarea>
      </div>
      
      <div className="mb-4">
        <label htmlFor="gen-tags" className="block text-sm font-medium text-gray-300 mb-1">
          Tags (comma-separated)
        </label>
        <input 
          id="gen-tags" 
          type="text" 
          value={tags} 
          onChange={(e) => setTags(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200"
          placeholder="e.g., persona, pirate, fantasy"
        />
      </div>

      <button type="submit" disabled={isSubmitting || !description} className="w-full mt-2 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 hover:bg-indigo-700 transition-colors">
        {isSubmitting ? 'Generating...' : 'Generate & Save Template'}
      </button>
    </form>
  );
};

export default AITemplateGenerator;
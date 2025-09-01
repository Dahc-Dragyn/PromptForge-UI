// src/components/TemplateForm.tsx
'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TemplateFormProps {
  onSuccess?: () => void;
}

const TemplateForm = ({ onSuccess }: TemplateFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- NEW: Function to add a tag to the input field ---
  const handleAddTag = (tagToAdd: string) => {
    // Prevent adding duplicate tags
    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
    if (currentTags.includes(tagToAdd)) {
      return;
    }
    // Add the new tag
    setTags(currentTags.length > 0 ? `${tags}, ${tagToAdd}` : tagToAdd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!name || !description || !content) {
      setError('Name, description, and content are required.');
      setIsSubmitting(false);
      return;
    }

    const newTemplate = {
      name,
      description,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      created_at: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'prompt_templates'), newTemplate);
      setSuccess('Template added successfully!');
      setName('');
      setDescription('');
      setContent('');
      setTags('');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          setSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error("Error adding document: ", err);
      setError('Failed to add template. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Create New Template</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" />
      </div>
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={2}></textarea>
      </div>
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">Content</label>
        <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={5}></textarea>
      </div>
      <div className="mb-4">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
        <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" />
        
        {/* --- NEW: Helper buttons and instructions --- */}
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">
            To use this template in the Prompt Composer, add a tag:
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => handleAddTag('persona')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
              + Add 'persona' Tag
            </button>
            <button type="button" onClick={() => handleAddTag('task')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
              + Add 'task' Tag
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">
          {isSubmitting ? 'Adding...' : 'Add Template'}
        </button>
      </div>
    </form>
  );
};

export default TemplateForm;
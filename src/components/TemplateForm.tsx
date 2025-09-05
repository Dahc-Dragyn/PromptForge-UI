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
  const [templateType, setTemplateType] = useState('general'); 
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    
    const descriptiveTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const finalTags = [...descriptiveTags];
    if (templateType === 'persona' || templateType === 'task') {
      if (!finalTags.includes(templateType)) {
        finalTags.push(templateType);
      }
    }

    const newTemplate = {
      name,
      description,
      content,
      tags: finalTags,
      created_at: serverTimestamp(),
      // --- FIX: Ensure all new templates have the isArchived field ---
      isArchived: false,
    };

    try {
      await addDoc(collection(db, 'prompt_templates'), newTemplate);
      setSuccess('Template added successfully!');
      // Reset form
      setName('');
      setDescription('');
      setContent('');
      setTags('');
      setTemplateType('general');
      
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
        <label htmlFor="template-type" className="block text-sm font-medium text-gray-300 mb-1">Template Type</label>
        <select 
          id="template-type" 
          value={templateType} 
          onChange={(e) => setTemplateType(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200"
        >
          <option value="general">General Component</option>
          <option value="persona">Persona (for Prompt Composer)</option>
          <option value="task">Task (for Prompt Composer)</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">Select 'Persona' or 'Task' to use this in the Prompt Composer.</p>
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
        <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">Descriptive Tags (comma-separated)</label>
        <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" placeholder="e.g., email, marketing, code-gen"/>
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
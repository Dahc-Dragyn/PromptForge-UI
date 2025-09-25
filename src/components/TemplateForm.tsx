// src/components/TemplateForm.tsx
'use client';

import { useState } from 'react';
import { useTemplateMutations } from '@/hooks/usePromptTemplates';
import { PromptTemplate } from '@/types/template';
import toast from 'react-hot-toast';

// Define the shape of the data the form will submit
export type TemplateFormData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>;

// Define the props the component accepts
interface TemplateFormProps {
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TemplateFormData>;
}

const TemplateForm = ({ onSubmit, onCancel, initialData = {} }: TemplateFormProps) => {
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [content, setContent] = useState(initialData.content || '');
  const [templateType, setTemplateType] = useState('general');
  const [tags, setTags] = useState((initialData.tags || []).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !content) {
      toast.error('Name, description, and content are required.');
      return;
    }
    
    setIsSubmitting(true);
    const descriptiveTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const finalTags = [...new Set([...descriptiveTags, templateType])]; // Ensure type is a tag

    const newTemplate: TemplateFormData = {
      name,
      description,
      content,
      tags: finalTags,
    };

    await onSubmit(newTemplate);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-1 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" />
      </div>

      <div>
        <label htmlFor="template-type" className="block text-sm font-medium text-gray-300 mb-1">Template Type</label>
        <select 
          id="template-type" 
          value={templateType} 
          onChange={(e) => setTemplateType(e.target.value)} 
          className="w-full border rounded p-2 text-black bg-gray-200"
        >
          <option value="general">General Component</option>
          <option value="persona">Persona</option>
          <option value="task">Task</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={2}></textarea>
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">Content</label>
        <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={4}></textarea>
      </div>
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
        <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" placeholder="e.g., email, marketing, code-gen"/>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">
          {isSubmitting ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
};

export default TemplateForm;
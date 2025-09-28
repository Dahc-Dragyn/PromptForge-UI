// src/components/EditTemplateForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { PromptTemplate } from '@/types/template';

// Define the shape of the data the form will submit
type TemplateFormData = Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>>;

interface EditTemplateFormProps {
  template: PromptTemplate;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
}

const EditTemplateForm = ({ template, onSubmit, onCancel }: EditTemplateFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setContent(template.content || '');
      setTags((template.tags || []).join(', '));
    }
  }, [template]);

  const handleAddTag = (tagToAdd: string) => {
    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tagToAdd)) {
      setTags(currentTags.length > 0 ? `${tags}, ${tagToAdd}` : tagToAdd);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updatedData: TemplateFormData = {
      name,
      description,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    await onSubmit(updatedData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required />
      </div>
      <div>
        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={2} required></textarea>
      </div>
      <div>
        <label htmlFor="edit-content" className="block text-sm font-medium text-gray-300 mb-1">Content</label>
        <textarea id="edit-content" value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={8} required></textarea>
      </div>
      <div>
        <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
        <input id="edit-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" />
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">Common tags:</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => handleAddTag('persona')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">+ persona</button>
            <button type="button" onClick={() => handleAddTag('task')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">+ task</button>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">
          {isSubmitting ? 'Updating...' : 'Update Template'}
        </button>
      </div>
    </form>
  );
};

export default EditTemplateForm;
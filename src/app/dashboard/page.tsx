// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { usePrompts } from '@/hooks/usePrompts';
import Link from 'next/link';
import Modal from '@/components/Modal';
import EditTemplateForm from '@/components/EditTemplateForm';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const { templates, loading: templatesLoading } = usePromptTemplates();
  const { prompts, loading: promptsLoading, error: promptsError, refetch: refetchPrompts } = usePrompts();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const handleOpenEditModal = (template: any) => {
    setCurrentTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentTemplate(null);
  };

  const handleCopyTemplate = (content: string, templateId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedTemplateId(templateId);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    });
  };

  // --- FIX 1: Add the complete delete logic for prompts ---
  const handleDeletePrompt = async (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt and all its versions?')) {
      setActiveItemId(promptId);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`, { 
          method: 'DELETE',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!response.ok) throw new Error('Failed to delete prompt.');
        await refetchPrompts(); // Instantly refresh the prompts list
      } catch (err) {
        alert('Error deleting prompt.');
        console.error(err);
      } finally {
        setActiveItemId(null);
      }
    }
  };

  // --- FIX 2: Add the complete delete logic for templates ---
  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setActiveItemId(templateId);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/${templateId}`, { 
          method: 'DELETE',
          headers: { 'ngrok-skip-browser-warning': 'true' } 
        });
        if (!response.ok) throw new Error('Failed to delete template.');
        // No refetch needed here; the real-time listener will update the UI
      } catch (err) {
        alert('Error deleting template.');
        console.error(err);
      } finally {
        setActiveItemId(null);
      }
    }
  };

  if (authLoading || templatesLoading || promptsLoading) {
    return <div className="text-center p-8">Loading Dashboard...</div>;
  }

  return (
    <>
      <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Template Library</h2>
              <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">+ New</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[75vh]">
              <div className="space-y-4">
                {templates.map((template: any) => (
                  <div key={template.id} className="p-3 rounded-lg bg-gray-700">
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                    {template.tags?.length > 0 && (<p className="text-xs text-gray-500 mt-2">Tags: {template.tags.join(', ')}</p>)}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => handleOpenEditModal(template)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                      <button onClick={() => handleCopyTemplate(template.content, template.id)} className={`px-3 py-1 text-xs rounded transition-colors ${copiedTemplateId === template.id ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>{copiedTemplateId === template.id ? 'Copied!' : 'Copy'}</button>
                      <button onClick={() => handleDeleteTemplate(template.id)} disabled={activeItemId === template.id} className="px-3 py-1 text-xs bg-red-600/60 text-white rounded hover:bg-red-700/80">{activeItemId === template.id ? '...' : 'Delete'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Your Prompts</h2>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[75vh]">
              {promptsError ? (<p className="text-red-400">Error: {promptsError}</p>) : (
                <div className="space-y-4">
                  {prompts.map((prompt: any) => (
                    <div key={prompt.id} className="p-4 rounded-lg bg-gray-700 shadow-lg">
                      <h3 className="text-lg font-bold text-white">{prompt.name}</h3>
                      <p className="text-sm text-gray-300 mt-1 line-clamp-3">{prompt.task_description}</p>
                      <div className="mt-4 flex gap-2">
                        <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">View Versions</Link>
                        <button onClick={() => handleDeletePrompt(prompt.id)} disabled={activeItemId === prompt.id} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">{activeItemId === prompt.id ? 'Deleting...' : 'Delete'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Compose a Prompt</h2>
            <div className="flex-grow">
              {/* --- FIX 3: Pass the refetchPrompts function as a prop --- */}
              <PromptComposer templates={templates} onPromptSaved={refetchPrompts} />
            </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Template">
        {currentTemplate && (<EditTemplateForm template={currentTemplate} onClose={handleCloseEditModal} />)}
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Template">
        <TemplateForm onSuccess={() => setIsCreateModalOpen(false)} />
      </Modal>
    </>
  );
};

export default DashboardPage;
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTemplateDetail, usePromptTemplates } from '@/hooks/usePromptTemplates';
import { useAuth } from '@/context/AuthContext';
import EditTemplateForm from '@/components/EditTemplateForm';
import { PromptTemplate } from '@/types/template';
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute';
// The hidden character was removed from here
import { ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline'; 

function TemplateDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);

  const { template, isLoading, isError, mutate: mutateTemplate } = useTemplateDetail(templateId);
  const { updateTemplate } = usePromptTemplates(); // This hook now correctly returns data

  const handleSubmit = async (updateData: Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>>) => {
    // This promise now resolves to the PromptTemplate object, not an AxiosResponse
    const promise = updateTemplate(templateId, updateData);

    toast.promise(promise, {
      loading: 'Updating template...',
      success: 'Template updated successfully!',
      error: (err) => err.message || 'Failed to update template.'
    });

    try {
      const updatedTemplate = await promise;
      // This logic is now correct
      mutateTemplate(updatedTemplate, false);
      setIsEditing(false); 
    } catch (error) {
      // Error is handled by the toast
    }
  };

  if (authLoading || isLoading) {
    return <div className="text-center p-8 text-white"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" /></div>;
  }
  if (isError) {
    return <div className="text-center p-8 text-red-400">Could not load template.</div>;
  }
  if (!template) {
    return <div className="text-center p-8 text-white">Template not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        {isEditing ? (
          <>
            <h1 className="text-3xl font-bold mb-6 text-white">Edit Template: {template.name}</h1>
            <EditTemplateForm
              template={template}
              onSubmit={handleSubmit}
              // Hidden character fixed here
              onCancel={() => setIsEditing(false)} 
            />
          </>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">{template.name}</h1>
                <p className="text-gray-400">{template.description}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <PencilIcon className="h-5 w-5" />
                Edit
              </button>
            </div>
            
            <div className="mt-6 border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-indigo-300 mb-2">Template Text</h3>
              <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm">
                {/* --- Assuming 'template.content' is the correct property for the prompt text --- */}
                {template.content}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TemplateDetailPage = () => (
  <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
    <PrivateRoute>
      <TemplateDetailContent />
    </PrivateRoute>
  </Suspense>
)

export default TemplateDetailPage;
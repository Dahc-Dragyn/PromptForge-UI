// src/app/templates/[id]/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTemplateDetail, usePromptTemplates } from '@/hooks/usePromptTemplates';
import { useAuth } from '@/context/AuthContext';
import EditTemplateForm from '@/components/EditTemplateForm';
import { PromptTemplate } from '@/types/template';
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute'; // Import PrivateRoute

function EditTemplateContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  // This hook call is now correct
  const { template, isLoading, isError } = useTemplateDetail(templateId);
  // This call is also correct, as the hook now exports updateTemplate
  const { updateTemplate } = usePromptTemplates();

  const handleSubmit = async (updateData: Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>>) => {
    // This will now work
    const promise = updateTemplate(templateId, updateData);
    
    toast.promise(promise, {
      loading: 'Updating template...',
      success: 'Template updated successfully!',
      error: (err) => err.message || 'Failed to update template.'
    });

    try {
      await promise;
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by the toast
    }
  };

  // This loading and auth logic is correct
  if (authLoading || isLoading) {
    return <div className="text-center p-8 text-white">Loading template...</div>;
  }
  if (isError) {
    return <div className="text-center p-8 text-red-400">Could not load template.</div>;
  }
  
  // This check is good, but PrivateRoute will handle it more gracefully
  if (!user) {
    router.push('/login');
    return null;
  }
  if (!template) {
    return <div className="text-center p-8 text-white">Template not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-white">Edit Template: {template.name}</h1>
        <EditTemplateForm 
          template={template} 
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard')}
        />
      </div>
    </div>
  );
}

const EditTemplatePage = () => (
  <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
    {/* --- THIS IS THE FIX ---
      We wrap the content in PrivateRoute for security.
    */}
    <PrivateRoute>
      <EditTemplateContent />
    </PrivateRoute>
  </Suspense>
)

export default EditTemplatePage;
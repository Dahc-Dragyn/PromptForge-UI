// src/app/templates/[id]/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTemplateDetail, usePromptTemplates } from '@/hooks/usePromptTemplates'; // Correct import
import { useAuth } from '@/context/AuthContext';
import EditTemplateForm from '@/components/EditTemplateForm';
import { PromptTemplate } from '@/types/template';
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute';
import Link from 'next/link';
import {
  ArrowPathIcon,
  PencilIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon, // Keep the icon import if needed elsewhere, or remove if not
} from '@heroicons/react/24/outline';

// Define LLM URLs
const LLM_URLS = {
  ChatGPT: 'https://chat.openai.com',
  Gemini: 'https://gemini.google.com/app',
  Grok: 'https://grok.x.ai/',
};
type LlmService = keyof typeof LLM_URLS;


function TemplateDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState<LlmService | null>(null);
  // --- FIX: State variable for the Copy button's appearance ---
  const [isCopied, setIsCopied] = useState(false);

  // Hooks to fetch data and get update function
  const { template, isLoading, isError, mutate: mutateTemplate } = useTemplateDetail(templateId);
  const { updateTemplate } = usePromptTemplates(); // Get update function from the list hook

  // --- handleSubmit remains correct (handles update and navigation) ---
  const handleSubmit = async (updateData: Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!templateId) {
      toast.error('Template ID is missing.');
      return;
    }

    const toastId = toast.loading('Updating template...');
    try {
      await updateTemplate(templateId, updateData);
      toast.success('Template updated successfully!', { id: toastId });
      router.push('/dashboard');
      setIsEditing(false);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update template.', { id: toastId });
      console.error("Update failed:", error);
    }
  };

  // --- FIX: handleCopy manages the 'isCopied' state ---
  const handleCopy = (text: string | null | undefined) => {
    if (text === null || text === undefined) {
      toast.error('No template text available to copy.');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Template text copied!');
        setIsCopied(true); // Set copied state
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      })
      .catch(err => toast.error('Failed to copy text.'));
  };
  // --- END FIX ---

  // Send To function (Unchanged)
    const handleSendTo = async (service: LlmService, text: string | undefined) => {
      if (!text) {
        toast.error('No template text available to send.');
        return;
      }
      setIsSending(service);
      const toastId = toast.loading(`Copying template text...`);
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Template copied! Opening new tab...', { id: toastId });
        setTimeout(() => {
          window.open(LLM_URLS[service], '_blank');
          setIsSending(null);
        }, 500);
      } catch (err) {
        toast.error('Failed to copy text.', { id: toastId });
        setIsSending(null);
      }
    };

  // Loading and Error states (Unchanged)
  if (authLoading || (templateId && isLoading)) {
    return <div className="text-center p-8 text-white"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" /></div>;
  }
    if (!templateId) {
      return <div className="text-center p-8 text-red-400">Template ID not found in URL.</div>;
  }
  if (isError) {
    return <div className="text-center p-8 text-red-400">Could not load template.</div>;
  }
  if (!template) {
    return <div className="text-center p-8 text-white">Template not found.</div>;
  }

  // Use optional chaining for safer access (Unchanged)
  const templateContent = template?.content;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">

      {/* Back Button Row (Unchanged) */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowUturnLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        {isEditing ? (
          // Edit Mode (Unchanged)
          <>
            <h1 className="text-3xl font-bold mb-6 text-white">Edit Template: {template.name}</h1>
            <EditTemplateForm
              template={template}
              onSubmit={handleSubmit}
              onCancel={() => setIsEditing(false)}
            />
          </>
        ) : (
          // View Mode
          <>
            <div className="flex justify-between items-start mb-4">
              {/* Left Side: Title & Description */}
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">{template.name}</h1>
                <p className="text-gray-400">{template.description}</p>
              </div>
              {/* Right Side: Action Buttons */}
              <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                  {/* --- FIX: Updated Copy Button Styling & Logic (Matches Prompt Detail) --- */}
                  <button
                    onClick={() => handleCopy(templateContent)}
                    className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                        isCopied
                        ? 'bg-green-600' // Green when copied
                        : 'bg-gray-600 hover:bg-gray-500' // Default gray
                    }`}
                    title="Copy Template Text"
                    disabled={templateContent === null || templateContent === undefined}
                  >
                    {isCopied ? 'Copied!' : 'Copy'} {/* Show text */}
                  </button>
                  {/* --- END FIX --- */}

                  {/* Send To Buttons (Group - Unchanged) */}
                  <div className="flex items-center gap-1 border-l border-gray-600 pl-2">
                    <span className="text-xs text-gray-400 mr-1">Send:</span>
                    <button onClick={() => handleSendTo('ChatGPT', templateContent)} disabled={!!isSending || !templateContent} className="px-2 py-1 text-xs bg-[#10a37f] text-white rounded hover:bg-[#0daaa5] disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSending === 'ChatGPT' ? '...' : 'ChatGPT'}
                    </button>
                    <button onClick={() => handleSendTo('Gemini', templateContent)} disabled={!!isSending || !templateContent} className="px-2 py-1 text-xs bg-[#4e85ff] text-white rounded hover:bg-[#588dff] disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSending === 'Gemini' ? '...' : 'Gemini'}
                    </button>
                    <button onClick={() => handleSendTo('Grok', templateContent)} disabled={!!isSending || !templateContent} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSending === 'Grok' ? '...' : 'Grok'}
                    </button>
                  </div>

                  {/* Edit Button (Unchanged) */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm border-l border-gray-600 pl-2"
                    title="Edit Template"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
            </div>

            {/* Template Text Display (Unchanged) */}
            <div className="mt-6 border-t border-gray-700 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-indigo-300">Template Text</h3>
                </div>
              <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm mt-2">
                {templateContent !== null && templateContent !== undefined
                    ? templateContent
                    : <span className="text-gray-500 italic">No content available.</span>
                }
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper component (Unchanged)
const TemplateDetailPage = () => (
  <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
    <PrivateRoute>
      <TemplateDetailContent />
    </PrivateRoute>
  </Suspense>
)

export default TemplateDetailPage;
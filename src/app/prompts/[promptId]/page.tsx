// src/app/prompts/[promptId]/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Prompt, PromptVersion } from '@/types/prompt';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import { usePrompts } from '@/hooks/usePrompts';
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute';
import NewVersionForm from '@/components/NewVersionForm';
import Modal from '@/components/Modal';
import StarRating from '@/components/StarRating';
import { ArrowPathIcon, PlusIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline';

function PromptDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const promptId = params.promptId as string;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);

  // --- THIS IS THE FIX ---
  // The SWR key must NOT have a trailing slash to match the backend API
  const { 
    data: prompt, 
    error: promptError, 
    isLoading: promptLoading,
    mutate: mutatePrompt 
  } = useSWR<Prompt>(
    user ? `/prompts/${promptId}` : null // <-- TRAILING SLASH REMOVED
  );
  
  // This hook is correct, as the versions endpoint needs a slash
  const { 
    versions, 
    isError: versionsError,
    isLoading: versionsLoading, 
    createVersion,
  } = usePromptVersions(promptId);
  
  const { updatePrompt, ratePrompt } = usePrompts();

  // 'handleCreateVersion' is removed because NewVersionForm handles its own logic

  // 'promoteVersion' feature is disabled because the hook does not export it
  /*
  const handlePromoteVersion = (versionNumber: number) => {
    // ... logic ...
  };
  */

  const handleRate = (rating: number) => {
    if (!prompt) return;
    // ratePrompt is part of usePrompts and correctly calls the backend
    const promise = ratePrompt(prompt.id, prompt.latest_version_number ?? 1, rating);
    toast.promise(promise, {
      loading: 'Submitting rating...',
      success: 'Rating submitted!',
      error: 'Failed to submit rating.'
    });
  };

  if (authLoading || promptLoading || versionsLoading) {
    return <div className="text-center p-8 text-white"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  if (promptError || versionsError) {
    return <div className="text-center p-8 text-red-400">Could not load prompt details.</div>;
  }
  
  if (!prompt) {
    // This will show if the SWR request (correctly) returns a 404
    return <div className="text-center p-8 text-white">Prompt not found.</div>;
  }

  const latestVersion = versions?.find(v => v.version_number === prompt.latest_version_number);

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 sm:p-8 text-white">
        {/* Header */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{prompt.name}</h1>
              <p className="text-gray-400 mb-4">{prompt.task_description}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end">
              <StarRating
                currentRating={Math.round(prompt.average_rating || 0)}
                onRatingChange={handleRate}
              />
              <span className="text-sm text-gray-400 mt-1">
                (Version {prompt.latest_version_number ?? 1})
              </span>
            </div>
          </div>
          
          {latestVersion && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-indigo-300 mb-2">Live Version (v{latestVersion.version_number})</h3>
              <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm">
                {latestVersion.prompt_text}
              </pre>
            </div>
          )}
        </div>

        {/* Version History */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Version History</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" /> New Version
            </button>
          </div>
          
          <div className="space-y-4">
            {versions?.map(version => (
              <div key={version.version_number} className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold text-blue-400">v{version.version_number}</span>
                    {version.version_number === prompt.latest_version_number && (
                      <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">Live</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedVersion(version)}
                      className="p-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-500" title="View">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {/* --- 'promoteVersion' FEATURE DISABLED --- */}
                    {/*
                    {version.version_number !== prompt.latest_version_number && (
                      <button 
                        onClick={() => handlePromoteVersion(version.version_number)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Promote to Live
                      </button>
                    )}
                    */}
                  </div>
                </div>
                <p className="text-sm text-gray-400 italic line-clamp-2">
                  {version.commit_message || "No commit message for this version."}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Created at: {new Date(version.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Version Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Version">
        {/* This is correct: NewVersionForm only takes 'promptId' */}
        <NewVersionForm promptId={promptId} />
      </Modal>

      {/* View Version Modal */}
      <Modal isOpen={!!selectedVersion} onClose={() => setSelectedVersion(null)} title={`View Version ${selectedVersion?.version_number}`}>
        {selectedVersion && (
          <div className="text-gray-300">
            <h3 className="text-lg font-semibold mb-2">Commit Message:</h3>
            <p className="bg-gray-700 p-3 rounded mb-4 text-sm italic">
              {selectedVersion.commit_message || "No commit message for this version."}
            </p> 
            <h3 className="text-lg font-semibold mb-2">Prompt Text:</h3>
            <pre className="bg-gray-900 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
              {selectedVersion.prompt_text}
            </pre>
          </div>
        )}
      </Modal>
    </>
  );
}

const PromptDetailPage = () => (
  <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
    <PrivateRoute>
      <PromptDetailContent />
    </PrivateRoute>
  </Suspense>
);

export default PromptDetailPage;
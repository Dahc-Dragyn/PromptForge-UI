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
// --- NEW: Added necessary icons ---
import {
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUturnLeftIcon, // For Back button
  ClipboardDocumentIcon, // For Copy button
  PaperAirplaneIcon // For Send To button
} from '@heroicons/react/24/outline';
// --- NEW: Import Link for Back button ---
import Link from 'next/link';

function PromptDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const promptId = params.promptId as string;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);

  // Set history visible by default (as per previous state)
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  // SWR for Prompt details (no trailing slash)
  const {
    data: prompt,
    error: promptError,
    isLoading: promptLoading,
    mutate: mutatePrompt
  } = useSWR<Prompt>(
    user ? `/prompts/${promptId}` : null
  );

  // SWR for Prompt Versions (no trailing slash needed here either based on hook logic)
  const {
    versions,
    isError: versionsError,
    isLoading: versionsLoading,
    createVersion,
  } = usePromptVersions(promptId);

  const { updatePrompt, ratePrompt } = usePrompts();

  // --- NEW: Copy function ---
  const handleCopy = (text: string | undefined) => {
    if (!text) {
      toast.error('No prompt text available to copy.');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Prompt text copied!'))
      .catch(err => toast.error('Failed to copy text.'));
  };

  // --- NEW: Placeholder Send To function ---
  // Replace this with actual implementation later
  const handleSendTo = (text: string | undefined) => {
     if (!text) {
      toast.error('No prompt text available to send.');
      return;
    }
    // TODO: Implement actual 'Send To' logic (e.g., open a modal, redirect, etc.)
    toast('Send To functionality not yet implemented.', { icon: '🚧' });
    console.log("Send To clicked. Text:", text);
  };

  const handleRate = (rating: number) => {
    if (!prompt) return;
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
    return <div className="text-center p-8 text-white">Prompt not found.</div>;
  }

  const latestVersion = versions?.find(v => v.version_number === prompt.latest_version_number);
  const promptTextToDisplay = latestVersion?.prompt_text || versions?.[0]?.prompt_text;
  const versionNumberToDisplay = latestVersion?.version_number || versions?.[0]?.version_number || 1;


  return (
    <>
      <div className="max-w-6xl mx-auto p-4 sm:p-8 text-white">

        {/* --- NEW: Back Button Row --- */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* --- PRIMARY CONTENT BLOCK (LIVE PROMPT) --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <div className="flex justify-between items-start mb-4"> {/* Added mb-4 */}
            {/* Left side: Title, Description, Rating */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{prompt.name}</h1>
              <p className="text-gray-400 mb-4">{prompt.task_description}</p>
              <div className="flex items-center gap-2"> {/* Group rating and version */}
                <StarRating
                  currentRating={Math.round(prompt.average_rating || 0)}
                  onRatingChange={handleRate}
                />
                 <span className="text-sm text-gray-400">
                   (Version {prompt.latest_version_number ?? 1})
                 </span>
              </div>
            </div>
            {/* Right side: Action Buttons */}
            {/* --- NEW: Action Buttons --- */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-1"> {/* Aligned buttons */}
               <button
                  onClick={() => handleCopy(promptTextToDisplay)}
                  className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                  title="Copy Prompt Text"
               >
                 <ClipboardDocumentIcon className="h-5 w-5"/>
               </button>
               <button
                 onClick={() => handleSendTo(promptTextToDisplay)}
                 className="p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                 title="Send To..."
               >
                 <PaperAirplaneIcon className="h-5 w-5"/>
               </button>
            </div>
          </div>

          {/* Prompt Text Display */}
          {promptTextToDisplay && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-indigo-300 mb-2">Live Version (v{versionNumberToDisplay})</h3>
              <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm">
                {promptTextToDisplay}
              </pre>
            </div>
          )}
        </div>

        {/* --- VERSION HISTORY (OPEN BY DEFAULT) --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setIsHistoryVisible(!isHistoryVisible)}
              className="flex items-center gap-2 text-2xl font-bold hover:text-gray-300 transition-colors"
            >
              {isHistoryVisible ? (
                <ChevronUpIcon className="h-6 w-6" />
              ) : (
                <ChevronDownIcon className="h-6 w-6" />
              )}
              Version History
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" /> New Version
            </button>
          </div>

          {isHistoryVisible && (
            <div className="space-y-4 animate-fadeIn border-t border-gray-700 pt-4">
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
                        {/* Only show View icon for non-live versions */}
                        {version.version_number !== prompt.latest_version_number && (
                          <button
                            onClick={() => setSelectedVersion(version)}
                            className="p-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* 'Promote to Live' logic (currently disabled) */}
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
          )}
        </div>
      </div>

      {/* New Version Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Version">
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
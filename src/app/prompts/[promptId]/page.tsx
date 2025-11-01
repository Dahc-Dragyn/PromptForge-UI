// src/app/prompts/[promptId]/page.tsx
'use client';

import { Suspense, useState } from 'react'; // Removed useEffect
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr'; // Removed globalMutate, no longer needed here
import { useAuth } from '@/context/AuthContext';
import { Prompt, PromptVersion } from '@/types/prompt';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import { usePrompts } from '@/hooks/usePrompts';
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute';
// --- THIS IS THE FIX (File 2 of 2) ---
// 1. Remove NewVersionForm, it's obsolete
// import NewVersionForm from '@/components/NewVersionForm';
// 2. Add our new EditPromptModal
import { EditPromptModal } from '@/components/EditPromptModal';
// --- End of Fix ---
import Modal from '@/components/Modal';
import StarRating from '@/components/StarRating';
import Link from 'next/link';
import SendToLlm from '@/components/SendToLlm';
import {
  ArrowPathIcon,
  PlusIcon, // Will be removed from button
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

// --- THIS IS THE FIX (File 2 of 2) ---
// 3. Remove the entire inline PromptEditForm component.
//    Its logic is now inside EditPromptModal.
// --- End of Fix ---

function PromptDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const promptId = params.promptId as string;

  // --- THIS IS THE FIX (File 2 of 2) ---
  // 4. Rename 'isModalOpen' to 'isEditModalOpen' for clarity.
  //    This will control our new EditPromptModal.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // 5. Remove 'isEditing' state. The modal handles this now.
  // const [isEditing, setIsEditing] = useState(false);
  // --- End of Fix ---
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(
    null
  );
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // SWR for Prompt details - get mutate function
  const {
    data: prompt,
    error: promptError,
    isLoading: promptLoading,
    mutate: mutatePrompt,
  } = useSWR<Prompt | null>(user && promptId ? `/prompts/${promptId}` : null);

  // SWR for Prompt Versions
  const {
    versions,
    isError: versionsError,
    isLoading: versionsLoading,
  } = usePromptVersions(promptId);

  // Get functions from usePrompts hook
  // We keep 'ratePrompt', but 'updatePrompt' is now called by the modal
  const { ratePrompt } = usePrompts();

  // handleCopy remains the same
  const handleCopy = (text: string | null | undefined) => {
    if (text === null || text === undefined) {
      toast.error('No prompt text available to copy.');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success('Prompt text copied!');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => toast.error('Failed to copy text.'));
  };

  // handleRate remains the same
  const handleRate = (rating: number) => {
    if (!prompt?.id) return;
    const promise = ratePrompt(
      prompt.id,
      prompt.latest_version_number ?? 1,
      rating
    );
    toast.promise(promise, {
      loading: 'Submitting rating...',
      success: 'Rating submitted!',
      error: 'Failed to submit rating.',
    });
    // Optimistically update local data after rating (optional but nice)
    promise
      .then(() => {
        mutatePrompt(
          (currentPrompt) => {
            if (!currentPrompt) return null;
            const oldAvg = currentPrompt.average_rating || 0;
            const oldCount = currentPrompt.rating_count || 0;
            const newCount = oldCount + 1; // Simplistic count increase
            const newAvg = (oldAvg * oldCount + rating) / newCount;
            return {
              ...currentPrompt,
              average_rating: newAvg,
              rating_count: newCount,
            };
          },
          { revalidate: false }
        ); // Update local cache without re-fetching immediately
      })
      .catch(() => {}); // Handle potential errors if needed
  };

  // --- THIS IS THE FIX (File 2 of 2) ---
  // 6. Remove handleUpdateSubmit. This is now handled inside EditPromptModal.
  // --- End of Fix ---

  // Loading and Error states remain the same
  if (authLoading || (promptId && (promptLoading || versionsLoading))) {
    return (
      <div className="text-center p-8 text-white">
        <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }
  if (!promptId) {
    return (
      <div className="text-center p-8 text-red-400">
        Prompt ID not found in URL.
      </div>
    );
  }
  if (promptError) {
    return (
      <div className="text-center p-8 text-red-400">
        Could not load prompt details.
      </div>
    );
  }
  if (versionsError) {
    console.warn('Could not load prompt versions.');
  }
  if (!prompt) {
    return (
      <div className="text-center p-8 text-white">
        Prompt not found or access denied.
      </div>
    );
  }

  // Determine text to display remains the same
  const latestVersion = versions?.find(
    (v) => v.version_number === prompt.latest_version_number
  );
  const promptTextToDisplay =
    latestVersion?.prompt_text ?? versions?.[0]?.prompt_text;
  const versionNumberToDisplay =
    latestVersion?.version_number || versions?.[0]?.version_number || 1;

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 sm:p-8 text-white">
        {/* Back Button Row remains the same */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* --- THIS IS THE FIX (File 2 of 2) --- */}
        {/* 7. Remove the entire isEditing ? (...) : (...) block. */}
        {/* --- Primary Content Block: No longer handles Edit Mode --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          {/* We are now always in VIEW MODE */}
          <>
            <div className="flex justify-between items-start mb-4">
              {/* Left side: Title, Description, Rating */}
              <div>
                <h1 className="text-3xl font-bold mb-2">{prompt.name}</h1>
                <p className="text-gray-400 mb-4">
                  {prompt.task_description}
                </p>
                <div className="flex items-center gap-2">
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
              <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(promptTextToDisplay)}
                  className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                    isCopied
                      ? 'bg-green-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  title="Copy Prompt Text"
                  disabled={
                    promptTextToDisplay === null ||
                    promptTextToDisplay === undefined
                  }
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>

                {/* SendToLlm Component */}
                {promptId && <SendToLlm promptId={promptId} />}

                {/* 8. This is our single "Edit" button. */}
                {/* We just update its onClick to open the new modal. */}
                <button
                  onClick={() => setIsEditModalOpen(true)} // <-- Point to new state
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm border-l border-gray-600 pl-2 ml-2"
                  title="Edit Prompt Details"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Prompt Text Display */}
            {promptTextToDisplay !== null &&
            promptTextToDisplay !== undefined ? (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-indigo-300 mb-2">
                  Live Version (v{versionNumberToDisplay})
                </h3>
                <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm">
                  {promptTextToDisplay}
                </pre>
              </div>
            ) : (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <p className="text-gray-500 italic">
                  No prompt text available for the live version.
                </p>
              </div>
            )}
          </>
        </div>
        {/* --- End Primary Content Block --- */}

        {/* --- THIS IS THE FIX (File 2 of 2) --- */}
        {/* 9. Remove the !isEditing wrapper. History is always visible. */}
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
            {/* 10. Remove the "+ New Version" button. */}
          </div>

          {isHistoryVisible && (
            <div className="space-y-4 animate-fadeIn border-t border-gray-700 pt-4">
              {/* Version history list remains the same... */}
              {versionsLoading && (
                <div className="text-center py-2">
                  <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                </div>
              )}
              {versionsError && (
                <p className="text-center text-red-400 py-2">
                  Could not load versions.
                </p>
              )}
              {versions?.map((version) => (
                <div
                  key={version.version_number}
                  className="bg-gray-700/50 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-blue-400">
                        v{version.version_number}
                      </span>
                      {version.version_number ===
                        prompt?.latest_version_number && (
                        <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {version.version_number !==
                        prompt?.latest_version_number && (
                        <button
                          onClick={() => setSelectedVersion(version)}
                          className="p-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 italic line-clamp-2">
                    {version.commit_message || 'No commit message.'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {!versionsLoading &&
                !versionsError &&
                (!versions || versions.length === 0) && (
                  <p className="text-gray-500 italic text-center py-2">
                    No version history found.
                  </p>
                )}
            </div>
          )}
        </div>
        {/* --- End Version History --- */}
      </div>

      {/* --- THIS IS THE FIX (File 2 of 2) --- */}
      {/* 11. Render our new EditPromptModal */}
      {/* We can re-use the 'prompt' and 'promptTextToDisplay' variables */}
      <EditPromptModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        prompt={prompt}
        latestVersionText={promptTextToDisplay}
      />

      {/* 12. Remove the old NewVersionForm Modal */}
      {/* <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Version">
        {promptId && <NewVersionForm promptId={promptId} />}
      </Modal> */}

      {/* The "View Version" modal remains unchanged */}
      <Modal
        isOpen={!!selectedVersion}
        onClose={() => setSelectedVersion(null)}
        title={`View Version ${selectedVersion?.version_number}`}
      >
        {selectedVersion && (
          <div className="text-gray-300">
            <h3 className="text-lg font-semibold mb-2">Commit Message:</h3>
            <p className="bg-gray-700 p-3 rounded mb-4 text-sm italic">
              {selectedVersion.commit_message || 'No commit message.'}
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
// --- End of Fix ---

// Page component remains the same
const PromptDetailPage = () => (
  <Suspense
    fallback={
      <div className="text-center p-8 bg-gray-900 text-white min-h-screen">
        Loading...
      </div>
    }
  >
    <PrivateRoute>
      <PromptDetailContent />
    </PrivateRoute>
  </Suspense>
);

export default PromptDetailPage;
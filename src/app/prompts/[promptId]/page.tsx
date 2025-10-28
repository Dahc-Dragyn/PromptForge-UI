// src/app/prompts/[promptId]/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react'; // Added useEffect
import { useRouter, useParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr'; // Import globalMutate
import { useAuth } from '@/context/AuthContext';
import { Prompt, PromptVersion } from '@/types/prompt';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import { usePrompts } from '@/hooks/usePrompts'; // Import usePrompts for ratePrompt AND updatePrompt
import toast from 'react-hot-toast';
import PrivateRoute from '@/components/PrivateRoute';
import NewVersionForm from '@/components/NewVersionForm';
import Modal from '@/components/Modal';
import StarRating from '@/components/StarRating';
import Link from 'next/link';
import SendToLlm from '@/components/SendToLlm';
import {
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon, // Can keep or remove if only text button used
  PencilIcon,          // Added for Edit button
} from '@heroicons/react/24/outline';

// --- Simple inline form component for editing ---
interface PromptEditFormProps {
  initialName: string;
  initialDescription: string;
  onSubmit: (data: { name: string; task_description: string }) => Promise<void>;
  onCancel: () => void;
}

const PromptEditForm = ({ initialName, initialDescription, onSubmit, onCancel }: PromptEditFormProps) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ name, task_description: description });
    setIsSubmitting(false); // Re-enable button even if submit fails (toast shows error)
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="edit-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input
          id="edit-prompt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2 text-black bg-gray-200"
          required
        />
      </div>
      <div>
        <label htmlFor="edit-prompt-description" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
        <textarea
          id="edit-prompt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded p-2 text-black bg-gray-200"
          rows={3}
          required
        ></textarea>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};
// --- End of inline form component ---


function PromptDetailContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const promptId = params.promptId as string;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [isCopied, setIsCopied] = useState(false); // State for Copy button
  const [isEditing, setIsEditing] = useState(false); // State for Edit mode

  // SWR for Prompt details - get mutate function
  const {
    data: prompt,
    error: promptError,
    isLoading: promptLoading,
    mutate: mutatePrompt, // Get mutate function for local updates
  } = useSWR<Prompt | null>( // Allow null type
    user && promptId ? `/prompts/${promptId}` : null
    // Note: If using a custom fetcher, ensure it handles 404 by returning null
  );

  // SWR for Prompt Versions
  const {
    versions,
    isError: versionsError,
    isLoading: versionsLoading,
  } = usePromptVersions(promptId);

  // Get functions from usePrompts hook
  const { ratePrompt, updatePrompt } = usePrompts();

  // Update handleCopy to manage state (Matches template detail)
  const handleCopy = (text: string | null | undefined) => {
    if (text === null || text === undefined) {
      toast.error('No prompt text available to copy.');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Prompt text copied!');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => toast.error('Failed to copy text.'));
  };

  // handleRate remains the same
  const handleRate = (rating: number) => {
    if (!prompt?.id) return;
    const promise = ratePrompt(prompt.id, prompt.latest_version_number ?? 1, rating);
    toast.promise(promise, {
      loading: 'Submitting rating...',
      success: 'Rating submitted!',
      error: 'Failed to submit rating.'
    });
    // Optimistically update local data after rating (optional but nice)
    promise.then(() => {
        mutatePrompt(currentPrompt => {
            if (!currentPrompt) return null;
            const oldAvg = currentPrompt.average_rating || 0;
            const oldCount = currentPrompt.rating_count || 0;
            const newCount = oldCount + 1; // Simplistic count increase
            const newAvg = ((oldAvg * oldCount) + rating) / newCount;
            return { ...currentPrompt, average_rating: newAvg, rating_count: newCount };
        }, { revalidate: false }); // Update local cache without re-fetching immediately
    }).catch(()=>{}); // Handle potential errors if needed
  };

  // --- Add handleUpdateSubmit ---
  const handleUpdateSubmit = async (updateData: { name: string; task_description: string }) => {
    if (!promptId) return;

    const promise = updatePrompt(promptId, updateData); // Call hook function
    toast.promise(promise, {
      loading: 'Saving changes...',
      success: 'Prompt updated successfully!',
      error: (err) => err instanceof Error ? err.message : 'Failed to update prompt.'
    });

    try {
      const updatedPromptData = await promise;
      // Update local SWR cache immediately with new data
      mutatePrompt(updatedPromptData, { revalidate: false });
      setIsEditing(false); // Exit edit mode on success
    } catch (error) {
      console.error("Update failed:", error);
      // Keep edit mode open on error
    }
  };
  // --- End handleUpdateSubmit ---

  // Loading and Error states remain the same
  if (authLoading || (promptId && (promptLoading || versionsLoading))) {
     return <div className="text-center p-8 text-white"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" /></div>;
  }
  if (!promptId) {
     return <div className="text-center p-8 text-red-400">Prompt ID not found in URL.</div>;
  }
  if (promptError) {
    // Distinguish prompt fetch error from version fetch error
    return <div className="text-center p-8 text-red-400">Could not load prompt details.</div>;
  }
   if (versionsError) {
    // Allow page to load even if versions fail, maybe show warning?
    console.warn("Could not load prompt versions.");
    // Optionally return an error or continue rendering with a message
  }
  if (!prompt) {
    return <div className="text-center p-8 text-white">Prompt not found or access denied.</div>;
  }

  // Determine text to display remains the same
  const latestVersion = versions?.find(v => v.version_number === prompt.latest_version_number);
  const promptTextToDisplay = latestVersion?.prompt_text ?? versions?.[0]?.prompt_text;
  const versionNumberToDisplay = latestVersion?.version_number || versions?.[0]?.version_number || 1;


  return (
    <>
      <div className="max-w-6xl mx-auto p-4 sm:p-8 text-white">

        {/* Back Button Row remains the same */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* --- Primary Content Block: Now handles Edit Mode --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          {isEditing ? (
            // --- EDIT MODE ---
             <div>
                <h2 className="text-2xl font-bold mb-4 text-white">Edit Prompt Details</h2>
                <PromptEditForm
                    initialName={prompt.name}
                    initialDescription={prompt.task_description}
                    onSubmit={handleUpdateSubmit}
                    onCancel={() => setIsEditing(false)}
                />
             </div>
          ) : (
            // --- VIEW MODE ---
            <>
              <div className="flex justify-between items-start mb-4">
                {/* Left side: Title, Description, Rating */}
                <div>
                  <h1 className="text-3xl font-bold mb-2">{prompt.name}</h1>
                  <p className="text-gray-400 mb-4">{prompt.task_description}</p>
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
                  {/* --- Updated Copy Button --- */}
                  <button
                    onClick={() => handleCopy(promptTextToDisplay)}
                    className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                        isCopied
                        ? 'bg-green-600'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    title="Copy Prompt Text"
                    disabled={promptTextToDisplay === null || promptTextToDisplay === undefined}
                  >
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                  {/* --- End Copy Button --- */}

                  {/* SendToLlm Component */}
                  {promptId && (
                     <SendToLlm promptId={promptId} />
                  )}

                   {/* --- Add Edit Button --- */}
                   <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm border-l border-gray-600 pl-2 ml-2" // Added margin-left
                    title="Edit Prompt Details"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  {/* --- End Edit Button --- */}
                </div>
              </div>

              {/* Prompt Text Display */}
              {(promptTextToDisplay !== null && promptTextToDisplay !== undefined) ? (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-indigo-300 mb-2">Live Version (v{versionNumberToDisplay})</h3>
                  <pre className="bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap font-mono text-sm">
                    {promptTextToDisplay}
                  </pre>
                </div>
               ) : (
                 <div className="mt-4 border-t border-gray-700 pt-4">
                     <p className="text-gray-500 italic">No prompt text available for the live version.</p>
                 </div>
               )}
            </>
          )}
        </div>
        {/* --- End Primary Content Block --- */}


        {/* --- Version History (Show only in View mode) --- */}
        {!isEditing && (
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
                 {/* Display loading/error specifically for versions if needed */}
                 {versionsLoading && <div className="text-center py-2"><ArrowPathIcon className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>}
                 {versionsError && <p className="text-center text-red-400 py-2">Could not load versions.</p>}
                 {versions?.map(version => (
                   <div key={version.version_number} className="bg-gray-700/50 p-4 rounded-lg">
                       <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-3">
                           <span className="text-xl font-semibold text-blue-400">v{version.version_number}</span>
                           {version.version_number === prompt?.latest_version_number && (
                             <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">Live</span>
                           )}
                         </div>
                         <div className="flex items-center gap-2">
                           {version.version_number !== prompt?.latest_version_number && (
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
                         {version.commit_message || "No commit message."}
                       </p>
                       <p className="text-xs text-gray-500 mt-2">
                         Created: {new Date(version.created_at).toLocaleString()}
                       </p>
                     </div>
                   ))}
                    {/* Show message if no versions loaded and not loading/error */}
                    {!versionsLoading && !versionsError && (!versions || versions.length === 0) && (
                        <p className="text-gray-500 italic text-center py-2">No version history found.</p>
                    )}
                 </div>
             )}
           </div>
        )}
        {/* --- End Version History --- */}
      </div>

      {/* Modals remain the same */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Version">
        {promptId && <NewVersionForm promptId={promptId} />}
      </Modal>
      <Modal isOpen={!!selectedVersion} onClose={() => setSelectedVersion(null)} title={`View Version ${selectedVersion?.version_number}`}>
         {selectedVersion && (
         <div className="text-gray-300">
           <h3 className="text-lg font-semibold mb-2">Commit Message:</h3>
           <p className="bg-gray-700 p-3 rounded mb-4 text-sm italic">
             {selectedVersion.commit_message || "No commit message."}
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

// Page component remains the same
const PromptDetailPage = () => (
  <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
    <PrivateRoute>
      <PromptDetailContent />
    </PrivateRoute>
  </Suspense>
);

export default PromptDetailPage;
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { usePrompts } from '@/hooks/usePrompts';
import { Prompt, PromptVersion } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import SendToLlm from '@/components/SendToLlm';
import StarRating from '@/components/StarRating';
import { copyTextAsPromise } from '@/lib/clipboard'; // <-- 1. IMPORT THE UTILITY

type TabState = 'active' | 'archived';

// 2. CREATE A HELPER FUNCTION TO GET THE TEXT PROMISE
const fetchLatestPromptText = async (promptId: string): Promise<string> => {
  const versions = await apiClient.get<PromptVersion[]>(
    `/prompts/${promptId}/versions`
  );

  // Note: Assuming apiClient unwraps .data by default
  if (!versions || !Array.isArray(versions) || versions.length === 0)
    throw new Error('This prompt has no versions to copy.');

  const latestVersion = [...versions].sort(
    (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
  )[0];

  return latestVersion.prompt_text;
};

export default function AllPromptsPage() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabState>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // State for interaction
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [ratedInSession, setRatedInSession] = useState<Set<string>>(new Set());

  // Fetch active prompts and mutation functions from one hook
  const {
    prompts: activePrompts,
    isLoading: isLoadingActive,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  } = usePrompts(false);

  // Fetch all prompts (including archived) from another
  const { prompts: allPrompts, isLoading: isLoadingAll } = usePrompts(true);

  // Derive archived prompts and counts
  const { archivedPrompts, activeCount, archivedCount } = useMemo(() => {
    const all = allPrompts || [];
    const active = activePrompts || [];

    // Explicitly type 'p' as Prompt
    const activeIdSet = new Set(active.map((p: Prompt) => p.id));

    // Explicitly type 'p' as Prompt
    const archived = all.filter((p: Prompt) => !activeIdSet.has(p.id));

    return {
      archivedPrompts: archived,
      activeCount: active.length,
      archivedCount: archived.length,
    };
  }, [activePrompts, allPrompts]);

  // Determine which list to display based on the current tab
  const promptsToDisplay = useMemo(() => {
    return currentTab === 'active' ? activePrompts : archivedPrompts;
  }, [currentTab, activePrompts, archivedPrompts]);

  // Filter the displayed list based on the search term
  const filteredPrompts = useMemo(() => {
    if (!promptsToDisplay) return [];
    if (!searchTerm) return promptsToDisplay;

    // Explicitly type 'prompt' as Prompt
    return promptsToDisplay.filter(
      (prompt: Prompt) =>
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prompt.task_description &&
          prompt.task_description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()))
    );
  }, [promptsToDisplay, searchTerm]);

  const isLoading = isLoadingActive || isLoadingAll;

  // --- Action Handlers ---

  const handleAction = (
    actionPromise: Promise<unknown>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(actionPromise, messages);
  };

  // 3. REFACTOR handleCopyText
  const handleCopyText = async (promptId: string) => {
    setCopiedPromptId(promptId);
    const toastId = toast.loading('Copying...');
    try {
      // Get the PROMISE, don't await it
      const textPromise = fetchLatestPromptText(promptId);

      // Pass the PROMISE to the utility
      await copyTextAsPromise(textPromise);

      toast.success('Copied to clipboard!', { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy.';
      toast.error(message, { id: toastId });
    } finally {
      setTimeout(() => setCopiedPromptId(null), 2000);
    }
  };

  const handleArchivePrompt = (promptId: string, isArchived: boolean) =>
    archivePrompt(promptId, isArchived);

  const handleDeletePrompt = (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      handleAction(deletePrompt(promptId), {
        loading: 'Deleting...',
        success: 'Prompt deleted.',
        error: 'Failed to delete.',
      });
    }
  };

  const handleRate = (
    promptId: string,
    versionNumber: number,
    rating: number
  ) => {
    handleAction(ratePrompt(promptId, versionNumber, rating), {
      loading: 'Submitting...',
      success: 'Rating submitted!',
      error: 'Failed to submit rating.',
    })
      .then(() => setRatedInSession((prev) => new Set(prev).add(promptId)))
      .catch(() => {});
  };

  // Helper to render the full-featured list
  const renderPromptList = () => {
    if (isLoading) {
      return (
        <div className="text-center text-gray-400 mt-8">
          Loading prompts...
        </div>
      );
    }

    if (filteredPrompts.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-8">
          {searchTerm
            ? 'No prompts match your search.'
            : `You have no ${currentTab} prompts.`}
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-6">
        {filteredPrompts.map((prompt: Prompt) => (
          <div key={prompt.id} className={`p-4 bg-gray-700/50 rounded-lg`}>
            <div className="flex justify-between items-start">
              <Link
                href={`/prompts/${prompt.id}`}
                className={`font-semibold mb-1 block hover:underline ${
                  prompt.is_archived
                    ? 'text-gray-500 line-through'
                    : 'text-indigo-400'
                }`}
              >
                {prompt.name}
              </Link>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
              {prompt.task_description}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                <StarRating
                  currentRating={Math.round(prompt.average_rating || 0)}
                  disabled={ratedInSession.has(prompt.id)}
                  onRatingChange={(rating) =>
                    handleRate(
                      prompt.id,
                      prompt.latest_version_number ?? 1,
                      rating
                    )
                  }
                />
                <div className="flex items-center gap-x-2">
                  <Link
                    href={`/prompts/${prompt.id}`}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleCopyText(prompt.id)}
                    className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                      copiedPromptId === prompt.id
                        ? 'bg-green-600'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {copiedPromptId === prompt.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() =>
                      handleArchivePrompt(prompt.id, !prompt.is_archived)
                    }
                    className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    title={prompt.is_archived ? 'Unarchive' : 'Archive'}
                  >
                    {prompt.is_archived ? (
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                    ) : (
                      <ArchiveBoxIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0">
                <SendToLlm promptId={prompt.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* 1. Return to Dashboard Link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 2. Header */}
        <h1 className="text-3xl font-bold text-white mb-6">Your Prompts</h1>

        {/* 3. Tab and Search UI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex-shrink-0">
            <nav className="flex space-x-2" aria-label="Tabs">
              <button
                onClick={() => setCurrentTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setCurrentTab('archived')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'archived'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Archived ({archivedCount})
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="w-full md:max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search your prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Filtered List */}
        <div className="bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize">
            {currentTab} Prompts
          </h2>
          {renderPromptList()}
        </div>
      </div>
    </div>
  );
}
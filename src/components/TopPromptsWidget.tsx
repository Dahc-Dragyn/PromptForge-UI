// src/components/TopPromptsWidget.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Prompt } from '@/types/prompt';
import SendToLlm from './SendToLlm';
import { 
  StarIcon, 
  ArrowPathIcon, 
  ArchiveBoxIcon, 
  ArrowUturnLeftIcon 
} from '@heroicons/react/24/solid';

interface TopPromptsWidgetProps {
  prompts: Prompt[];
  loading: boolean;
  isError: boolean;
  // Handlers from the parent dashboard
  onCopy: (promptId: string) => void;
  onArchive: (promptId: string, isArchived: boolean) => void;
  // State from parent to show button status
  copiedPromptId: string | null;
}

// REMOVED: The RatingBar component is no longer needed.

const TopPromptsWidget = ({ 
  prompts, 
  loading, 
  isError, 
  onCopy,
  onArchive,
  copiedPromptId
}: TopPromptsWidgetProps) => {
  // NEW: Local state for the widget's own archive toggle
  const [showStarredArchived, setShowStarredArchived] = useState(false);

  const starredPrompts = useMemo(() => {
    if (!prompts) return [];
    
    const baseList = prompts.filter(p => (p.rating_count ?? 0) > 0);
    
    // UPDATED: Logic now uses the local showStarredArchived state
    const filteredByArchive = showStarredArchived 
      ? baseList 
      : baseList.filter(p => !p.is_archived);

    return filteredByArchive
      .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
      .slice(0, 5);
  }, [prompts, showStarredArchived]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (isError) {
      return <p className="text-center text-red-400">Could not load prompts.</p>;
    }

    if (starredPrompts.length === 0) {
      return (
        <div className="text-center py-10">
          <StarIcon className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">No starred prompts found.</p>
          <p className="text-xs text-gray-500">
            {showStarredArchived ? 'Try toggling off "Archived"' : 'Rate a prompt to see it here!'}
          </p>
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {starredPrompts.map((prompt) => (
          <li key={prompt.id} className={`p-3 rounded-lg transition-all ${prompt.is_archived ? 'bg-gray-700/50 opacity-60' : 'bg-gray-700/80 hover:bg-gray-700/100'}`}>
              <div className="flex justify-between items-start">
                <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400 flex-1 hover:underline">{prompt.name}</Link>
                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-yellow-300">
                  <StarIcon className="w-4 h-4" />
                  <span>{(prompt.average_rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1 mb-3 line-clamp-2">
                {prompt.task_description}
              </p>
              {/* REMOVED: RatingBar is no longer displayed here */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-gray-600/50">
                <div className="flex items-center gap-2">
                   <button onClick={() => onCopy(prompt.id)} className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${copiedPromptId === prompt.id ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                      {copiedPromptId === prompt.id ? 'Copied!' : 'Copy'}
                   </button>
                   <button onClick={() => onArchive(prompt.id, !prompt.is_archived)} className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700" title={prompt.is_archived ? 'Unarchive' : 'Archive'}>
                      {prompt.is_archived ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <ArchiveBoxIcon className="h-4 w-4" />}
                   </button>
                </div>
                <SendToLlm promptId={prompt.id} />
              </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      {/* UPDATED: Header now includes the independent toggle switch */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Your Starred Prompts</h3>
        <label className="flex items-center cursor-pointer">
          <span className="mr-3 text-xs text-gray-400">Archived</span>
          <div className="relative">
            <input type="checkbox" checked={showStarredArchived} onChange={() => setShowStarredArchived(!showStarredArchived)} className="sr-only" />
            <div className={`block w-10 h-6 rounded-full transition-colors ${showStarredArchived ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showStarredArchived ? 'translate-x-full' : ''}`}></div>
          </div>
        </label>
      </div>

      {renderContent()}

      {/* NEW: "See All" link appears if there are prompts to show */}
      {starredPrompts.length > 0 && (
        <div className="mt-4 text-right">
          <Link href="/prompts/starred" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
            See All &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};

export default TopPromptsWidget;
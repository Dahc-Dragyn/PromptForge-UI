// src/components/RecentActivityWidget.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ActivityItem, Prompt } from '@/types/prompt';
import SendToLlm from './SendToLlm';
import {
    ArrowPathIcon,
    ClockIcon,
    ArchiveBoxIcon,
    TrashIcon,
    ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  prompts: Prompt[];
  loading: boolean;
  isError: boolean;
  onCopy: (promptId: string) => void;
  onArchive: (promptId: string, isArchived: boolean) => void;
  onDelete: (promptId: string) => void;
  copiedPromptId: string | null;
}

const formatActionText = (action: string) => {
  if (!action) return 'Activity';
  const formatted = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  return formatted;
};

const RecentActivityWidget = ({
    activities,
    prompts,
    loading,
    isError,
    onCopy,
    onArchive,
    onDelete,
    copiedPromptId
}: RecentActivityWidgetProps) => {

  // --- NEW: State for the archive toggle ---
  const [showArchived, setShowArchived] = useState(false);

  // --- NEW: Memoized filtering logic ---
  const visibleActivities = useMemo(() => {
    // Create a Map for efficient prompt lookups
    const promptMap = new Map(prompts.map(p => [p.id, p]));

    return (activities || [])
      .filter(activity => {
        // 1. Filter out activities for items that are not in the main prompts list (i.e., templates)
        return promptMap.has(activity.prompt_id);
      })
      .filter(activity => {
        // 2. Filter by archive status based on the toggle state
        const prompt = promptMap.get(activity.prompt_id);
        // If showArchived is true, show everything. Otherwise, only show un-archived.
        return showArchived ? true : !prompt?.is_archived;
      })
      .slice(0, 5); // Take the top 5 after filtering
  }, [activities, prompts, showArchived]);


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (isError) {
      return <p className="text-center text-red-400">Could not load recent activity.</p>;
    }

    if (visibleActivities.length === 0) {
      return (
        <div className="text-center py-10">
          <ClockIcon className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">No recent prompt activity.</p>
        </div>
      );
    }

    return (
      <ul className="space-y-4">
        {visibleActivities.map((activity) => {
            const prompt = prompts.find(p => p.id === activity.prompt_id);
            // We can safely assume prompt exists here due to our filter above
            const uniqueKey = `${activity.prompt_id}-${activity.timestamp}`;

            return (
                <li key={uniqueKey} className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-start">
                        <Link href={`/prompts/${activity.prompt_id}`} className="font-semibold text-indigo-400 mb-1 block hover:underline">{activity.prompt_name}</Link>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatActionText(activity.action)}</span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{prompt?.task_description || '...'}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-2">
                            <Link href={`/prompts/${activity.prompt_id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">View</Link>
                            <button onClick={() => onCopy(activity.prompt_id)} className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${copiedPromptId === activity.prompt_id ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                {copiedPromptId === activity.prompt_id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                onClick={() => onArchive(activity.prompt_id, !prompt?.is_archived)}
                                className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                title={prompt?.is_archived ? 'Unarchive' : 'Archive'}
                                disabled={!prompt}
                            >
                                {prompt?.is_archived ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <ArchiveBoxIcon className="h-4 w-4" />}
                            </button>
                            <button onClick={() => onDelete(activity.prompt_id)} className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-shrink-0">
                            <SendToLlm promptId={activity.prompt_id} />
                        </div>
                    </div>
                </li>
            );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="font-bold text-lg">Recent Activity</h3>
        {/* --- NEW: Archive toggle switch, styled like the "Your Prompts" one --- */}
        <label className="flex items-center cursor-pointer">
            <span className="mr-3 text-sm text-gray-400">Archived</span>
            <div className="relative">
                <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="sr-only" />
                <div className={`block w-14 h-8 rounded-full transition-colors ${showArchived ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showArchived ? 'translate-x-full' : ''}`}></div>
            </div>
        </label>
      </div>
      <div className="overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
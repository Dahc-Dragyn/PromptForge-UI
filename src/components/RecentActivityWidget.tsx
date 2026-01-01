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

// --- Helper: Format timestamp into readable text ---
const formatTimestamp = (timestamp: string | undefined | null): string => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    console.error('Error formatting date:', timestamp, e);
    return '';
  }
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
  const [showArchived, setShowArchived] = useState(false);

  // Efficiently compute visible activities
  const visibleActivities = useMemo(() => {
    const promptMap = new Map(prompts.map(p => [p.id, p]));

    return (activities || [])
      .filter(a => !!a.promptId && promptMap.has(a.promptId))
      .filter(a => {
        const p = promptMap.get(a.promptId);
        return p && (showArchived ? true : !p.is_archived);
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [activities, prompts, showArchived]);

  // --- Main Renderer ---
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (isError) {
      return (
        <p className="text-center text-red-400">
          Could not load recent activity.
        </p>
      );
    }

    if (visibleActivities.length === 0) {
      return (
        <div className="text-center py-10">
          <ClockIcon className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">
            {showArchived
              ? 'No recent activity (including archived).'
              : 'No recent prompt activity.'}
          </p>
        </div>
      );
    }

    return (
      <ul className="space-y-4">
        {visibleActivities.map((activity, index) => {
          const prompt = prompts.find(p => p.id === activity.promptId);

          // ✅ FIX: Use a composite key that guarantees uniqueness
          const uniqueKey = `${activity.id ?? 'noId'}-${activity.promptId ?? 'noPrompt'}-${index}`;
          
          return (
            <li key={uniqueKey} className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <Link
                  href={`/prompts/${activity.promptId}`}
                  className={`font-semibold mb-1 block hover:underline ${
                    prompt?.is_archived
                      ? 'text-gray-500 line-through'
                      : 'text-indigo-400'
                  }`}
                >
                  {activity.promptName || 'Prompt Name Missing'}
                </Link>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatTimestamp(activity.created_at)}
                </span>
              </div>

              {activity.commit_message && (
                <p className="text-sm text-gray-400 italic mb-2 line-clamp-1">
                  &quot;{activity.commit_message}&quot; (v{activity.version})
                </p>
              )}

              <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                {prompt?.task_description || 'Loading description...'}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-2">
                  <Link
                    href={`/prompts/${activity.promptId}`}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </Link>

                  <button
                    onClick={() => onCopy(activity.promptId)}
                    className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                      copiedPromptId === activity.promptId
                        ? 'bg-green-600'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    disabled={!prompt}
                  >
                    {copiedPromptId === activity.promptId ? 'Copied!' : 'Copy'}
                  </button>

                  <button
                    onClick={() =>
                      prompt && onArchive(activity.promptId, !prompt.is_archived)
                    }
                    className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                    title={prompt?.is_archived ? 'Unarchive' : 'Archive'}
                    disabled={!prompt}
                  >
                    {prompt?.is_archived ? (
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                    ) : (
                      <ArchiveBoxIcon className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onDelete(activity.promptId)}
                    className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    title="Delete"
                    disabled={!prompt}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-shrink-0">
                  {activity.promptId && <SendToLlm promptId={activity.promptId} />}
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

        <label className="flex items-center cursor-pointer">
          <span className="mr-3 text-sm text-gray-400">Archived</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived(!showArchived)}
              className="sr-only"
            />
            <div
              className={`block w-14 h-8 rounded-full transition-colors ${
                showArchived ? 'bg-green-500' : 'bg-gray-700'
              }`}
            ></div>
            <div
              className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                showArchived ? 'translate-x-full' : ''
              }`}
            ></div>
          </div>
        </label>
      </div>

      <div className="overflow-y-auto flex-grow">{renderContent()}</div>
    </div>
  );
};

export default RecentActivityWidget;
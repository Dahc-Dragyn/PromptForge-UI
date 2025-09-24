// src/components/RecentActivityWidget.tsx
'use client';

import Link from 'next/link';
import { ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  promptId: string;
  promptName: string;
  version: number;
  commit_message: string;
  created_at: string;
}

interface RecentActivityWidgetProps {
  recentVersions: Activity[];
  loading: boolean;
  error: any;
  handleDeletePrompt: (promptId: string) => void;
}

const RecentActivityWidget = ({ recentVersions, loading, error, handleDeletePrompt }: RecentActivityWidgetProps) => {
  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full">
        <h3 className="font-bold text-lg text-white mb-2">Recent Activity</h3>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  // FIX: Check if the error object exists and display a message instead of crashing.
  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full">
        <h3 className="font-bold text-lg text-white mb-2">Recent Activity</h3>
        <p className="text-red-400">Error loading recent activity.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg text-white mb-4 flex items-center">
        <ClockIcon className="h-6 w-6 mr-2 text-indigo-400" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {recentVersions.length > 0 ? recentVersions.map((version) => (
          <div key={version.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
            <div>
              <Link href={`/prompts/${version.promptId}`} className="text-white hover:text-indigo-30 Hercai font-semibold">
                {version.promptName}
              </Link>
              <p className="text-sm text-gray-400">
                v{version.version} - {version.commit_message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
              </p>
            </div>
            <button 
              onClick={() => handleDeletePrompt(version.promptId)} 
              title="Delete Prompt"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        )) : <p className="text-gray-400">No recent activity to display.</p>}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
// src/components/RecentActivityWidget.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

interface RecentActivityWidgetProps {
  recentVersions: any[];
  loading: boolean;
  error: string | null;
  handleDeletePrompt: (promptId: string) => void;
}

const RecentActivityWidget = ({ recentVersions, loading, error, handleDeletePrompt }: RecentActivityWidgetProps) => {
  const [copiedVersionId, setCopiedVersionId] = useState<string | null>(null);

  const handleCopy = (text: string, versionId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVersionId(versionId);
      setTimeout(() => setCopiedVersionId(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg h-full">
        <h3 className="text-xl font-bold mb-4 text-white">Recent Activity</h3>
        <p className="text-gray-400">Loading activity feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg h-full">
        <h3 className="text-xl font-bold mb-4 text-white">Recent Activity</h3>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-white">Recent Activity</h3>
      {recentVersions.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500 text-center text-sm">No recent prompt versions found.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recentVersions.map((v) => (
            <li key={`${v.promptId}-${v.id}`} className="p-3 bg-gray-700 rounded-lg">
              <p className="text-sm font-semibold text-white">
                <Link href={`/prompts/${v.promptId}`} className="hover:underline">
                  {v.promptName}
                </Link>
                <span className="text-xs font-normal text-green-400 ml-2">v{v.version}</span>
              </p>
              <p className="text-sm text-gray-300 italic my-1">"{v.commit_message}"</p>
              <p className="text-xs text-gray-500 mb-3">
                {v.created_at ? timeAgo(new Date(v.created_at.seconds * 1000)) : 'Just now'}
              </p>
              <div className="flex items-center gap-2">
                <Link href={`/prompts/${v.promptId}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  View
                </Link>
                <button 
                  onClick={() => handleCopy(v.prompt_text, v.id)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${copiedVersionId === v.id ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                >
                  {copiedVersionId === v.id ? 'Copied!' : 'Copy'}
                </button>
                 <button 
                  onClick={() => handleDeletePrompt(v.promptId)}
                  className="px-3 py-1 text-xs bg-red-600/60 text-white rounded hover:bg-red-700/80"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentActivityWidget;
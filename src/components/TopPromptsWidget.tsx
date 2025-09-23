// src/components/TopPromptsWidget.tsx
'use client';

import Link from 'next/link';
import { ChartBarIcon, DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface HydratedTopPrompt {
  id: string;
  name: string;
  averageRating: number;
  ratingCount: number;
}

interface TopPromptsWidgetProps {
  topPrompts: HydratedTopPrompt[];
  loading: boolean;
  error: any; // Keep `any` to accept the SWR error object
  handleCopyPrompt: (promptId: string) => void;
  handleDeletePrompt: (promptId: string) => void;
}

const TopPromptsWidget = ({ topPrompts, loading, error, handleCopyPrompt, handleDeletePrompt }: TopPromptsWidgetProps) => {
  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="font-bold text-lg text-white mb-2">Top Prompts</h3>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  // FIX: Check if the error object exists and display a message. Do not render the object itself.
  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="font-bold text-lg text-white mb-2">Top Prompts</h3>
        <p className="text-red-400">Error loading top prompts. Please check the API connection.</p>
        <p className="text-xs text-gray-500 mt-2">Details: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="font-bold text-lg text-white mb-4 flex items-center">
        <ChartBarIcon className="h-6 w-6 mr-2 text-indigo-400" />
        Top Prompts
      </h3>
      <div className="space-y-3">
        {topPrompts.length > 0 ? topPrompts.slice(0, 5).map((prompt, index) => (
          <div key={prompt.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
            <div className="flex items-center">
              <span className="text-indigo-400 font-bold mr-3 text-lg">#{index + 1}</span>
              <Link href={`/prompts/${prompt.id}`} className="text-white hover:text-indigo-300 transition-colors">
                {prompt.name}
              </Link>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">({prompt.averageRating.toFixed(1)} stars, {prompt.ratingCount} ratings)</span>
                <button onClick={() => handleCopyPrompt(prompt.id)} title="Copy" className="text-gray-400 hover:text-white transition-colors"><DocumentDuplicateIcon className="h-5 w-5" /></button>
                <button onClick={() => handleDeletePrompt(prompt.id)} title="Delete" className="text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="h-5 w-5" /></button>
            </div>
          </div>
        )) : <p className="text-gray-400">No prompt metrics available yet.</p>}
      </div>
    </div>
  );
};

export default TopPromptsWidget;
// src/components/TopPromptsWidget.tsx
'use client';

import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

// This interface represents the combined data the widget will receive
export interface HydratedTopPrompt {
  id: string;
  name: string;
  averageRating: number;
  ratingCount: number;
}

interface TopPromptsWidgetProps {
  topPrompts: HydratedTopPrompt[];
  loading: boolean;
  error: string | null;
  // We'll pass the handler functions from the dashboard down to the widget
  handleCopyPrompt: (promptId: string) => void;
  handleDeletePrompt: (promptId: string) => void;
}

const TopPromptsWidget = ({ 
  topPrompts, 
  loading, 
  error,
  handleCopyPrompt,
  handleDeletePrompt,
}: TopPromptsWidgetProps) => {

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg h-full">
        <h3 className="text-xl font-bold mb-4 text-white">Top Performing Prompts</h3>
        <p className="text-gray-400">Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg h-full">
        <h3 className="text-xl font-bold mb-4 text-white">Top Performing Prompts</h3>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-white">Top Performing Prompts</h3>
      {topPrompts.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-500 text-center text-sm">
                No ratings submitted yet.
                <br />
                Go to a prompt's versions page to test and rate them!
            </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {topPrompts.map((prompt) => (
            <li key={prompt.id} className="p-3 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-white line-clamp-2 pr-4">
                  {prompt.name}
                </p>
                <div className="flex items-center flex-shrink-0 bg-gray-900 px-2 py-1 rounded-full">
                  <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="font-bold text-white text-sm">{prompt.averageRating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ({prompt.ratingCount} {prompt.ratingCount === 1 ? 'rating' : 'ratings'})
              </p>
              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  View
                </Link>
                <button 
                  onClick={() => handleCopyPrompt(prompt.id)}
                  className="px-3 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
                >
                  Copy
                </button>
                 <button 
                  onClick={() => handleDeletePrompt(prompt.id)}
                  className="px-3 py-1 text-xs bg-red-600/60 text-white rounded hover:bg-red-700/80"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default TopPromptsWidget;
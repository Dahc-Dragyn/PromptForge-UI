// src/components/TopPromptsWidget.tsx
'use client';

import Link from 'next/link';
// CORRECTED: Import the renamed type 'PromptMetric'
import { PromptMetric } from '@/hooks/usePromptMetrics';
import { StarIcon } from '@heroicons/react/24/solid';

interface TopPromptsWidgetProps {
  // CORRECTED: Use the PromptMetric type
  topPrompts: PromptMetric[];
  loading: boolean;
  isError: boolean;
}

const TopPromptsWidget = ({ topPrompts, loading, isError }: TopPromptsWidgetProps) => {
  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Top Prompts</h3>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Top Prompts</h3>
        <p className="text-red-400">Could not load prompts.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-bold text-lg mb-2">Top Prompts by Rating</h3>
      <ul className="space-y-2">
        {topPrompts.map((prompt, index) => (
          <li key={prompt.id} className="text-sm p-2 rounded-md hover:bg-gray-700">
            <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400">
              {index + 1}. {prompt.name}
            </Link>
            <div className="text-xs text-gray-400 flex justify-between items-center mt-1">
              <span>Executions: {prompt.execution_count || 0}</span>
              <span className="flex items-center gap-1">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                {(prompt.average_rating || 0).toFixed(1)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopPromptsWidget;
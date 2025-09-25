// src/components/TopPromptsWidget.tsx
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PromptMetric } from '@/hooks/usePromptMetrics'; // Import the API data type

// This is the shape the component's UI expects
interface HydratedTopPrompt {
  id: string;
  name: string;
  averageRating: number;
  executionCount: number;
  // This property is not provided by the API, so we make it optional or default it.
  ratingCount?: number; 
}

interface TopPromptsWidgetProps {
  topPrompts: PromptMetric[]; // Accept the API data shape directly
  loading: boolean;
  isError: any;
}

const TopPromptsWidget = ({ topPrompts, loading, isError }: TopPromptsWidgetProps) => {
  // Use useMemo to transform the props safely
  const hydratedPrompts: HydratedTopPrompt[] = useMemo(() => {
    return (topPrompts || []).map(p => ({
      id: p.id,
      name: p.name,
      averageRating: p.average_rating,
      executionCount: p.execution_count,
      ratingCount: 0, // Defaulting ratingCount as it's not in the API response
    }));
  }, [topPrompts]);

  if (loading) return <div className="bg-gray-800 p-4 rounded-lg">Loading Top Prompts...</div>;
  if (isError) return <div className="bg-gray-800 p-4 rounded-lg text-red-400">Could not load prompts.</div>;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Top Prompts</h3>
      <ul className="space-y-3">
        {hydratedPrompts.map((prompt) => (
          <li key={prompt.id} className="text-sm">
            <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400 hover:underline">
              {prompt.name}
            </Link>
            <div className="text-xs text-gray-400 flex justify-between">
              <span>Executions: {prompt.executionCount}</span>
              <span>Avg. Rating: {prompt.averageRating.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopPromptsWidget;
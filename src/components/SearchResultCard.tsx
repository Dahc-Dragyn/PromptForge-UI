// src/components/SearchResultCard.tsx
'use client';

import Link from 'next/link';
import SendToLlm from './SendToLlm';
import { PlayIcon } from '@heroicons/react/24/solid';

interface SearchResultCardProps {
  id: string;
  name: string;
  description: string;
  type: 'Prompt' | 'Template';
  tags?: string[];
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
  onQuickExecute?: (id: string) => void;
  isDeleting?: boolean;
  isCopied?: boolean;
  isCopying?: boolean;
}

const SearchResultCard = ({ 
  id, 
  name, 
  description, 
  type, 
  tags,
  onCopy,
  onDelete,
  onQuickExecute,
  isDeleting,
  isCopied,
  isCopying,
}: SearchResultCardProps) => {
  const href = type === 'Prompt' ? `/prompts/${id}` : `/dashboard`;

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
          type === 'Prompt' ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {type}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
      {type === 'Template' && tags && tags.length > 0 && (
         <p className="text-xs text-gray-500 mt-2">Tags: {tags.join(', ')}</p>
      )}
      <div className="mt-4">
        {type === 'Prompt' && onCopy && onDelete && onQuickExecute ? (
          // --- MODIFICATION START ---
          // Changed from flex-col to a single flex row with wrap for responsiveness.
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
            {/* Primary Actions Group */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <Link href={href} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                View Versions
              </Link>
              <button
                onClick={() => onQuickExecute(id)}
                disabled={isCopying || isDeleting}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <PlayIcon className="h-3 w-3" />
                <span>Test</span>
              </button>
              <button 
                onClick={() => onCopy(id)}
                disabled={isCopying || isCopied || isDeleting}
                className={`px-3 py-1 text-xs rounded transition-colors ${isCopied ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
              >
                {isCopying ? '...' : isCopied ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={() => onDelete(id)} 
                disabled={isDeleting || isCopying} 
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            {/* SendToLlm Component will now align to the right on this row */}
            <SendToLlm promptId={id} />
          </div>
          // --- MODIFICATION END ---
        ) : (
          <Link href={href} className="text-sm text-blue-400 hover:underline">
            View in Library &rarr;
          </Link>
        )}
      </div>
    </div>
  );
};

export default SearchResultCard;
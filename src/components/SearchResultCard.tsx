// src/components/SearchResultCard.tsx
'use client';

import Link from 'next/link';
import SendToLlm from './SendToLlm';

interface SearchResultCardProps {
  id: string;
  name: string;
  description: string;
  type: 'Prompt' | 'Template';
  tags?: string[];
  // --- NEW: Props for handling actions and state ---
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
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
        {type === 'Prompt' && onCopy && onDelete ? (
          // --- NEW: Full action button layout for Prompts ---
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <Link href={href} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                View Versions
              </Link>
              <button 
                onClick={() => onCopy(id)}
                disabled={isCopying || isCopied}
                className={`px-3 py-1 text-xs rounded transition-colors ${isCopied ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
              >
                {isCopying ? '...' : isCopied ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={() => onDelete(id)} 
                disabled={isDeleting} 
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            <SendToLlm promptId={id} />
          </div>
        ) : (
          // Original simple link for Templates
          <Link href={href} className="text-sm text-blue-400 hover:underline">
            View in Library &rarr;
          </Link>
        )}
      </div>
    </div>
  );
};

export default SearchResultCard;
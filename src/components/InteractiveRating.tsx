// src/components/InteractiveRating.tsx
'use client';

import { useState } from 'react';
import { usePromptRatingMutations } from '@/hooks/usePromptRatings'; // CORRECTED: Import the new mutations hook
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

// This component is now "dumb" and receives all data as props.
interface InteractiveRatingProps {
  promptId: string;
  averageRating: number;
  ratingCount: number;
}

const InteractiveRating = ({ promptId, averageRating, ratingCount }: InteractiveRatingProps) => {
  // CORRECTED: Use the new mutations hook, which does not fetch data.
  const { ratePrompt, removeRating, isSubmitting } = usePromptRatingMutations();
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (starValue: number) => {
    const action = (starValue === Math.round(averageRating) && ratingCount > 0)
      ? removeRating(promptId)
      : ratePrompt(promptId, starValue);

    toast.promise(action, {
      loading: 'Submitting rating...',
      success: 'Rating updated!',
      error: (err) => err.message || 'Failed to update rating.',
    });
  };
  
  return (
    <div className="flex items-center space-x-2 mt-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSubmitting}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StarIcon
              className={`w-5 h-5 transition-colors ${
                (hoverRating >= star || Math.round(averageRating) >= star)
                  ? 'text-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      {ratingCount > 0 && (
       <p className="text-xs text-gray-400">
         {averageRating.toFixed(1)} ({ratingCount})
       </p>
      )}
    </div>
  );
};

export default InteractiveRating;
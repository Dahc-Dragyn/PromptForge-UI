// src/components/InteractiveRating.tsx
'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

interface InteractiveRatingProps {
  promptId: string;
  currentRating: number;
  ratingCount: number;
  onRate: (promptId: string, newRating: number) => void;
  // --- NEW: Add a prop for the removal function ---
  onRemoveRating: (promptId: string) => void;
  isSubmitting: boolean;
}

const InteractiveRating = ({
  promptId,
  currentRating,
  ratingCount,
  onRate,
  onRemoveRating, // <-- new prop
  isSubmitting,
}: InteractiveRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  // --- NEW: Handle click logic to either rate or un-rate ---
  const handleClick = (starValue: number) => {
    // If the user clicks the star that represents the current rating,
    // and there is at least one rating, trigger the remove function.
    if (starValue === Math.round(currentRating) && ratingCount > 0) {
      onRemoveRating(promptId);
    } else {
      onRate(promptId, starValue);
    }
  };

  return (
    <div className="flex items-center space-x-2 mt-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            // --- MODIFIED: Use the new handleClick function ---
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSubmitting}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StarIcon
              className={`w-5 h-5 transition-colors ${
                (hoverRating >= star || currentRating >= star)
                  ? 'text-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      {ratingCount > 0 && (
         <p className="text-xs text-gray-400">
           {currentRating.toFixed(1)} ({ratingCount})
         </p>
      )}
    </div>
  );
};

export default InteractiveRating;
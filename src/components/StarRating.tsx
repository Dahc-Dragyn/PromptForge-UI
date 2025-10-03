'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

interface StarRatingProps {
  currentRating?: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  disabled?: boolean;
}

const StarRating = ({
  currentRating = 0,
  onRatingChange,
  maxRating = 5,
  disabled = false,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverRating(0);
    }
  };

  const handleClick = (rating: number) => {
    if (!disabled) {
      onRatingChange(rating);
    }
  };

  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, index) => {
        const ratingValue = index + 1;
        const isFilled = ratingValue <= (hoverRating || currentRating);

        return (
          <button
            key={ratingValue}
            type="button"
            onMouseEnter={() => handleMouseEnter(ratingValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(ratingValue)}
            disabled={disabled}
            className={`cursor-pointer transition-colors duration-150 ease-in-out ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
            aria-label={`Rate ${ratingValue} out of ${maxRating}`}
          >
            <StarIcon
              className={`h-5 w-5 ${
                isFilled ? 'text-yellow-400' : 'text-gray-600'
              } ${!disabled && !isFilled ? 'hover:text-yellow-300' : ''}`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
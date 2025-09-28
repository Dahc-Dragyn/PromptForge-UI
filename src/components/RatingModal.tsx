// src/components/RatingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePromptRatings } from '@/hooks/usePromptRatings'; // Import our new hook

// Define the shape of the version prop locally for this component
interface Version {
  version_number: number;
  prompt_text: string;
  commit_message?: string;
}

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  version: Version | null;
}

const RatingModal = ({ isOpen, onClose, promptId, version }: RatingModalProps) => {
  const [result, setResult] = useState<{ text: string; latency: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentRating, setCurrentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  
  // Use our SWR hook for rating mutations
  const { ratePrompt, isSubmitting } = usePromptRatings(promptId);

  // Reset state when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setIsLoading(false);
      setError(null);
      setCurrentRating(0);
      setHoverRating(0);
    }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!version) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentRating(0);

    try {
      const startTime = performance.now();
      // CORRECTED: Use apiClient and relative path
      const data = await apiClient.post<{ final_text: string }>('/prompts/execute', {
        prompt_text: version.prompt_text,
        model: 'gemini-2.5-flash-lite',
        variables: {},
      });
      const endTime = performance.now();
      
      setResult({
        text: data.final_text,
        latency: endTime - startTime,
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to execute prompt.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async (newRating: number) => {
    if (!result || isSubmitting) return;

    setCurrentRating(newRating);
    
    const promise = ratePrompt(newRating);

    toast.promise(promise, {
        loading: 'Saving rating...',
        success: 'Rating saved!',
        error: 'Failed to save rating.'
    });

    // Close modal after success
    promise.then(onClose);
  };

  if (!version) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Test & Rate Prompt Version ${version.version_number}`}>
      <div className="space-y-4 text-white">
        <div>
          <p className="text-sm text-gray-400 mb-2">Commit: <span className="italic text-gray-300">"{version.commit_message || 'N/A'}"</span></p>
          <label className="block text-sm font-medium text-gray-400 mb-1">Prompt Text</label>
          <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-3 rounded-md text-sm font-mono max-h-32 overflow-y-auto">
            {version.prompt_text}
          </pre>
        </div>
        
        {!result && (
          <button 
            onClick={handleExecute} 
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
          >
            {isLoading ? 'Executing...' : 'Execute Prompt'}
          </button>
        )}

        {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        
        {result && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Result (Latency: {Math.round(result.latency)}ms)</label>
              <div className="text-gray-200 bg-gray-900 p-3 rounded-md whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-sm">
                  {result.text}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Based on this output, rate the prompt:</h4>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingSubmit(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isSubmitting}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <StarIcon
                      className={`w-7 h-7 transition-colors ${
                        (hoverRating >= star || currentRating >= star)
                          ? 'text-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button 
                onClick={handleExecute} 
                disabled={isLoading}
                className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 font-semibold text-sm transition-colors"
              >
                {isLoading ? 'Executing...' : 'Run Again'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RatingModal;
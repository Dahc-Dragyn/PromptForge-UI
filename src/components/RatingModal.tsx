// src/components/RatingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const API_EXECUTE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/execute`;

// --- FIX: Define a strong type for the version prop for better type safety ---
interface Version {
  version: number;
  prompt_text: string;
  commit_message: string;
}

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  version: Version | null; // Use the new, strongly-typed Version
  userId?: string;
}

const RatingModal = ({ isOpen, onClose, promptId, version, userId }: RatingModalProps) => {
  const [result, setResult] = useState<{ text: string; latency: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentRating, setCurrentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- FIX: Add an effect to reset the modal's state when it opens ---
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setIsLoading(false);
      setError(null);
      setCurrentRating(0);
      setHoverRating(0);
      setIsSubmitting(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!version) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentRating(0);
    setShowSuccess(false);

    try {
      const startTime = performance.now();
      const response = await fetch(API_EXECUTE_URL, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_text: version.prompt_text }),
      });
      const endTime = performance.now();

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to execute prompt.');
      
      setResult({
        text: data.generated_text,
        latency: endTime - startTime,
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async (newRating: number) => {
    if (!userId || !result || isSubmitting || !version) return;

    setIsSubmitting(true);
    setCurrentRating(newRating);
    
    const newMetric = {
      source: 'version_testing',
      promptId: promptId,
      promptVersion: version.version,
      promptText: version.prompt_text,
      generatedText: result.text,
      model: 'default',
      latency: result.latency,
      rating: newRating,
      createdAt: serverTimestamp(),
      userId: userId,
    };

    try {
      await addDoc(collection(db, 'prompt_metrics'), newMetric);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Rating submission failed:", error);
      setCurrentRating(0);
      toast.error("Failed to save rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!version) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Test & Rate Prompt Version ${version.version}`}>
      <div className="space-y-4 text-white">
        <div>
          <p className="text-sm text-gray-400 mb-2">Commit: <span className="italic text-gray-300">"{version.commit_message}"</span></p>
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
                {showSuccess && <p className="ml-4 text-xs text-green-400 animate-pulse">Rating saved!</p>}
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
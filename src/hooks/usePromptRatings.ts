// src/hooks/usePromptRatings.ts
import useSWR, { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';

export interface PromptRatingSummary {
  prompt_id: string;
  average_rating: number;
  rating_count: number;
}

const fetcher = (url: string) => apiClient.get<PromptRatingSummary>(url);

// This hook is ONLY for fetching a single rating summary.
// We will NOT use this on the dashboard.
export function usePromptRatingSummary(promptId: string | null) {
  const key = promptId ? `/metrics/ratings/${promptId}` : null;
  const { data, error, isLoading } = useSWR<PromptRatingSummary>(key, fetcher);
  return { data, error, isLoading };
}


// THIS IS THE NEW HOOK FOR OUR COMPONENT TO USE
// It ONLY contains mutation logic and does NOT fetch data on its own.
export function usePromptRatingMutations() {
  const { mutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratePrompt = async (promptId: string, rating: number): Promise<void> => {
    if (!promptId) throw new Error("A promptId is required to submit a rating.");
    
    setIsSubmitting(true);
    try {
      await apiClient.post(`/metrics/ratings`, { prompt_id: promptId, rating });
      // After rating, we revalidate the main prompts list to get the new average
      mutate('/prompts/');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeRating = async (promptId: string): Promise<void> => {
    if (!promptId) throw new Error("A promptId is required to remove a rating.");
    
    setIsSubmitting(true);
    try {
      await apiClient.del(`/metrics/ratings/${promptId}`);
      mutate('/prompts/');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    ratePrompt,
    removeRating,
  };
}
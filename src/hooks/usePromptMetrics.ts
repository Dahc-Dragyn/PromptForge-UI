// src/hooks/usePromptMetrics.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';

// This is the shape of the data returned by the backend API
export interface PromptMetric {
  id: string;
  name: string;
  average_rating: number;
  execution_count: number;
}

const fetcher = (url: string) => apiClient.get<PromptMetric[]>(url);

export function useTopPrompts() {
  const { data, error, isLoading } = useSWR('/metrics/prompts/all', fetcher);

  return {
    topPrompts: data,
    isLoading,
    isError: error,
  };
}
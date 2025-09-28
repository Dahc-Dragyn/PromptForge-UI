// src/hooks/usePromptMetrics.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';

// CORRECTED: Interface properties now use snake_case to match the API response.
// Renamed to PromptMetric for clarity.
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
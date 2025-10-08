import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth

// Interface properties are correctly using snake_case
export interface PromptMetric {
  id: string;
  name: string;
  average_rating: number;
  execution_count: number;
}

// 2. FIX FETCHER to correctly handle the Axios response
const fetcher = async (url: string): Promise<PromptMetric[]> => {
    const { data } = await apiClient.get<PromptMetric[]>(url);
    return data;
};

export function useTopPrompts() {
  const { user } = useAuth(); // 3. Get the authenticated user
  const userId = user?.uid;

  const endpoint = '/metrics/prompts/all';
  
  // 4. Create the user-specific key for SWR
  const key = userId ? [endpoint, userId] : null;

  const { data, error, isLoading } = useSWR<PromptMetric[]>(key, () => fetcher(endpoint));

  return {
    topPrompts: data,
    isLoading: !error && !data && !!userId, // Correct loading state
    isError: error,
  };
}
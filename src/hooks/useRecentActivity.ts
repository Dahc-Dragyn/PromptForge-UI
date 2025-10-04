// src/hooks/useRecentActivity.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { ActivityItem } from '@/types/prompt';

// This interface describes the actual, mismatched data from the API
interface RawActivityFromApi {
  id: string;
  promptId: string;
  promptName: string;
  version: number;
  created_at: string;
}

const fetcher = async (url: string): Promise<ActivityItem[]> => {
  // 1. Fetch the raw data, which we know has the wrong shape.
  const response = await apiClient.get<RawActivityFromApi[]>(url);

  // 2. If there's no data, return an empty array to prevent errors.
  if (!Array.isArray(response)) {
    return [];
  }

  // 3. Transform each incorrect item into the correct ActivityItem shape.
  return response.map(item => ({
    id: item.id || `${item.promptId}-${item.version}`, // Ensure a unique ID
    prompt_id: item.promptId,                         // Map camelCase to snake_case
    prompt_name: item.promptName,                     // Map camelCase to snake_case
    action: item.version === 1 ? 'CREATED' : 'UPDATED', // Infer the 'action'
    timestamp: item.created_at,                       // Map 'created_at' to 'timestamp'
  }));
};

export function useRecentActivity() {
  const { data, error, isLoading } = useSWR<ActivityItem[]>('/metrics/activity/recent', fetcher);

  return {
    activities: data,
    isLoading,
    isError: error,
  };
}
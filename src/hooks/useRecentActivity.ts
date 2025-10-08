import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { ActivityItem } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth

// This interface describes the raw, mismatched data from the API
interface RawActivityFromApi {
  id: string;
  promptId: string;
  promptName: string;
  version: number;
  created_at: string;
}

const fetcher = async (url: string): Promise<ActivityItem[]> => {
  // 2. FIX: Destructure 'data' from the apiClient response to get the actual array
  const { data: responseData } = await apiClient.get<RawActivityFromApi[]>(url);

  if (!Array.isArray(responseData)) {
    return [];
  }

  // Transform each item into the correct ActivityItem shape that the frontend expects
  return responseData.map(item => ({
    id: item.id || `${item.promptId}-${item.version}`,
    prompt_id: item.promptId,
    prompt_name: item.promptName,
    action: item.version === 1 ? 'CREATED' : 'UPDATED',
    timestamp: item.created_at,
  }));
};

export function useRecentActivity() {
  const { user } = useAuth(); // 3. Get the current user
  const userId = user?.uid;

  const endpoint = '/metrics/activity/recent';
  
  // 4. Create a user-specific key. SWR will not fetch if there is no user.
  const key = userId ? [endpoint, userId] : null;

  const { data, error, isLoading } = useSWR<ActivityItem[]>(key, () => fetcher(endpoint));

  return {
    activities: data,
    isLoading: !error && !data && !!userId, // Loading is true only if there's a user
    isError: error,
  };
}
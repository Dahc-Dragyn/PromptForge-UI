// src/hooks/useRecentActivity.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ActivityItem } from '@/types/prompt'; // Import the UI type

// Type for the raw API response
interface ApiActivity {
  id: string;
  activity_type: string; // API uses this name
  prompt_name: string;
  timestamp: string;
  prompt_id: string;
}

// Custom fetcher to map API response to UI type
const fetcher = async (key: [string, string]): Promise<ActivityItem[]> => {
  const [url] = key; // Extract URL from the array key
  const apiData = (await apiClient.get(url)) as ApiActivity[];
  // Map 'activity_type' to 'action'
  return (apiData || []).map(item => ({
    ...item,
    action: item.activity_type, // Rename the field
  }));
};

export function useRecentActivity(limit: number = 10) {
  const { user } = useAuth();
  const userId = user?.uid;

  // FIX: Added trailing slash
  const endpoint = `/metrics/activity/recent/?limit=${limit}`;

  // FIX: User-aware array key
  const key = userId ? [endpoint, userId] : null;

  // Use the custom fetcher and the correct return type
  const { data, error } = useSWR<ActivityItem[]>(key, fetcher);

  return {
    activities: data,
    isLoading: !error && !data && !!userId,
    isError: error,
  };
}
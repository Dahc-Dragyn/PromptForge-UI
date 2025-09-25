// src/hooks/useRecentActivity.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';

// This is the shape of the data returned by the backend API
export interface ActivityLog {
  id: string;
  prompt_name: string;
  version_number: number;
  event_type: 'execution' | 'creation' | 'update';
  timestamp: string; // ISO 8601 date string
  user_name: string;
}

const fetcher = (url: string) => apiClient.get<ActivityLog[]>(url);

export function useRecentActivity() {
  const { data, error, isLoading } = useSWR('/metrics/activity/recent', fetcher);

  return {
    activities: data,
    isLoading,
    isError: error,
  };
}
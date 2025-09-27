// src/hooks/useRecentActivity.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { ActivityItem } from '@/types/prompt'; // Using the existing shared type

const fetcher = (url: string) => apiClient.get<ActivityItem[]>(url);

export function useRecentActivity() {
  const { data, error, isLoading } = useSWR('/metrics/activity/recent', fetcher);

  return {
    activities: data,
    isLoading,
    isError: error,
  };
}
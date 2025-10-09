import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

// Define a type for the activity items for better safety
interface Activity {
    id: string;
    activity_type: string;
    prompt_name: string;
    timestamp: string;
    prompt_id: string;
}

const fetcher = async (url: string | null): Promise<Activity[]> => {
    if (!url) {
        return [];
    }
    return (await apiClient.get(url)) as Activity[];
};

export function useRecentActivity(limit: number = 10) {
    const { user } = useAuth();

    // --- DEFINITIVE FIX APPLIED HERE ---
    // Added the "/metrics" prefix to match the backend API router.
    const key = user ? `/metrics/activity/recent?limit=${limit}` : null;
    
    const { data, error, isLoading } = useSWR(key, fetcher);

    return {
        activities: data,
        isLoading,
        isError: error,
    };
}
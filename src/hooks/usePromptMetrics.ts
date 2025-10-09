import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

// Interface properties are correctly using snake_case
export interface PromptMetric {
    id: string;
    name: string;
    average_rating: number;
    execution_count: number;
}

// --- DEFINITIVE FIX APPLIED HERE ---
const fetcher = async (url: string | null): Promise<PromptMetric[]> => {
    if (!url) {
        return []; // Guard against null URLs
    }
    // We explicitly cast the response to the type we know it will be.
    return (await apiClient.get(url)) as PromptMetric[];
};

export function useTopPrompts() {
    const { user } = useAuth();
    const userId = user?.uid;

    const endpoint = '/metrics/prompts/all';
    
    // The key is now just the endpoint string, which the fetcher receives.
    const key = userId ? endpoint : null;

    const { data, error, isLoading } = useSWR<PromptMetric[]>(key, fetcher);

    return {
        topPrompts: data,
        isLoading: !error && !data && !!userId,
        isError: error,
    };
}
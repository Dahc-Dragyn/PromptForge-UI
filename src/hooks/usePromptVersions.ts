import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';

// 1. FINAL FETCHER FIX: We explicitly cast the result of apiClient.get
// to the type we know the interceptor will return.
const fetcher = async (url: string | null): Promise<PromptVersion[]> => {
    if (!url) {
        return [];
    }
    // We tell TypeScript to trust that the response is a PromptVersion array.
    return (await apiClient.get(url)) as PromptVersion[];
};

export function usePromptVersions(promptId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid;

    const key = promptId && userId ? `/prompts/${promptId}/versions` : null;

    const { data, error, isLoading } = useSWR<PromptVersion[]>(key, fetcher);

    const createVersion = async (
        prompt_text: string,
        commit_message?: string
    ): Promise<PromptVersion> => {
        if (!promptId || !userId) {
            throw new Error("Prompt ID and user authentication are required to create a new version.");
        }

        // 2. FINAL CREATE FIX: We apply the same explicit cast here.
        // The post request returns a single PromptVersion object.
        const newVersion = (await apiClient.post(`/prompts/${promptId}/versions`, {
            prompt_text,
            commit_message,
        })) as PromptVersion;

        mutate(key);
        return newVersion;
    };

    return {
        versions: data,
        isLoading: !error && !data && !!key,
        isError: error,
        createVersion,
    };
}
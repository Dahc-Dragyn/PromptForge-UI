import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

// Since it's not exported from the main types file, we define the type here.
interface PromptRating {
    id: string;
    version_id: string;
    rating: number;
    comment?: string;
    created_at: string;
}

// --- DEFINITIVE FIX APPLIED HERE ---
const fetcher = async (url: string | null): Promise<PromptRating[]> => {
    if (!url) {
        return []; // Guard against null URLs
    }
    // We explicitly cast the response to the type we know it will be.
    return (await apiClient.get(url)) as PromptRating[];
};

export function usePromptRatings(promptId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid;

    const key = promptId && userId ? `/prompts/${promptId}/ratings` : null;

    const { data, error, isLoading } = useSWR<PromptRating[]>(key, () => fetcher(key));

    const submitRating = async (versionId: string, rating: number, comment?: string) => {
        if (!key || !promptId) {
            throw new Error("Cannot submit rating without a valid prompt and user.");
        }

        const newRatingPayload = {
            version_id: versionId,
            rating: rating,
            comment: comment,
        };

        // --- DEFINITIVE FIX APPLIED HERE ---
        // The response from post IS the new rating object. We do not destructure { data }.
        const newRating = (await apiClient.post(`/prompts/${promptId}/ratings`, newRatingPayload)) as PromptRating;

        // Mutate the local cache optimistically
        mutate((currentRatings: PromptRating[] | undefined = []) => {
            return [...currentRatings, newRating];
        }, false); // Set revalidate to false as the server has confirmed the new state

        return newRating;
    };

    return {
        ratings: data,
        isLoading: !error && !data && !!key,
        isError: error,
        submitRating,
    };
}
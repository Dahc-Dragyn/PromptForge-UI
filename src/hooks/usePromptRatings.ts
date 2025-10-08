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

const fetcher = async (url: string): Promise<PromptRating[]> => {
    const { data } = await apiClient.get<PromptRating[]>(url);
    return data;
};

export function usePromptRatings(promptId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid;

    const key = promptId && userId ? [`/prompts/${promptId}/ratings`, userId] : null;

    const { data, error, isLoading } = useSWR<PromptRating[]>(key, () => fetcher(`/prompts/${promptId}/ratings`));

    const submitRating = async (versionId: string, rating: number, comment?: string) => {
        if (!key || !promptId) {
            throw new Error("Cannot submit rating without a valid prompt and user.");
        }
        
        const newRatingPayload = {
            version_id: versionId,
            rating: rating,
            comment: comment,
        };

        const { data: newRating } = await apiClient.post<PromptRating>(`/prompts/${promptId}/ratings`, newRatingPayload);

        // FIX IS HERE: We add the explicit type for the 'currentRatings' parameter.
        mutate((currentRatings: PromptRating[] | undefined) => {
            const ratingsArray = Array.isArray(currentRatings) ? currentRatings : [];
            return [...ratingsArray, newRating];
        }, true);
        
        return newRating;
    };

    return {
        ratings: data,
        isLoading: !error && !data && !!key,
        isError: error,
        submitRating,
    };
}
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth

// 2. FIX FETCHER to correctly destructure the data from the Axios response
const fetcher = async (url: string): Promise<PromptVersion[]> => {
    const { data } = await apiClient.get<PromptVersion[]>(url);
    return data;
};

export function usePromptVersions(promptId: string | null) {
  const { user } = useAuth(); // 3. Get the authenticated user
  const userId = user?.uid;

  // 4. Create the user-specific key. It will be null if there's no user or promptId.
  const key = promptId && userId ? [`/prompts/${promptId}/versions`, userId] : null;
  
  const { data, error, isLoading } = useSWR<PromptVersion[]>(key, fetcher);

  const createVersion = async (
    prompt_text: string,
    commit_message?: string
  ): Promise<PromptVersion> => {
    if (!promptId || !userId) {
      throw new Error("Prompt ID and user authentication are required to create a new version.");
    }

    // 5. FIX: Destructure the 'data' from the post request's response
    const { data: newVersion } = await apiClient.post<PromptVersion>(`/prompts/${promptId}/versions`, {
      prompt_text,
      commit_message,
    });
    
    // Revalidate the versions list for this specific prompt using the user-aware key
    mutate(key); 
    
    return newVersion; // Now returns the correct PromptVersion object
  };

  return {
    versions: data,
    isLoading: !error && !data && !!key, // Loading is true only if we have a key
    isError: error,
    createVersion,
  };
}
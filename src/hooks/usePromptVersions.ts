import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptVersion } from '@/types/prompt';
import { apiClient } from '@/lib/apiClient';

// Fetcher for lists
const listFetcher = async (key: [string, string]): Promise<PromptVersion[]> => {
  const [url] = key;
  // Our interceptor handles .data
  const versions = await apiClient.get<PromptVersion[]>(url);
  return Array.isArray(versions) ? versions : [];
};

export function usePromptVersions(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  // Endpoint needs the trailing slash
  const endpoint = `/prompts/${promptId}/versions/`;
  const key = user && promptId ? [endpoint, userId] : null;

  // --- FIX: Corrected destructuring from 'D' and added types ---
  const { data, error, mutate } = useSWR<PromptVersion[]>(key, listFetcher);

  // --- THIS IS THE FIX ---
  // 1. The function signature now correctly accepts an object.
  //    This will fix the ts(2345) error in EditPromptModal.tsx.
  const createVersion = async (versionData: { prompt_text: string; commit_message?: string }) => {
    if (!userId || !promptId) throw new Error('User or Prompt ID not available');
    
    // 2. The payload (versionData) is now sent flat.
    //    This will fix the 422 Unprocessable Entity error.
    const newVersion = await apiClient.post<PromptVersion>(
        `/prompts/${promptId}/versions/`,
        versionData // Pass the flat object directly
    );
    // --- END FIX ---

    // Revalidate this list
    mutate(); 
    // Also revalidate the parent prompt's detail to update its `latest_version_number`
    globalMutate([`/prompts/${promptId}`, userId]);
    // And revalidate the main prompt lists
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);

    return newVersion;
  };

  // --- FIX: Added explicit types for sort parameters ---
  const versions = data ? data.sort((a: PromptVersion, b: PromptVersion) => b.version_number - a.version_number) : undefined;

  return {
    versions,
    isLoading: !error && !data && !!key,
    isError: error,
    createVersion,
    mutate,
  };
}
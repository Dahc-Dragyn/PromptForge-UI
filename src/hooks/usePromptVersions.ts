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

/**
 * Custom hook to fetch and manage prompt versions for a given promptId.
 *
 * @param promptId The ID of the prompt whose versions to fetch.
 */
export function usePromptVersions(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  // Key for SWR: only fetch if user and promptId are available
  const endpoint = `/prompts/${promptId}/versions`;
  const key = user && promptId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptVersion[]>(key, listFetcher);

  // The 'S' that caused the syntax error has been removed.
  const createVersion = async (versionData: { prompt_text: string; commit_message?: string }) => {
    if (!userId || !promptId) throw new Error('User or Prompt ID not available');
    
    const newVersion = await apiClient.post<PromptVersion>(
      `/prompts/${promptId}/versions`,
      versionData 
    );

    // Revalidate the current list of versions
    mutate(); 
    
    // Also revalidate other related data that might be affected
    // 1. Revalidate the parent prompt's detail (to update its `latest_version_number`)
    globalMutate([`/prompts/${promptId}`, userId]);
    // 2. Revalidate the main prompt lists
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);

    return newVersion;
  };

  // Sort versions by version_number descending
  const versions = data ? data.sort((a: PromptVersion, b: PromptVersion) => b.version_number - a.version_number) : undefined;

  return {
    versions,
    isLoading: !error && !data && !!key,
    isError: error,
    createVersion,
    mutate,
  };
}
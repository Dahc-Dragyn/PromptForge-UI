/* src/hooks/usePrompts.ts */
import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';
import { AxiosResponse } from 'axios';
import { useCallback } from 'react';

/* -------------------------------------------------------------------------- */
/*                               TYPE DEFINITIONS                             */
/* -------------------------------------------------------------------------- */
type PromptListKey = readonly [`/prompts` | `/prompts?include_archived=true`, string];
type PromptDetailKey = readonly [`/prompts/${string}`, string];

interface CreatePromptData {
  name: string;
  description: string;   // UI field
  text: string;          // UI field
}

/* -------------------------------------------------------------------------- */
/*                                 FETCHERS                                   */
/* -------------------------------------------------------------------------- */
const listFetcher = async (key: PromptListKey): Promise<Prompt[]> => {
  const [url] = key;
  const resp = await apiClient.get<Prompt[]>(url);
  const data = (resp as AxiosResponse<Prompt[]>).data ?? (resp as Prompt[]);
  return Array.isArray(data)
    ? data.map(p => ({ ...p, is_archived: p.is_archived ?? false }))
    : [];
};

const singleFetcher = async (key: PromptDetailKey): Promise<Prompt | null> => {
  const [url] = key;
  try {
    const resp = await apiClient.get<Prompt>(url);
    return (resp as AxiosResponse<Prompt>).data ?? (resp as Prompt);
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
};

/* -------------------------------------------------------------------------- */
/*                            GLOBAL REVALIDATOR                               */
/* -------------------------------------------------------------------------- */
const revalidateAllRelatedCaches = (userId: string) => {
  // 1. All list endpoints
  globalMutate([`/prompts`, userId]);
  globalMutate([`/prompts?include_archived=true`, userId]);

  // 2. **Every** possible detail cache – we don’t know the IDs,
  //    but SWR will simply ignore keys that don’t exist.
  //    This is cheap because SWR uses an LRU map internally.
  //    (If you have thousands of prompts you can keep a Set<PromptDetailKey>
  //     in a separate context and iterate over it – optional optimisation.)
  //    For now we just clear the *pattern* – SWR supports a matcher:
  globalMutate(
    (k: any) => typeof k === 'object' && k[0]?.startsWith('/prompts/') && k[1] === userId,
    undefined,
    { revalidate: true }
  );
};

/* -------------------------------------------------------------------------- */
/*                               usePrompts HOOK                              */
/* -------------------------------------------------------------------------- */
export function usePrompts(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  const key: PromptListKey | null = userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher, {
    // keepPreviousData while revalidating – prevents UI flicker
    keepPreviousData: true,
  });

  /* ---------------------------------------------------------------------- */
  /*                              CREATE                                    */
  /* ---------------------------------------------------------------------- */
  const createPrompt = useCallback(
    async (promptData: CreatePromptData): Promise<Prompt> => {
      if (!userId) throw new Error('User must be logged in.');

      const payload = {
        name: promptData.name,
        task_description: promptData.description,
        initial_prompt_text: promptData.text,
      };

      const resp = await apiClient.post<Prompt>('/prompts/', payload);
      const newPrompt = (resp as AxiosResponse<Prompt>).data ?? (resp as Prompt);

      // Invalidate *everything* – the new prompt will appear on the next fetch
      revalidateAllRelatedCaches(userId);
      return newPrompt;
    },
    [userId]
  );

  /* ---------------------------------------------------------------------- */
  /*                              UPDATE                                    */
  /* ---------------------------------------------------------------------- */
  const updatePrompt = useCallback(
    async (promptId: string, updates: { name?: string; task_description?: string }) => {
      if (!userId) throw new Error('User must be logged in.');

      const resp = await apiClient.patch<Prompt>(`/prompts/${promptId}`, updates);
      const updated = (resp as AxiosResponse<Prompt>).data ?? (resp as Prompt);

      // Optimistically push to the *detail* cache
      globalMutate([`/prompts/${promptId}`, userId], updated, { revalidate: false });
      revalidateAllRelatedCaches(userId);
      return updated;
    },
    [userId]
  );

  /* ---------------------------------------------------------------------- */
  /*                              DELETE                                    */
  /* ---------------------------------------------------------------------- */
  const deletePrompt = useCallback(
    async (promptId: string) => {
      if (!userId || !key) return;

      const current = data ?? [];
      const optimistic = current.filter(p => p.id !== promptId);

      // 1. Optimistic UI
      mutate(optimistic, { revalidate: false });

      try {
        await apiClient.delete(`/prompts/${promptId}`);

        // 2. **CRITICAL** – wipe the single-prompt cache entry
        globalMutate([`/prompts/${promptId}`, userId], null, { revalidate: false });

        // 3. Refresh every list (removes the ID before any widget tries to read it)
        revalidateAllRelatedCaches(userId);
      } catch (e) {
        // Rollback
        mutate(current, { revalidate: false });
        console.error('Failed to delete prompt:', e);
        throw e;
      }
    },
    [userId, key, data, mutate]
  );

  /* ---------------------------------------------------------------------- */
  /*                              ARCHIVE                                   */
  /* ---------------------------------------------------------------------- */
  const archivePrompt = useCallback(
    async (promptId: string, isArchived: boolean) => {
      if (!userId || !key) return;

      const current = data ?? [];

      // Compute the *final* shape **without** touching the network yet
      const finalData = current
        .map(p => (p.id === promptId ? { ...p, is_archived: isArchived } : p))
        .filter(p => includeArchived || !p.is_archived);

      try {
        // 1. Real API call (no optimistic UI)
        await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });

        // 2. Manual flash – update the *current* list instantly
        mutate(finalData, { revalidate: false });

        // 3. Lazy-sync the *other* list after Firestore settles
        const otherKey: PromptListKey = includeArchived
          ? [`/prompts`, userId]
          : [`/prompts?include_archived=true`, userId];

        setTimeout(() => globalMutate(otherKey), 300);

        // 4. Also wipe the detail cache (archived prompts still exist)
        globalMutate([`/prompts/${promptId}`, userId], undefined, { revalidate: true });
      } catch (e) {
        console.error('Failed to archive prompt:', e);
        throw e;
      }
    },
    [userId, key, data, mutate, includeArchived]
  );

  /* ---------------------------------------------------------------------- */
  /*                               RATING                                    */
  /* ---------------------------------------------------------------------- */
  const ratePrompt = useCallback(
    async (promptId: string, versionNumber: number, rating: number) => {
      if (!userId || !key) return;

      const current = data ?? [];
      const prompt = current.find(p => p.id === promptId);

      // If the prompt isn’t in the current list, just fire-and-forget
      if (!prompt) {
        await apiClient.post('/metrics/rate', { prompt_id: promptId, version_number: versionNumber, rating });
        revalidateAllRelatedCaches(userId);
        return;
      }

      const oldAvg = prompt.average_rating ?? 0;
      const oldCnt = prompt.rating_count ?? 0;
      const newCnt = oldCnt + 1;
      const newAvg = (oldAvg * oldCnt + rating) / newCnt;

      const optimistic = current.map(p =>
        p.id === promptId ? { ...p, average_rating: newAvg, rating_count: newCnt } : p
      );

      mutate(optimistic, { revalidate: false });

      try {
        await apiClient.post('/metrics/rate', {
          prompt_id: promptId,
          version_number: versionNumber,
          rating,
        });
        revalidateAllRelatedCaches(userId);
      } catch (e) {
        mutate(current, { revalidate: false });
        console.error('Failed to submit rating:', e);
        throw e;
      }
    },
    [userId, key, data, mutate]
  );

  /* ---------------------------------------------------------------------- */
  /*                               RETURN API                                 */
  /* ---------------------------------------------------------------------- */
  return {
    prompts: data,
    isLoading: !error && !data && !!userId,
    isError: error,

    createPrompt,
    updatePrompt,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  };
}

/* -------------------------------------------------------------------------- */
/*                             usePromptDetail HOOK                           */
/* -------------------------------------------------------------------------- */
export function usePromptDetail(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  const key: PromptDetailKey | null =
    promptId && userId ? [`/prompts/${promptId}`, userId] : null;

  const { data, error, mutate } = useSWR<Prompt | null>(key, singleFetcher, {
    // 404 → null, not an error
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      if (err.response?.status === 404) return;
      if (retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 1000 * 2 ** retryCount);
    },
  });

  return {
    prompt: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
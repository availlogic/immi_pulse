import useSWR from 'swr';
import { fetchApi } from '../lib/api';
import { useCallback } from 'react';

export function useCandidates(sort_by = 'video_score') {
  const url = `/candidates?sort_by=${sort_by}`;
  const { data, error, isLoading, mutate } = useSWR(url, fetchApi);

  const starCandidate = useCallback(async (newsId) => {
    try {
      await fetchApi(`/candidates/${newsId}/star`, { method: 'POST' });
      mutate();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [mutate]);

  const unstarCandidate = useCallback(async (newsId) => {
    try {
      await fetchApi(`/candidates/${newsId}/unstar`, { method: 'DELETE' });
      mutate();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [mutate]);

  const updateNotes = useCallback(async (newsId, updates) => {
    try {
      await fetchApi(`/candidates/${newsId}/notes`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      mutate();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [mutate]);

  return {
    candidates: data?.data || [],
    isLoading,
    isError: error,
    mutate,
    starCandidate,
    unstarCandidate,
    updateNotes
  };
}

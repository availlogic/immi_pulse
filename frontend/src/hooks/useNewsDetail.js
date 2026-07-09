import useSWR from 'swr';
import { fetchApi } from '../lib/api';

export function useNewsDetail(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/news/${id}` : null,
    fetchApi
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate
  };
}

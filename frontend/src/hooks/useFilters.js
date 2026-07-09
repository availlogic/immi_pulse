import useSWR from 'swr';
import { fetchApi } from '../lib/api';

export function useFilters() {
  const { data, error, isLoading } = useSWR('/filters', fetchApi);

  return {
    filters: data,
    isLoading,
    isError: error
  };
}

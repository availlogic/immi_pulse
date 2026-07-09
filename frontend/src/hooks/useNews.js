import useSWR from 'swr';
import { fetchApi } from '../lib/api';

export function useNews(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.show_low_relevance) query.append('show_low_relevance', 'true');
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.search) query.append('search', params.search);
  
  if (params.countries?.length) query.append('countries', params.countries.join(','));
  if (params.topics?.length) query.append('topics', params.topics.join(','));
  if (params.audiences?.length) query.append('audiences', params.audiences.join(','));

  const queryString = query.toString();
  const url = queryString ? `/news?${queryString}` : '/news';

  const { data, error, isLoading, mutate } = useSWR(url, fetchApi);

  return {
    data,
    isLoading,
    isError: error,
    mutate
  };
}

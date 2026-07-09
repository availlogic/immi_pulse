'use client';

import { useState } from 'react';
import Header from '../components/layout/Header';
import CardGrid from '../components/feed/CardGrid';
import NewsCard from '../components/feed/NewsCard';
import SkeletonCard from '../components/feed/SkeletonCard';
import FilterPanel from '../components/feed/FilterPanel';
import SortSelect from '../components/feed/SortSelect';
import DetailDrawer from '../components/drawer/DetailDrawer';
import EmptyState from '../components/shared/EmptyState';
import Toast from '../components/shared/Toast';
import { useNews } from '../hooks/useNews';
import { useFilters } from '../hooks/useFilters';
import { useCandidates } from '../hooks/useCandidates';
import { FileSearch } from 'lucide-react';

export default function Dashboard() {
  const [params, setParams] = useState({
    page: 1,
    limit: 50,
    show_low_relevance: false,
    sort_by: 'published_at',
    countries: [],
    topics: [],
    audiences: []
  });

  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: newsData, isLoading: isNewsLoading, mutate: mutateNews } = useNews(params);
  const { filters, isLoading: isFiltersLoading } = useFilters();
  const { starCandidate, unstarCandidate, updateNotes } = useCandidates();

  const handleFilterChange = (newFilters) => {
    setParams(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleToggleLowRelevance = (show) => {
    setParams(prev => ({ ...prev, show_low_relevance: show, page: 1 }));
  };

  const handleSortChange = (sort_by) => {
    setParams(prev => ({ ...prev, sort_by, page: 1 }));
  };

  const handleStarToggle = async (newsId, isStarred) => {
    let success = false;
    if (isStarred) {
      success = await starCandidate(newsId);
      if (success) showToast('Added to Candidates', 'success');
    } else {
      success = await unstarCandidate(newsId);
      if (success) showToast('Removed from Candidates', 'info');
    }
    if (success) {
      mutateNews();
    } else {
      showToast('Failed to update candidate status', 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Header title="Editorial Feed" />
      
      <div className="app-content">
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <FilterPanel 
              filters={filters} 
              selected={params} 
              onChange={handleFilterChange} 
              showLowRelevance={params.show_low_relevance}
              onToggleLowRelevance={handleToggleLowRelevance}
            />
            <SortSelect value={params.sort_by} onChange={handleSortChange} />
          </div>

          {isNewsLoading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : newsData?.data?.length > 0 ? (
            <CardGrid>
              {newsData.data.map(item => (
                <NewsCard 
                  key={item.id} 
                  item={item} 
                  onClick={(item) => setSelectedNewsId(item.id)}
                  onStarToggle={handleStarToggle}
                />
              ))}
            </CardGrid>
          ) : (
            <div style={{ minHeight: '400px' }}>
              <EmptyState 
                title="No news found" 
                message="No news items match your current filters. Try clearing some selections or toggling 'Show Low Relevance'."
                icon={FileSearch}
              />
            </div>
          )}
        </div>
      </div>

      <DetailDrawer 
        newsId={selectedNewsId} 
        isOpen={!!selectedNewsId} 
        onClose={() => setSelectedNewsId(null)}
        onStarToggle={handleStarToggle}
        onNotesUpdate={updateNotes}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}
    </>
  );
}

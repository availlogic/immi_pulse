'use client';

import { useState } from 'react';
import Header from '../../components/layout/Header';
import CandidateCard from '../../components/candidates/CandidateCard';
import OutlineEditor from '../../components/candidates/OutlineEditor';
import EmptyState from '../../components/shared/EmptyState';
import Toast from '../../components/shared/Toast';
import { useCandidates } from '../../hooks/useCandidates';
import { Star } from 'lucide-react';

export default function Candidates() {
  const { candidates, isLoading, unstarCandidate, updateNotes } = useCandidates('video_score');
  const [activeCandidateId, setActiveCandidateId] = useState(null);
  const [toast, setToast] = useState(null);

  const activeCandidate = candidates.find(c => c.news_item_id === activeCandidateId) || candidates[0];

  const handleUnstar = async (newsId) => {
    const success = await unstarCandidate(newsId);
    if (success) {
      showToast('Removed from candidates', 'info');
      if (activeCandidateId === newsId) {
        setActiveCandidateId(null);
      }
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Header title="Video Candidates Desk" />
      
      {isLoading ? (
        <div className="app-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p>Loading candidates...</p>
        </div>
      ) : candidates.length > 0 ? (
        <div className="candidates-layout">
          <div className="candidates-list-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Saved Ideas</h2>
              <span className="badge badge-default">{candidates.length} total</span>
            </div>
            
            {candidates.map(candidate => (
              <CandidateCard
                key={candidate.candidate_id}
                candidate={candidate}
                isActive={activeCandidate?.news_item_id === candidate.news_item_id}
                onClick={(c) => setActiveCandidateId(c.news_item_id)}
                onUnstar={handleUnstar}
              />
            ))}
          </div>
          
          <div className="candidates-editor-pane">
            <OutlineEditor 
              candidate={activeCandidate} 
              onSaveNotes={updateNotes}
              onToast={(msg) => showToast(msg, 'success')}
            />
          </div>
        </div>
      ) : (
        <div className="app-content">
          <EmptyState 
            title="No candidates starred yet"
            message="Go to the feed to star some high-value topics."
            icon={Star}
          />
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}
    </>
  );
}

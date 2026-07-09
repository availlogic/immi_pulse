import { useState, useEffect, useRef } from 'react';
import { X, Star, ExternalLink } from 'lucide-react';
import { useNewsDetail } from '../../hooks/useNewsDetail';
import Badge from '../shared/Badge';
import LanguageTabs from './LanguageTabs';
import ScoreBar from './ScoreBar';
import NotesEditor from './NotesEditor';
import './drawer.css';

export default function DetailDrawer({ newsId, isOpen, onClose, onStarToggle, onNotesUpdate }) {
  const { data: detail, isLoading } = useNewsDetail(isOpen ? newsId : null);
  const [activeLang, setActiveLang] = useState('zh');
  
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = detail?.data;

  const getTitle = () => {
    if (!content) return '';
    if (activeLang === 'zh') return content.title_zh || content.title_en;
    if (activeLang === 'en') return content.title_en;
    return content.title_original || content.title_en;
  };

  const getSummary = () => {
    if (!content) return '';
    if (activeLang === 'zh') return content.summary_zh || content.summary_en;
    if (activeLang === 'en') return content.summary_en;
    return content.summary_original || content.summary_en;
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="detail-drawer" ref={drawerRef}>
        {isLoading || !content ? (
          <div className="drawer-loading">
            <div className="spinner"></div>
            <p>Loading details...</p>
          </div>
        ) : (
          <>
            <div className="drawer-header">
              <div className="drawer-actions">
                <button className="icon-btn close-btn" onClick={onClose} aria-label="Close">
                  <X size={24} />
                </button>
                <button 
                  className="icon-btn star-btn-drawer" 
                  onClick={() => onStarToggle(content.id, !content.is_starred)}
                >
                  <Star 
                    size={24} 
                    className={content.is_starred ? 'star-icon-active' : ''} 
                    fill={content.is_starred ? 'currentColor' : 'none'}
                  />
                </button>
                
                {content.scores?.video >= 70 && content.scores?.chinese_relevance >= 70 && (
                  <Badge type="score-green" className="high-recommendation">
                    High Recommendation
                  </Badge>
                )}
              </div>
              
              <LanguageTabs activeTab={activeLang} onChange={setActiveLang} />
            </div>

            <div className="drawer-content">
              <h2 className="detail-title">{getTitle()}</h2>
              
              <div className="metrics-grid">
                <ScoreBar label="Video Suitability" score={content.scores?.video || 0} />
                <ScoreBar label="Chinese Relevance" score={content.scores?.chinese_relevance || 0} />
                <ScoreBar label="Global Importance" score={content.scores?.importance || 0} />
                <ScoreBar label="Evergreen Score" score={content.scores?.evergreen || 0} />
              </div>

              <div className="detail-section ai-summary">
                <h3 className="section-title">AI Summary</h3>
                <p className="summary-text">{getSummary()}</p>
              </div>

              {content.ai_analysis && (
                <div className="detail-section ai-impact">
                  <h3 className="section-title">Demographic Impact Analysis</h3>
                  <p>{content.ai_analysis}</p>
                </div>
              )}

              {content.youtube_suggestions && content.youtube_suggestions.titles && (
                <div className="detail-section yt-suggestions">
                  <h3 className="section-title">Suggested YouTube Titles</h3>
                  <ul className="yt-titles-list">
                    {content.youtube_suggestions.titles.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                  {content.youtube_suggestions.thumbnail_prompt && (
                    <div className="thumbnail-prompt">
                      <strong>Thumbnail Idea:</strong> {content.youtube_suggestions.thumbnail_prompt}
                    </div>
                  )}
                </div>
              )}

              <NotesEditor 
                initialValue={content.candidate_notes} 
                onSave={(notes) => onNotesUpdate(content.id, { notes })} 
              />

              <div className="detail-section sources-list">
                <h3 className="section-title">Source Verification</h3>
                <div className="source-links">
                  <a href={content.metadata.source_url} target="_blank" rel="noopener noreferrer" className="source-link primary">
                    {content.metadata.source_name} <ExternalLink size={14} />
                  </a>
                  {content.duplicates?.map((dup, idx) => (
                    <a key={idx} href={dup.source_url} target="_blank" rel="noopener noreferrer" className="source-link">
                      {dup.source_name} <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

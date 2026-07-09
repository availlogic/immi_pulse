import { classNames, formatDate, getScoreColorClass } from '../../lib/utils';
import Badge from '../shared/Badge';
import { StarOff } from 'lucide-react';
import './candidates.css';

export default function CandidateCard({ candidate, isActive, onClick, onUnstar }) {
  const vsClass = getScoreColorClass(candidate.video_score || 0);

  return (
    <div 
      className={classNames('candidate-card', isActive && 'active')} 
      onClick={() => onClick(candidate)}
    >
      <div className="card-header">
        <Badge type="country">{candidate.source_name}</Badge>
        <button 
          className="icon-btn unstar-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onUnstar(candidate.news_item_id);
          }}
          title="Remove from candidates"
        >
          <StarOff size={16} />
        </button>
      </div>
      
      <h3 className="card-title">{candidate.custom_title || candidate.title_zh}</h3>
      
      <div className="card-metrics">
        <div className="metric-item">
          <span className="metric-label">Video</span>
          <Badge type={`score-${vsClass.split('-')[1]}`}>{candidate.video_score || 0}</Badge>
        </div>
      </div>

      <div className="card-meta">
        <span className="meta-time">Saved {formatDate(candidate.starred_at)}</span>
      </div>
    </div>
  );
}

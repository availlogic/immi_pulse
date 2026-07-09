import Badge from '../shared/Badge';
import { formatDate, getScoreColorClass } from '../../lib/utils';
import { Star, FilePlus2 } from 'lucide-react';
import './feed.css';

export default function NewsCard({ item, onClick, onStarToggle }) {
  const mainCountry = item.country_tags?.[0] || 'Global';
  const vsClass = getScoreColorClass(item.scores?.video || 0);
  const crClass = getScoreColorClass(item.scores?.chinese_relevance || 0);

  return (
    <div className="news-card" onClick={() => onClick(item)}>
      <div className="card-header">
        <Badge type="country">{mainCountry}</Badge>
        <button 
          className="star-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(item.id, !item.is_starred);
          }}
          aria-label={item.is_starred ? "Unstar" : "Star"}
        >
          <Star 
            size={20} 
            className={item.is_starred ? 'star-icon-active' : 'star-icon'} 
            fill={item.is_starred ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      <h3 className="card-title" title={item.title_zh}>{item.title_zh || item.title_en}</h3>
      <p className="card-summary">{item.summary_zh || item.title_en}</p>

      <div className="card-metrics">
        <div className="metric-item">
          <span className="metric-label">Video</span>
          <Badge type={`score-${vsClass.split('-')[1]}`}>{item.scores?.video || 0}</Badge>
        </div>
        <div className="metric-item">
          <span className="metric-label">Relevance</span>
          <Badge type={`score-${crClass.split('-')[1]}`}>{item.scores?.chinese_relevance || 0}</Badge>
        </div>
      </div>

      <div className="card-meta">
        <span className="meta-source">{item.source_name}</span>
        <span className="meta-time">{formatDate(item.published_at)}</span>
        {item.duplicate_count > 0 && (
          <span className="meta-duplicates">
            <FilePlus2 size={14} /> +{item.duplicate_count} sources
          </span>
        )}
      </div>
    </div>
  );
}

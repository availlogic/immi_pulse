import { classNames } from '../../lib/utils';
import './feed.css';

export default function FilterPanel({ filters, selected, onChange, showLowRelevance, onToggleLowRelevance }) {
  if (!filters) return null;

  const handleToggle = (category, value) => {
    const current = selected[category] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onChange({ ...selected, [category]: newValues });
  };

  const renderTags = (title, category, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="filter-group">
        <h4 className="filter-title">{title}</h4>
        <div className="filter-tags">
          {items.map(item => {
            const isSelected = (selected[category] || []).includes(item.tag);
            return (
              <button
                key={item.tag}
                onClick={() => handleToggle(category, item.tag)}
                className={classNames('filter-tag', isSelected && 'active')}
              >
                {item.tag} <span className="tag-count">{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="filter-panel">
      <div className="filter-toggle">
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={showLowRelevance}
            onChange={(e) => onToggleLowRelevance(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
        <span className="toggle-label">Show Low Relevance (&lt; 60 CR)</span>
      </div>
      
      {renderTags('Countries', 'countries', filters.countries)}
      {renderTags('Topics', 'topics', filters.topics)}
      {renderTags('Audiences', 'audiences', filters.audiences)}
    </div>
  );
}

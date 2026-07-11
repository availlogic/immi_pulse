import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { classNames } from '../../lib/utils';
import './feed.css';

export default function FilterPanel({ filters, selected, onChange, showLowRelevance, onToggleLowRelevance }) {
  const [collapsed, setCollapsed] = useState({
    countries: false, // Countries defaults to unfold (expanded)
    topics: true,      // Topics defaults to fold (collapsed)
    audiences: true    // Audiences defaults to fold (collapsed)
  });

  if (!filters) return null;

  const toggleCollapse = (category) => {
    setCollapsed(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleToggle = (category, value) => {
    const current = selected[category] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onChange({ ...selected, [category]: newValues });
  };

  const renderTags = (title, category, items) => {
    if (!items || items.length === 0) return null;
    const isCollapsed = collapsed[category];
    const activeCount = (selected[category] || []).length;

    return (
      <div className="filter-group">
        <div className="filter-header" onClick={() => toggleCollapse(category)}>
          <div className="filter-header-left">
            <h4 className="filter-title">{title}</h4>
            {activeCount > 0 && (
              <span className="filter-active-badge">
                {activeCount} active
              </span>
            )}
          </div>
          <button 
            className="fold-toggle-btn"
            aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(category);
            }}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
        {!isCollapsed && (
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
        )}
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

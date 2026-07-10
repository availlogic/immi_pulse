import './feed.css';

export default function SortSelect({ value, onChange }) {
  return (
    <div className="sort-select-wrapper">
      <span className="sort-label">Sort by:</span>
      <select 
        className="sort-select" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="published_at">Publication Date</option>
        <option value="video_score">Video Score</option>
        <option value="chinese_relevance_score">Chinese Relevance</option>
      </select>
    </div>
  );
}

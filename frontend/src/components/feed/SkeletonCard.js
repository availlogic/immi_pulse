import './feed.css';

export default function SkeletonCard() {
  return (
    <div className="news-card skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-badge"></div>
        <div className="skeleton-star"></div>
      </div>
      <div className="skeleton-title"></div>
      <div className="skeleton-title short"></div>
      <div className="skeleton-summary"></div>
      <div className="skeleton-summary"></div>
      <div className="skeleton-metrics">
        <div className="skeleton-badge"></div>
        <div className="skeleton-badge"></div>
      </div>
      <div className="skeleton-meta"></div>
    </div>
  );
}

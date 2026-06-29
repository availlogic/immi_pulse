export function SkeletonCard() {
    return (
        <div className="article-card" aria-busy="true" aria-label="Loading article">
            <div className="skeleton" style={{ height: 24, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 80 }} />
        </div>
    );
}
import type { FeedArticle } from '../api/client';
import { jurisdictionName } from '../api/jurisdictions';

interface Props {
    article: FeedArticle;
    onClose: () => void;
}

export function ArticleModal({ article, onClose }: Props) {
    const date = new Date(article.publication_date);
    const formatted = date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal">
                <button
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close article"
                    title="Close"
                >
                    ×
                </button>
                <h2 id="article-modal-title">{article.title}</h2>
                <div className="article-meta">
                    <span className="badge badge-jurisdiction">{jurisdictionName(article.origin_jurisdiction)}</span>
                    {article.tags.map((t) => (
                        <span key={t} className="badge badge-tag">
                            {t}
                        </span>
                    ))}
                    <span className="authority-pill">
                        {article.publisher_authority === 5 ? 'Government' : article.publisher_authority >= 4 ? 'Official' : 'Law Firm'} ({article.publisher_authority}/5)
                    </span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{article.summary}</p>
                <p style={{ fontSize: 'var(--caption-size)', color: 'var(--color-text-secondary)' }}>
                    Published: {formatted}
                </p>
                <p style={{ marginTop: 16 }}>
                    <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        Open Verified Source
                    </a>
                </p>
                {article.alternative_sources.length > 0 && (
                    <section>
                        <h3>Alternative Coverage</h3>
                        <ul>
                            {article.alternative_sources.map((src) => (
                                <li key={src}>
                                    <a href={src} target="_blank" rel="noopener noreferrer">
                                        {src}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
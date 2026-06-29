import type { FeedArticle } from '../api/client';
import { jurisdictionName } from '../api/jurisdictions';

interface Props {
    article: FeedArticle;
    onClick: () => void;
}

export function ArticleCard({ article, onClick }: Props) {
    const date = new Date(article.publication_date);
    const formatted = date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <article
            className="article-card"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            aria-label={`Open article: ${article.title}`}
        >
            <h3>{article.title}</h3>
            <div className="article-meta">
                <span className="badge badge-jurisdiction">{jurisdictionName(article.origin_jurisdiction)}</span>
                {article.tags.map((t) => (
                    <span key={t} className="badge badge-tag">
                        {t}
                    </span>
                ))}
                <span className="authority-pill" aria-label={`Authority rating ${article.publisher_authority} of 5`}>
                    Authority: {article.publisher_authority}/5
                </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>{article.summary}</p>
            <p style={{ fontSize: 'var(--caption-size)', color: 'var(--color-text-secondary)' }}>{formatted}</p>
        </article>
    );
}
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { jurisdictionName } from '../api/jurisdictions';
import { showToast } from './Toast';
import { HamburgerMenu } from './HamburgerMenu';

interface ScraperHealth {
    scraper_name: string;
    status: 'healthy' | 'unhealthy';
    last_execution: string;
    failures_in_24h: number;
    failures_in_window: number;
    last_error: string | null;
}

interface AdminHealth {
    scrapers: ScraperHealth[];
    summary: {
        total_articles: number;
        dedup_rate_pct: number;
        scraper_failure_window_hours: number;
    };
}

interface AdminMetrics {
    total_articles: number;
    dedup_rate_pct: number;
    alert_volume_24h: number;
    alert_latency_p50_ms: number;
    top_jurisdictions: Array<{ jurisdiction: string; article_count: number }>;
    broker_last_seen: string | null;
    generated_at: string;
}

interface ReviewItem {
    id: string;
    article_id: string;
    reason: string;
    proposed_tags: string[];
    proposed_jurisdiction: string;
    confidence: number;
    status: string;
    created_at: string;
    title?: string;
    summary?: string;
    source_url?: string;
    tagger_provider?: string;
}

/**
 * Stage 6.6: Admin dashboard SPA.
 *
 * Three panels per docs/PRD §20 and §226:
 *   1. Scraper Health — list of scrapers with status, failures, last error
 *   2. Metrics       — total articles, dedup rate, alert latency, top jurisdictions
 *   3. Review Queue  — pending admin_review_queue items with Approve/Reject
 *
 * Only accessible to admin-tier users.
 */
export function AdminDashboard() {
    const { tier, initialized } = useAuth();
    const [health, setHealth] = useState<AdminHealth | null>(null);
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [activePanel, setActivePanel] = useState<'health' | 'metrics' | 'review'>('health');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!initialized) return;
        if (tier !== 'admin') {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const [h, m, r] = await Promise.all([
                    api.getAdminHealth(),
                    api.getAdminMetrics(),
                    api.getAdminReview('pending'),
                ]);
                setHealth(h);
                setMetrics(m);
                setReviewItems(r.items);
            } catch (err) {
                showToast('Failed to load admin data: ' + (err as Error).message, 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, [tier, initialized]);

    if (!initialized) return <p>Loading…</p>;
    if (tier !== 'admin') {
        return (
            <div className="settings-section">
                <h1>Admin Dashboard</h1>
                <p>You need an admin account to view this page.</p>
            </div>
        );
    }

    return (
        <section aria-label="Admin Dashboard">
            <h1>Admin Dashboard</h1>
            <div
                className="admin-tabs"
                role="tablist"
                style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
            >
                <button
                    role="tab"
                    aria-selected={activePanel === 'health'}
                    className={activePanel === 'health' ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => setActivePanel('health')}
                >
                    Scraper Health ({health?.scrapers.length ?? 0})
                </button>
                <button
                    role="tab"
                    aria-selected={activePanel === 'metrics'}
                    className={activePanel === 'metrics' ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => setActivePanel('metrics')}
                >
                    Metrics
                </button>
                <button
                    role="tab"
                    aria-selected={activePanel === 'review'}
                    className={activePanel === 'review' ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => setActivePanel('review')}
                >
                    Review Queue ({reviewItems.length})
                </button>
            </div>

            {loading && <p>Loading admin data…</p>}

            {!loading && activePanel === 'health' && health && (
                <ScraperHealthPanel health={health} />
            )}
            {!loading && activePanel === 'metrics' && metrics && (
                <MetricsPanel metrics={metrics} />
            )}
            {!loading && activePanel === 'review' && (
                <ReviewQueuePanel
                    items={reviewItems}
                    onUpdated={async () => {
                        const r = await api.getAdminReview('pending');
                        setReviewItems(r.items);
                    }}
                />
            )}
        </section>
    );
}

function ScraperHealthPanel({ health }: { health: AdminHealth }) {
    return (
        <div className="settings-section" role="tabpanel" aria-label="Scraper Health">
            <h2>Scraper Health</h2>
            <p>
                Total articles: <strong>{health.summary.total_articles}</strong> · Dedup rate (24h):{' '}
                <strong>{health.summary.dedup_rate_pct}%</strong> · Failure window:{' '}
                <strong>{health.summary.scraper_failure_window_hours}h</strong>
            </p>
            <div
                role="table"
                style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                }}
            >
                <div
                    role="row"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 3fr',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'var(--color-bg-main)',
                        fontWeight: 600,
                    }}
                >
                    <div role="columnheader">Scraper</div>
                    <div role="columnheader">Status</div>
                    <div role="columnheader">Failures (24h)</div>
                    <div role="columnheader">Last error</div>
                </div>
                {health.scrapers.map((s) => (
                    <div
                        role="row"
                        key={s.scraper_name}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 3fr',
                            gap: 8,
                            padding: '8px 12px',
                            borderTop: '1px solid var(--color-border)',
                        }}
                    >
                        <div role="cell">{s.scraper_name}</div>
                        <div role="cell">
                            <span
                                style={{
                                    color: s.status === 'healthy' ? 'var(--color-success)' : 'var(--color-error)',
                                    fontWeight: 600,
                                }}
                            >
                                {s.status}
                            </span>
                        </div>
                        <div role="cell">{s.failures_in_24h}</div>
                        <div
                            role="cell"
                            style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: 'var(--caption-size)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {s.last_error ?? '—'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }: { metrics: AdminMetrics }) {
    return (
        <div className="settings-section" role="tabpanel" aria-label="Metrics">
            <h2>Metrics</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--caption-size)' }}>
                Generated: {new Date(metrics.generated_at).toLocaleString()}
            </p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <MetricCard label="Total articles" value={metrics.total_articles.toLocaleString()} />
                <MetricCard
                    label="Dedup rate (24h)"
                    value={`${metrics.dedup_rate_pct}%`}
                />
                <MetricCard label="Alerts (24h)" value={metrics.alert_volume_24h.toLocaleString()} />
                <MetricCard
                    label="Alert latency (p50)"
                    value={`${Math.round(metrics.alert_latency_p50_ms)} ms`}
                />
                <MetricCard
                    label="Broker last seen"
                    value={
                        metrics.broker_last_seen
                            ? new Date(metrics.broker_last_seen).toLocaleTimeString()
                            : '—'
                    }
                />
            </div>
            <h3>Top jurisdictions</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {metrics.top_jurisdictions.map((j) => (
                    <li
                        key={j.jurisdiction}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            marginBottom: 4,
                        }}
                    >
                        <span>{jurisdictionName(j.jurisdiction)}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{j.article_count}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: 16,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-bg-card)',
            }}
        >
            <div
                style={{
                    fontSize: 'var(--caption-size)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                {value}
            </div>
        </div>
    );
}

function ReviewQueuePanel({
    items,
    onUpdated,
}: {
    items: ReviewItem[];
    onUpdated: () => Promise<void>;
}) {
    async function decide(id: string, action: 'approve' | 'reject'): Promise<void> {
        try {
            await api.reviewDecide(id, action, '');
            showToast(`Item ${action}d`, 'success');
            await onUpdated();
        } catch (err) {
            showToast((err as Error).message, 'error');
        }
    }

    return (
        <div className="settings-section" role="tabpanel" aria-label="Review Queue">
            <h2>Review Queue ({items.length})</h2>
            {items.length === 0 ? (
                <p>No pending review items.</p>
            ) : (
                items.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            padding: 12,
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            marginBottom: 8,
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>
                            {item.title ?? `Article ${item.article_id}`}
                        </div>
                        <div
                            style={{
                                fontSize: 'var(--caption-size)',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            Jurisdiction: {item.proposed_jurisdiction} · Confidence:{' '}
                            {item.confidence.toFixed(2)}
                        </div>
                        <div style={{ margin: '8px 0' }}>{item.reason}</div>
                        {item.proposed_tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                {item.proposed_tags.map((t) => (
                                    <span key={t} className="badge badge-tag">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => decide(item.id, 'approve')}
                            >
                                Approve
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={() => decide(item.id, 'reject')}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
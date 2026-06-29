import { useEffect, useMemo, useState } from 'react';
import { api, type FeedArticle } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { JURISDICTIONS, jurisdictionName } from '../api/jurisdictions';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleModal } from '../components/ArticleModal';
import { FilterBadges } from '../components/FilterBadges';
import { LockedSidebarOverlay } from '../components/LockedSidebarOverlay';
import { PreferencesSidebar } from '../components/PreferencesSidebar';
import { SkeletonCard } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { showToast } from '../components/Toast';
import { BottomNav } from '../components/BottomNav';
import { HamburgerMenu } from '../components/HamburgerMenu';

const jurisdictionNameMap = JURISDICTIONS.reduce<Record<string, string>>((acc, j) => {
    acc[j.code] = j.name;
    return acc;
}, {});

// Sensible default jurisdictions for the locked sidebar (Screen-Specs §1.3).
const DEFAULT_LOCKED_JURISDICTIONS = ['US', 'CA', 'GB'];

export function DashboardFeed() {
    const { isAuthenticated } = useAuth();
    const [articles, setArticles] = useState<FeedArticle[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<FeedArticle | null>(null);
    const [preferences, setPreferences] = useState<{ jurisdictions: string[]; tags: string[]; digestFrequency: 'none' | 'daily' | 'weekly' }>({
        jurisdictions: [],
        tags: [],
        digestFrequency: 'none',
    });
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    // Per docs/Screen-Specs §1.2: "Includes a toggle to switch between
    // 'Personalized' and 'Global' feed (for registered users)."
    const [view, setView] = useState<'personalized' | 'global'>('personalized');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                if (isAuthenticated) {
                    try {
                        const prefs = await api.getPreferences();
                        if (!cancelled) {
                            setPreferences({
                                jurisdictions: prefs.preferred_jurisdictions,
                                tags: prefs.preferred_tags,
                                digestFrequency: prefs.digest_frequency,
                            });
                        }
                    } catch (err) {
                        showToast('Could not load preferences', 'error');
                    }
                }
                const feed = await api.getFeed(10, isAuthenticated ? view : undefined);
                if (!cancelled) setArticles(feed.articles);
            } catch (err) {
                if (!cancelled) setError((err as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, view]);

    const activeJurisdictions = useMemo(() => preferences.jurisdictions, [preferences.jurisdictions]);
    const activeTags = useMemo(() => preferences.tags, [preferences.tags]);

    function removeJurisdiction(code: string) {
        setPreferences((p) => ({ ...p, jurisdictions: p.jurisdictions.filter((j) => j !== code) }));
    }

    function removeTag(tag: string) {
        setPreferences((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
    }

    const sidebarLockedJurisdictions = activeJurisdictions.length > 0
        ? activeJurisdictions
        : DEFAULT_LOCKED_JURISDICTIONS;

    return (
        <>
            <a className="skip-link" href="#main">
                Skip to main content
            </a>
            <div
                className="control-bar"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                }}
            >
                <FilterBadges
                    jurisdictions={activeJurisdictions}
                    tags={activeTags}
                    jurisdictionNames={jurisdictionNameMap}
                    onRemoveJurisdiction={removeJurisdiction}
                    onRemoveTag={removeTag}
                />
                {isAuthenticated && (
                    <div
                        className="view-toggle"
                        role="group"
                        aria-label="Feed view"
                        style={{ display: 'flex', gap: 4 }}
                    >
                        <button
                            type="button"
                            className={view === 'personalized' ? 'btn btn-primary' : 'btn btn-secondary'}
                            aria-pressed={view === 'personalized'}
                            onClick={() => setView('personalized')}
                        >
                            Personalized
                        </button>
                        <button
                            type="button"
                            className={view === 'global' ? 'btn btn-primary' : 'btn btn-secondary'}
                            aria-pressed={view === 'global'}
                            onClick={() => setView('global')}
                        >
                            Global
                        </button>
                    </div>
                )}
            </div>
            <div className="dashboard-layout">
                <main id="main" aria-label="News feed">
                    {loading && (
                        <div className="feed-grid">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    )}
                    {error && !loading && (
                        <ErrorBanner
                            message="Unable to retrieve updates. Please check your connection and try again."
                            onRetry={() => window.location.reload()}
                        />
                    )}
                    {!loading && !error && articles && articles.length === 0 && (
                        <EmptyState message="No updates match your selections. Try expanding your target jurisdictions or tags!" />
                    )}
                    {!loading && !error && articles && articles.length > 0 && (
                        <div className="feed-grid">
                            {articles.map((a) => (
                                <ArticleCard key={a.article_id} article={a} onClick={() => setSelected(a)} />
                            ))}
                        </div>
                    )}
                </main>
                {!isAuthenticated ? (
                    <LockedSidebarOverlay
                        jurisdictions={sidebarLockedJurisdictions}
                        tags={[]}
                        jurisdictionNames={jurisdictionNameMap}
                    />
                ) : (
                    <PreferencesSidebar
                        jurisdictions={activeJurisdictions}
                        tags={activeTags}
                        digestFrequency={preferences.digestFrequency}
                        onChange={setPreferences}
                    />
                )}
            </div>
            {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
            {mobileFiltersOpen && isAuthenticated && (
                <div className="modal-backdrop" onClick={() => setMobileFiltersOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="modal-close"
                            onClick={() => setMobileFiltersOpen(false)}
                            aria-label="Close filters"
                        >
                            ×
                        </button>
                        <PreferencesSidebar
                            jurisdictions={activeJurisdictions}
                            tags={activeTags}
                            digestFrequency={preferences.digestFrequency}
                            onChange={setPreferences}
                        />
                    </div>
                </div>
            )}
            {hamburgerOpen && (
                <HamburgerMenu
                    isOpen={hamburgerOpen}
                    onClose={() => setHamburgerOpen(false)}
                />
            )}
            {isAuthenticated && (
                <FloatingActionButton onClick={() => setMobileFiltersOpen(true)} />
            )}
            <BottomNav />
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--caption-size)', marginTop: 16 }}>
                Showing {articles ? Math.min(articles.length, 10) : 0} of 10 daily curated updates.
                {activeJurisdictions.length > 0 && (
                    <> Diversity enforced: max 2 per jurisdiction.</>
                )}
            </p>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--caption-size)' }}>
                {jurisdictionName('US')} · {jurisdictionName('CA')} · {jurisdictionName('GB')} · {jurisdictionName('AU')} · {jurisdictionName('SG')} — and 19 more.
            </p>
        </>
    );
}
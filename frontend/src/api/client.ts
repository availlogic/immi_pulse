export interface FeedArticle {
    article_id: string;
    title: string;
    summary: string;
    publication_date: string;
    source_url: string;
    origin_jurisdiction: string;
    tags: string[];
    is_analysis: boolean;
    alternative_sources: string[];
    publisher_authority: number;
}

export interface UserPreferences {
    preferred_jurisdictions: string[];
    preferred_tags: string[];
    digest_frequency: 'none' | 'daily' | 'weekly';
}

export interface Alert {
    alert_id: string;
    target_jurisdiction: string;
    keyword: string;
    created_at: string;
}

const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1';

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

function readCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
    };
    // CSRF: for state-changing requests, echo the csrf_token cookie in
    // the X-CSRF-Token header. The backend's requireCsrfIfStateChanging
    // preHandler compares the two in constant time.
    const method = (init.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        const csrf = readCsrfToken();
        if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers,
        // Stage 5.2: include cookies (HttpOnly access_token) in cross-origin
        // requests. The backend sets `Access-Control-Allow-Credentials: true`.
        credentials: 'include',
    });
    const text = await res.text();
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        // not JSON
    }
    if (!res.ok) {
        const message =
            (json as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
        throw new ApiError(res.status, message);
    }
    return (json as { data: T }).data as T;
}

export const api = {
    async getCsrfToken(): Promise<{ csrf_token: string }> {
        return request('/auth/csrf');
    },
    async signup(email: string, password: string): Promise<{ user_id: string; email: string; user_tier: string }> {
        return request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    },
    async login(email: string, password: string): Promise<{ user_tier: string }> {
        return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    },
    async logout(): Promise<void> {
        await request('/auth/logout', { method: 'POST' });
    },
    async getPreferences(): Promise<UserPreferences> {
        return request('/user/preferences');
    },
    async getMe(): Promise<{ user_id: string; email: string; user_tier: 'basic' | 'premium' | 'admin' }> {
        return request('/user/me');
    },
    async putPreferences(prefs: UserPreferences): Promise<void> {
        await request('/user/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
    },
    async getFeed(limit = 10, view?: 'personalized' | 'global'): Promise<{ articles: FeedArticle[]; view: string }> {
        const params = new URLSearchParams({ limit: String(limit) });
        if (view) params.set('view', view);
        return request(`/feed?${params.toString()}`);
    },
    async getAlerts(): Promise<{ alerts: Alert[] }> {
        return request('/user/alerts');
    },
    async createAlert(target_jurisdiction: string, keyword: string): Promise<{ alert_id: string }> {
        return request('/user/alerts', {
            method: 'POST',
            body: JSON.stringify({ target_jurisdiction, keyword }),
        });
    },
    async deleteAlert(alertId: string): Promise<void> {
        await request(`/user/alerts/${alertId}`, { method: 'DELETE' });
    },
    async getAdminHealth(): Promise<{
        scrapers: Array<{
            scraper_name: string;
            status: 'healthy' | 'unhealthy';
            last_execution: string;
            failures_in_24h: number;
            failures_in_window: number;
            last_error: string | null;
        }>;
        summary: {
            total_articles: number;
            dedup_rate_pct: number;
            scraper_failure_window_hours: number;
        };
    }> {
        return request('/admin/health');
    },
    async getAdminMetrics(): Promise<{
        total_articles: number;
        dedup_rate_pct: number;
        alert_volume_24h: number;
        alert_latency_p50_ms: number;
        top_jurisdictions: Array<{ jurisdiction: string; article_count: number }>;
        broker_last_seen: string | null;
        generated_at: string;
    }> {
        return request('/admin/metrics');
    },
    async getAdminReview(status: string = 'pending'): Promise<{
        items: Array<{
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
        }>;
    }> {
        return request(`/admin/review?status=${status}`);
    },
    async reviewDecide(id: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
        await request(`/admin/review/${id}/${action}`, {
            method: 'POST',
            body: JSON.stringify({ notes: notes ?? '' }),
        });
    },
};

export { ApiError };
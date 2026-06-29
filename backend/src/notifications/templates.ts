export function digestEmailTemplate(opts: {
    displayName: string;
    articles: { title: string; summary: string; source_url: string; origin_jurisdiction: string }[];
    periodLabel: string;
}): { subject: string; text: string; html: string } {
    const subject = `Your ImmiPulse ${opts.periodLabel} digest — ${opts.articles.length} update${opts.articles.length === 1 ? '' : 's'}`;
    const text = [
        `Hi ${opts.displayName},`,
        '',
        `Here are your curated ${opts.periodLabel.toLowerCase()} immigration updates:`,
        '',
        ...opts.articles.flatMap((a, i) => [
            `${i + 1}. [${a.origin_jurisdiction}] ${a.title}`,
            a.summary,
            `Source: ${a.source_url}`,
            '',
        ]),
        '— ImmiPulse',
    ].join('\n');

    const html = `
        <div style="font-family: Inter, sans-serif; color:#111827;">
            <p>Hi ${escapeHtml(opts.displayName)},</p>
            <p>Here are your curated <strong>${opts.periodLabel.toLowerCase()}</strong> immigration updates:</p>
            ${opts.articles
                .map(
                    (a) => `
                <div style="border:1px solid #E5E7EB; border-radius:8px; padding:16px; margin:12px 0;">
                    <strong>[${a.origin_jurisdiction}] ${escapeHtml(a.title)}</strong>
                    <p>${escapeHtml(a.summary)}</p>
                    <p><a href="${a.source_url}" style="background:#1E40AF;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;">Open Verified Source</a></p>
                </div>`
                )
                .join('')}
            <p style="color:#6B7280;font-size:12px;">— ImmiPulse · Information, not legal advice.</p>
        </div>`;

    return { subject, text, html };
}

export function alertEmailTemplate(opts: {
    title: string;
    summary: string;
    source_url: string;
    jurisdiction: string;
}): { subject: string; text: string; html: string } {
    const subject = `[ImmiPulse Alert] ${opts.jurisdiction}: ${opts.title}`;
    const text = [
        `A new update matches one of your keyword alerts.`,
        '',
        `Jurisdiction: ${opts.jurisdiction}`,
        `Title: ${opts.title}`,
        '',
        opts.summary,
        '',
        `Verified source: ${opts.source_url}`,
        '',
        '— ImmiPulse',
    ].join('\n');

    const html = `
        <div style="font-family: Inter, sans-serif; color:#111827;">
            <h2 style="color:#EA580C;">Keyword Alert: ${escapeHtml(opts.jurisdiction)}</h2>
            <h3>${escapeHtml(opts.title)}</h3>
            <p>${escapeHtml(opts.summary)}</p>
            <p><a href="${opts.source_url}" style="background:#EA580C;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;">Open Verified Source</a></p>
            <p style="color:#6B7280;font-size:12px;">— ImmiPulse · Information, not legal advice.</p>
        </div>`;

    return { subject, text, html };
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
    );
}
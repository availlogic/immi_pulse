import { describe, it, expect } from 'vitest';
import { digestEmailTemplate, alertEmailTemplate } from '../../src/notifications/templates.js';

describe('email templates', () => {
    it('digest template contains all article titles and source URLs', () => {
        const tpl = digestEmailTemplate({
            displayName: 'sarah',
            articles: [
                { title: 'A1', summary: 'S1', source_url: 'https://example.com/1', origin_jurisdiction: 'CA' },
                { title: 'A2', summary: 'S2', source_url: 'https://example.com/2', origin_jurisdiction: 'DE' },
            ],
            periodLabel: 'Daily',
        });
        expect(tpl.subject).toContain('Daily');
        expect(tpl.text).toContain('A1');
        expect(tpl.text).toContain('https://example.com/1');
        expect(tpl.html).toContain('Open Verified Source');
    });

    it('alert template includes jurisdiction and source URL', () => {
        const tpl = alertEmailTemplate({
            title: 'UK raises salary threshold',
            summary: 'From April.',
            source_url: 'https://gov.uk/x',
            jurisdiction: 'United Kingdom',
        });
        expect(tpl.subject).toContain('United Kingdom');
        expect(tpl.subject).toContain('UK raises salary threshold');
        expect(tpl.text).toContain('https://gov.uk/x');
    });

    it('escapes HTML to prevent injection in templates', () => {
        const tpl = digestEmailTemplate({
            displayName: '<script>',
            articles: [{ title: '<b>x</b>', summary: '"hi"', source_url: 'https://e.com', origin_jurisdiction: 'CA' }],
            periodLabel: 'Weekly',
        });
        expect(tpl.html).not.toContain('<script>');
        expect(tpl.html).toContain('&lt;script&gt;');
    });
});
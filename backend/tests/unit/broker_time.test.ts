import { describe, it, expect } from 'vitest';
import { nextDaily0700Utc, nextWeeklyMonday0700Utc, periodKey } from '../../src/notifications/broker.js';

describe('broker time computation', () => {
    it('nextDaily0700Utc returns today 07:00 if now is before 07:00', () => {
        const now = new Date('2026-06-26T03:30:00Z');
        const next = nextDaily0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-26T07:00:00.000Z');
    });

    it('nextDaily0700Utc returns tomorrow 07:00 if now is after 07:00', () => {
        const now = new Date('2026-06-26T10:30:00Z');
        const next = nextDaily0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-27T07:00:00.000Z');
    });

    it('nextDaily0700Utc returns tomorrow 07:00 if now is exactly 07:00', () => {
        const now = new Date('2026-06-26T07:00:00.000Z');
        const next = nextDaily0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-27T07:00:00.000Z');
    });

    it('nextWeeklyMonday0700Utc returns next Monday 07:00', () => {
        // 2026-06-26 is a Friday
        const now = new Date('2026-06-26T10:00:00Z');
        const next = nextWeeklyMonday0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-29T07:00:00.000Z');
    });

    it('nextWeeklyMonday0700Utc returns next Monday when currently Monday before 07:00', () => {
        const now = new Date('2026-06-29T03:00:00Z');
        const next = nextWeeklyMonday0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-29T07:00:00.000Z');
    });

    it('nextWeeklyMonday0700Utc returns following Monday when currently Monday after 07:00', () => {
        const now = new Date('2026-06-29T10:00:00Z');
        const next = nextWeeklyMonday0700Utc(now);
        expect(next.toISOString()).toBe('2026-07-06T07:00:00.000Z');
    });

    it('periodKey daily returns YYYY-MM-DD', () => {
        const key = periodKey(new Date('2026-06-26T15:00:00Z'), 'daily');
        expect(key).toBe('2026-06-26');
    });

    it('periodKey weekly returns ISO week', () => {
        const key = periodKey(new Date('2026-06-26T15:00:00Z'), 'weekly');
        expect(key).toMatch(/^2026-W\d{2}$/);
    });

    it('restart at 06:59:30 UTC still schedules today 07:00 UTC (no missed dispatch)', () => {
        const now = new Date('2026-06-26T06:59:30Z');
        const next = nextDaily0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-26T07:00:00.000Z');
    });

    it('restart at 07:00:01 UTC correctly schedules tomorrow (no double dispatch)', () => {
        const now = new Date('2026-06-26T07:00:01Z');
        const next = nextDaily0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-27T07:00:00.000Z');
    });

    it('restart on Sunday schedules Monday 07:00 UTC', () => {
        // 2026-06-28 is Sunday
        const now = new Date('2026-06-28T15:00:00Z');
        const next = nextWeeklyMonday0700Utc(now);
        expect(next.toISOString()).toBe('2026-06-29T07:00:00.000Z');
    });
});
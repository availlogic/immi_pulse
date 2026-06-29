import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, passwordMeetsPolicy } from '../../src/auth/password.js';
import { generateId } from '../../src/utils/id.js';

describe('password', () => {
    it('hashes and verifies a valid password', async () => {
        const hash = await hashPassword('Password123!');
        // Argon2id hash format: $argon2id$v=19$m=...,t=...,p=...$salt$hash
        expect(hash).toMatch(/^\$argon2id\$/);
        expect(await verifyPassword('Password123!', hash)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
        const hash = await hashPassword('Password123!');
        expect(await verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('rejects a malformed stored hash', async () => {
        expect(await verifyPassword('whatever', 'not-a-real-hash')).toBe(false);
    });

    it('produces unique hashes for the same input (random salt)', async () => {
        const h1 = await hashPassword('Password123!');
        const h2 = await hashPassword('Password123!');
        expect(h1).not.toBe(h2);
        expect(await verifyPassword('Password123!', h1)).toBe(true);
        expect(await verifyPassword('Password123!', h2)).toBe(true);
    });

    it('enforces 8-character minimum policy', () => {
        expect(passwordMeetsPolicy('short')).toBe(false);
        expect(passwordMeetsPolicy('longenough1')).toBe(true);
    });
});

describe('generateId', () => {
    it('returns prefixed id with alphanumeric body', () => {
        const id = generateId('usr');
        expect(id).toMatch(/^usr_[a-z0-9]+$/);
    });

    it('produces unique ids', () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateId('art')));
        expect(ids.size).toBe(1000);
    });
});
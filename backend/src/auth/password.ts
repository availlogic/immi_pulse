import { hash, verify, Algorithm } from '@node-rs/argon2';
import { config } from '../config.js';

// Argon2id is the OWASP-recommended password hashing algorithm
// (docs/Architecture.md §5: "Passwords stored using Argon2id or bcrypt").
const ARGON2_OPTIONS = {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19_456, // 19 MiB — OWASP minimum for argon2id (2024)
    timeCost: 2,
    parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    try {
        return await verify(stored, password);
    } catch {
        return false;
    }
}

export function passwordMeetsPolicy(password: string): boolean {
    // Per docs/User-Flows.md §3.2: min 8 characters.
    return typeof password === 'string' && password.length >= 8;
}

// `config.bcryptRounds` is kept for compatibility with the env var name from
// earlier docs; argon2id uses fixed OWASP-recommended parameters instead.
export const _legacyBcryptRounds = config.bcryptRounds;
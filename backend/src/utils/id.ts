import crypto from 'node:crypto';

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function generateId(prefix: string, length = 8): string {
    const bytes = crypto.randomBytes(length);
    let id = '';
    for (let i = 0; i < length; i++) {
        id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
    }
    return `${prefix}_${id}`;
}

export function isValidPrefix(prefix: string, id: string): boolean {
    return id.startsWith(`${prefix}_`);
}
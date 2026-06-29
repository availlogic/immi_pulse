import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<pg.QueryResult<T>> {
    return pool.query<T>(text, params as never);
}

export async function shutdownDb(): Promise<void> {
    await pool.end();
}
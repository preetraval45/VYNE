import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  logger.warn('DATABASE_URL is not set — using default localhost connection string');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/vyne_messaging',
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

/**
 * Execute a single SQL query using a pooled connection.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { duration, rows: result.rowCount });
    return result;
  } catch (err) {
    const error = err as Error;
    logger.error('Query error', { text, error: error.message });
    throw err;
  }
}

/**
 * Run a set of operations inside a single database transaction.
 * The callback receives a transaction-bound query function.
 * On any error the transaction is rolled back and the error re-thrown.
 */
export async function withTransaction<T>(
  callback: (txQuery: typeof query) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wrap client.query to match the signature of the module-level query helper
    const txQuery = async <R extends pg.QueryResultRow = pg.QueryResultRow>(
      text: string,
      params?: unknown[],
    ): Promise<pg.QueryResult<R>> => {
      return client.query<R>(text, params);
    };

    const result = await callback(txQuery as typeof query);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error: (err as Error).message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verify connectivity on startup.
 */
export async function connectDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connected successfully');
  } finally {
    client.release();
  }
}

export { pool };

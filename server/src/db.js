import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { logger } from './logger.js';
import { serverRoot, srcDir } from './paths.js';

const { Pool, types } = pg;

types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);

export { serverRoot };

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/transactiondb',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (error) => {
  logger.error('idle database client error', {
    pgCode: error.code ?? null,
    message: error.message,
  });
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function ensureSchema() {
  const sql = fs.readFileSync(path.join(srcDir, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

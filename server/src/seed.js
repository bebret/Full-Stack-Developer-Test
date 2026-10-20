import fs from 'node:fs';
import path from 'node:path';
import { ensureSchema, pool, serverRoot } from './db.js';

const dataFile = path.resolve(
  serverRoot,
  process.env.DATA_FILE ?? '../viewData.json',
);

function parseJsonTolerant(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const sanitized = raw.replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(sanitized);
    console.warn(
      `Peringatan: file sumber bukan JSON valid (${error.message}). Trailing comma dibersihkan otomatis saat import.`,
    );
    return parsed;
  }
}

async function seed() {
  if (!fs.existsSync(dataFile)) {
    throw new Error(`File sumber tidak ditemukan: ${dataFile}`);
  }

  const parsed = parseJsonTolerant(fs.readFileSync(dataFile, 'utf8'));
  const transactions = Array.isArray(parsed.data) ? parsed.data : [];
  const statuses = Array.isArray(parsed.status) ? parsed.status : [];

  await ensureSchema();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const status of statuses) {
      await client.query(
        `INSERT INTO statuses (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [status.id, status.name],
      );
    }

    for (const row of transactions) {
      await client.query(
        `INSERT INTO transactions (
           id, product_id, product_name, amount, customer_name,
           status, transaction_date, create_by, create_on
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           product_id = EXCLUDED.product_id,
           product_name = EXCLUDED.product_name,
           amount = EXCLUDED.amount,
           customer_name = EXCLUDED.customer_name,
           status = EXCLUDED.status,
           transaction_date = EXCLUDED.transaction_date,
           create_by = EXCLUDED.create_by,
           create_on = EXCLUDED.create_on,
           updated_at = now()`,
        [
          row.id,
          row.productID,
          row.productName,
          row.amount,
          row.customerName ?? null,
          row.status,
          row.transactionDate,
          row.createBy ?? null,
          row.createOn ?? null,
        ],
      );
    }

    await client.query(
      `SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 1))`,
    );

    await client.query('COMMIT');
    console.log(
      `Seed selesai: ${statuses.length} status, ${transactions.length} transaksi dari ${dataFile}`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error('Seed gagal:', error.message);
    pool.end().finally(() => process.exit(1));
  });

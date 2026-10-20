import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { ensureSchema, pool } from './db.js';
import { AppError, mapDatabaseError, mapHttpBodyError } from './errors.js';
import { logger } from './logger.js';
import statusesRouter from './routes/statuses.js';
import transactionsRouter, { summaryHandler } from './routes/transactions.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const startedAt = Date.now();
  res.on('finish', () => {
    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    };

    if (res.statusCode >= 500) logger.error('request failed', meta);
    else if (res.statusCode >= 400) logger.warn('request rejected', meta);
    else logger.info('request ok', meta);
  });

  next();
});

app.use(cors());
app.use(express.json());

const apiIndex = {
  name: 'Transaction App API',
  endpoints: [
    'GET    /api/health',
    'GET    /api/statuses',
    'GET    /api/transactions',
    'GET    /api/transactions/grouped',
    'GET    /api/transactions/summary',
    'GET    /api/summary',
    'GET    /api/transactions/:id',
    'POST   /api/transactions',
    'PUT    /api/transactions/:id',
    'DELETE /api/transactions/:id',
    'GET    /api/error-catalog',
  ],
  ui: 'http://localhost:5173',
};

const errorCatalog = [
  { code: 'VALIDATION_ERROR', status: 400, message: 'Payload tidak lolos validasi field.' },
  { code: 'MALFORMED_JSON', status: 400, message: 'Body bukan JSON valid.' },
  { code: 'INVALID_STATUS', status: 400, message: 'status tidak ada di tabel statuses.' },
  { code: 'INVALID_ID', status: 400, message: 'id bukan angka bulat positif.' },
  { code: 'INVALID_INPUT', status: 400, message: 'Format nilai tidak sesuai tipe kolom (dari PostgreSQL).' },
  { code: 'NOT_FOUND', status: 404, message: 'Data dengan id tersebut tidak ada.' },
  { code: 'DUPLICATE_KEY', status: 409, message: 'Tabrakan data: id/unique constraint sudah dipakai.' },
  { code: 'VERSION_CONFLICT', status: 409, message: 'Tabrakan data: record sudah diubah pihak lain.' },
  { code: 'FOREIGN_KEY_VIOLATION', status: 409, message: 'Referensi ke tabel lain tidak valid.' },
  { code: 'SERIALIZATION_FAILURE', status: 409, message: 'Tabrakan transaksi di database.' },
  { code: 'PAYLOAD_TOO_LARGE', status: 413, message: 'Body request terlalu besar.' },
  { code: 'SERVICE_UNAVAILABLE', status: 503, message: 'Database tidak dapat dihubungi.' },
  { code: 'INTERNAL_ERROR', status: 500, message: 'Kesalahan tak terduga di server.' },
];

app.get('/', (req, res) => res.json(apiIndex));
app.get('/api', (req, res) => res.json(apiIndex));
app.get('/api/error-catalog', (req, res) => res.json({ data: errorCatalog }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'down',
      error: 'Database tidak dapat dihubungi.',
      code: 'SERVICE_UNAVAILABLE',
      requestId: req.id,
      details: { pgCode: error.code ?? null },
    });
  }
});

app.get('/api/summary', summaryHandler);
app.use('/api/statuses', statusesRouter);
app.use('/api/transactions', transactionsRouter);

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint tidak ditemukan.',
    code: 'ENDPOINT_NOT_FOUND',
    requestId: req.id,
    hint: `Path "${req.method} ${req.originalUrl}" tidak terdaftar. Lihat daftar endpoint di GET /api`,
  });
});

app.use((error, req, res, next) => {
  const appError =
    error instanceof AppError
      ? error
      : mapHttpBodyError(error) ??
        mapDatabaseError(error) ??
        new AppError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan pada server.',
          details: { reason: error?.message ?? 'unknown' },
        });

  logger.error('error handled', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    code: appError.code,
    status: appError.status,
    pgCode: error?.code ?? null,
    pgDetail: error?.detail ?? null,
    message: appError.message,
    stack: error?.stack?.split('\n').slice(0, 4).join(' | ') ?? null,
  });

  const body = {
    error: appError.message,
    code: appError.code,
    requestId: req.id,
  };

  if (appError.details) body.details = appError.details;
  if (appError.errors) body.errors = appError.errors;

  res.status(appError.status).json(body);
});

async function start() {
  await ensureSchema();
  app.listen(port, () => {
    console.log(`API siap di http://localhost:${port}`);
    logger.info('server started', { port, logFile: logger.file });
  });
}

start().catch((error) => {
  console.error('Gagal menjalankan server:', error.message);
  process.exit(1);
});

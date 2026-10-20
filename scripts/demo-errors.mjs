import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(ROOT, 'server', 'logs', 'app.log');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'error-demo-output.txt');

const lines = [];
function emit(text = '') {
  console.log(text);
  lines.push(text);
}

async function call(method, urlPath, { body, rawBody } = {}) {
  const init = { method, headers: { 'Content-Type': 'application/json' } };
  if (rawBody !== undefined) init.body = rawBody;
  else if (body !== undefined) init.body = JSON.stringify(body);

  const response = await fetch(`${API}${urlPath}`, init);
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function report(name, description, result) {
  const code = result.payload?.code ?? '-';
  emit(`- ${name.padEnd(18)} HTTP ${String(result.status).padEnd(4)} code=${code}`);
  emit(`    ${description}`);
  emit(`    response: ${JSON.stringify(result.payload)}`);
  emit();
}

async function bumpVersionBehindTheScenes() {
  const detail = await call('GET', '/transactions/1372');
  const current = detail.payload.data;
  await call('PUT', '/transactions/1372', {
    body: {
      productID: current.productID,
      productName: current.productName,
      amount: current.amount,
      customerName: current.customerName,
      status: current.status,
      transactionDate: current.transactionDate,
      createBy: current.createBy,
      version: current.version,
    },
  });
  return current.version;
}

async function main() {
  emit('=== DEMO ERROR HANDLING & TABRAKAN DATA ===');
  emit(`API      : ${API}`);
  emit(`Waktu    : ${new Date().toISOString()}`);
  emit();

  report(
    'VALIDATION_ERROR',
    'POST /transactions dengan body kosong -> validasi per field.',
    await call('POST', '/transactions', { body: {} }),
  );

  report(
    'MALFORMED_JSON',
    'POST /transactions dengan JSON rusak -> body ditolak sebelum masuk logika bisnis.',
    await call('POST', '/transactions', { rawBody: '{"productID": "1",,}' }),
  );

  report(
    'INVALID_STATUS',
    'POST dengan status 9 yang tidak ada di tabel statuses.',
    await call('POST', '/transactions', {
      body: {
        productID: '10001',
        productName: 'Demo',
        amount: 10,
        status: 9,
        transactionDate: '2023-02-01 08:00:00',
      },
    }),
  );

  report(
    'NOT_FOUND',
    'GET transaksi dengan id yang tidak ada.',
    await call('GET', '/transactions/999999'),
  );

  report(
    'INVALID_ID',
    'GET transaksi dengan id bukan angka.',
    await call('GET', '/transactions/abc'),
  );

  report(
    'DUPLICATE_KEY',
    'POST dengan id 1372 yang sudah dipakai -> tabrakan data (melanggar primary key).',
    await call('POST', '/transactions', {
      body: {
        id: 1372,
        productID: '10001',
        productName: 'Duplikat',
        amount: 10,
        status: 0,
        transactionDate: '2023-02-01 08:00:00',
      },
    }),
  );

  const staleVersion = await bumpVersionBehindTheScenes();
  emit(`  (versi #1372 dinaikkan diam-diam menjadi ${staleVersion + 1})`);
  emit();

  report(
    'VERSION_CONFLICT',
    'PUT memakai version lama setelah data diubah proses lain -> tabrakan data (optimistic locking).',
    await call('PUT', '/transactions/1372', {
      body: {
        productID: '10001',
        productName: 'Test 1',
        amount: 1000,
        customerName: 'abc',
        status: 0,
        transactionDate: '2022-07-10 11:14:52',
        createBy: 'abc',
        version: staleVersion,
      },
    }),
  );

  report(
    'ENDPOINT_NOT_FOUND',
    'GET path yang tidak terdaftar.',
    await call('GET', '/transactions/1/extra'),
  );

  emit('=== LOG SERVER (error handled, 10 terakhir) ===');
  if (fs.existsSync(LOG_FILE)) {
    const logLines = fs
      .readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter((line) => line.includes('"error handled"') || line.includes('"request rejected"'))
      .slice(-10);
    for (const line of logLines) emit(line);
  } else {
    emit(`(log belum ada: ${LOG_FILE})`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${lines.join('\n')}\n`);
  console.log(`\nOutput disimpan ke ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('Demo gagal:', error.message);
  process.exit(1);
});

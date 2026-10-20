import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const EDGE_PATH =
  process.env.EDGE_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3001/api';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'errors');

fs.mkdirSync(OUT_DIR, { recursive: true });

function docker(args) {
  return execSync(`docker compose ${args}`, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
}

async function api(method, urlPath, body) {
  const response = await fetch(`${API_URL}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

const browser = await puppeteer.launch({
  executablePath: EDGE_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1680, height: 1000 },
});

const page = await browser.newPage();
await page.setCacheEnabled(false);
page.on('dialog', async (dialog) => dialog.accept());

const saved = [];

try {
  // 1. Validasi field di halaman Tambah Data
  await page.goto(`${BASE_URL}/add`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('form');
  await page.evaluate(() => {
    document.querySelector('form').noValidate = true;
  });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((item) =>
      item.textContent.includes('Simpan Data'),
    );
    button.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('tidak valid'), {
    timeout: 10000,
  });
  saved.push(
    await page
      .screenshot({ path: path.join(OUT_DIR, '01-validation-error.png') })
      .then(() => '01-validation-error.png'),
  );
  console.log('captured 01-validation-error.png');

  // 2. Tabrakan data (VERSION_CONFLICT) di halaman Edit
  await page.goto(`${BASE_URL}/edit/1372`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('form');
  await page.waitForFunction(
    () => document.querySelectorAll('form input')[1]?.value !== '',
    { timeout: 10000 },
  );

  const detail = await api('GET', '/transactions/1372');
  const current = detail.data;
  await api('PUT', '/transactions/1372', {
    productID: current.productID,
    productName: current.productName,
    amount: current.amount,
    customerName: current.customerName,
    status: current.status,
    transactionDate: current.transactionDate,
    createBy: current.createBy,
    version: current.version,
  });
  console.log(`form memegang versi ${current.version}, server kini versi ${current.version + 1}`);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((item) =>
      item.textContent.includes('Simpan Perubahan'),
    );
    button.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes('VERSION_CONFLICT'),
    { timeout: 15000 },
  );
  await page.screenshot({ path: path.join(OUT_DIR, '02-version-conflict.png') });
  saved.push('02-version-conflict.png');
  console.log('captured 02-version-conflict.png');

  // 3. Data tidak ditemukan
  await page.goto(`${BASE_URL}/view/999999`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('NOT_FOUND'), {
    timeout: 10000,
  });
  await page.screenshot({ path: path.join(OUT_DIR, '03-not-found.png') });
  saved.push('03-not-found.png');
  console.log('captured 03-not-found.png');

  // 4. Database mati -> 503
  try {
    docker('stop db');
    console.log('container db dihentikan sementara');
    await page.goto(`${BASE_URL}/?ts=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.body.innerText.includes('SERVICE_UNAVAILABLE'),
      { timeout: 45000 },
    );
    await page.screenshot({ path: path.join(OUT_DIR, '04-database-down.png') });
    saved.push('04-database-down.png');
    console.log('captured 04-database-down.png');
  } catch (error) {
    console.warn(`peringatan: screenshot 503 dilewati (${error.message})`);
  } finally {
    docker('start db');
    console.log('container db dinyalakan kembali');
  }

  console.log(`\nSelesai. ${saved.length} screenshot di ${OUT_DIR}`);
} finally {
  await browser.close();
}

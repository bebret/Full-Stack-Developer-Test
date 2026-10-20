import puppeteer from 'puppeteer-core';

const EDGE_PATH =
  process.env.EDGE_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

const results = [];

function check(name, condition) {
  if (!condition) {
    results.push({ name, ok: false });
    throw new Error(`GAGAL: ${name}`);
  }
  results.push({ name, ok: true });
  console.log(`PASS  ${name}`);
}

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function clickByText(page, label) {
  const clicked = await page.evaluate((text) => {
    const targets = [...document.querySelectorAll('button, a')];
    const target = targets.find((element) => element.textContent.trim().includes(text));
    if (!target) return false;
    target.click();
    return true;
  }, label);
  if (!clicked) throw new Error(`Tombol/link "${label}" tidak ditemukan`);
}

const browser = await puppeteer.launch({
  executablePath: EDGE_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1680, height: 1200 },
});

const page = await browser.newPage();
const pageErrors = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
});
page.on('dialog', async (dialog) => {
  console.log(`INFO  dialog: ${dialog.message()}`);
  await dialog.accept();
});

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Tahun 2022'), {
    timeout: 15000,
  });

  const dashboardText = await bodyText(page);
  check('Dashboard memuat grid table', dashboardText.includes('Tahun 2022'));
  check(
    'Grouping bulan tampil (Juli, Agustus, September)',
    dashboardText.includes('Juli 2022') &&
      dashboardText.includes('Agustus 2022') &&
      dashboardText.includes('September 2022'),
  );
  check('Summary cards tampil', dashboardText.includes('TOTAL TRANSAKSI'));

  const rowCount = await page.$$eval('tbody tr', (rows) =>
    rows.filter((row) => /^\d+$/.test(row.querySelector('td')?.textContent.trim() ?? '')).length,
  );
  check(`Baris transaksi ter-render (${rowCount})`, rowCount >= 12);

  const selects = await page.$$('select');
  await selects[1].select('8');
  await page.waitForFunction(
    () => document.body.innerText.includes('Agustus 2022') && !document.body.innerText.includes('September 2022'),
    { timeout: 10000 },
  );
  const filteredText = await bodyText(page);
  check(
    'Filter bulan Agustus menyaring grid',
    filteredText.includes('Agustus 2022') && !filteredText.includes('Juli 2022'),
  );

  await clickByText(page, 'Reset');
  await page.waitForFunction(() => document.body.innerText.includes('September 2022'), {
    timeout: 10000,
  });
  check('Reset filter mengembalikan seluruh data', true);

  await clickByText(page, 'Tambah Data');
  await page.waitForFunction(() => location.pathname === '/add');
  await page.waitForSelector('form');

  const inputs = await page.$$('form input');
  await inputs[0].type('10099');
  await inputs[1].type('UI Add Test');
  await inputs[2].click({ clickCount: 3 });
  await inputs[2].type('4321');
  await inputs[3].type('ui-customer');
  await page.evaluate(() => {
    const element = document.querySelectorAll('form input')[4];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;
    setter.call(element, '2023-01-05T09:30');
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await inputs[5].type('tester-ui');

  await clickByText(page, 'Simpan Data');
  await page.waitForFunction(() => location.pathname.startsWith('/view/'), { timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('UI Add Test'), {
    timeout: 10000,
  });

  const createdId = await page.evaluate(() => location.pathname.split('/').pop());
  const createdText = await bodyText(page);
  check(`Add page menyimpan data baru (#${createdId})`, createdText.includes('UI Add Test'));
  check(
    'Data baru masuk grouping Januari 2023',
    createdText.includes('Grouping: Januari 2023'),
  );
  check('Amount tersimpan benar', createdText.includes('4.321'));

  await clickByText(page, 'Edit');
  await page.waitForFunction(() => location.pathname.startsWith('/edit/'));
  await page.waitForSelector('form');

  const editInputs = await page.$$('form input');
  const prefillName = await editInputs[1].evaluate((element) => element.value);
  check('Edit page ter-prefill data lama', prefillName === 'UI Add Test');

  await page.screenshot({ path: 'docs/screenshots/04-edit.png' });

  await editInputs[1].click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await editInputs[1].type('UI Add Edited');
  const replacedName = await editInputs[1].evaluate((element) => element.value);
  check('Edit page mengganti nilai (bukan menambah)', replacedName === 'UI Add Edited');
  await clickByText(page, 'Simpan Perubahan');
  await page.waitForFunction(() => location.pathname.startsWith('/view/'), { timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('UI Add Edited'), {
    timeout: 10000,
  });
  const afterEditText = await bodyText(page);
  check(
    'Edit page menyimpan perubahan dan nama lama tidak tersisa',
    afterEditText.includes('UI Add Edited') && !afterEditText.includes('UI Add Test'),
  );

  await clickByText(page, 'Hapus Data');
  await page.waitForFunction(() => location.pathname === '/', { timeout: 15000 });
  await page.waitForFunction(() => !document.body.innerText.includes('UI Add Edited'), {
    timeout: 15000,
  });
  check('Hapus data berhasil dan grid ter-update', true);

  const relevantErrors = pageErrors.filter((message) => !message.includes('favicon'));
  check(
    `Tidak ada error runtime di browser${relevantErrors.length ? `: ${relevantErrors.join(' | ')}` : ''}`,
    relevantErrors.length === 0,
  );

  console.log(`\nE2E selesai: ${results.filter((item) => item.ok).length}/${results.length} pemeriksaan lolos.`);
} finally {
  await browser.close();
}

const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';

function parseCSV(str) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQuotes) { if (c === '"') { if (str[i+1] === '"') { field += '"'; i++; } else inQuotes = false; } else field += c; }
    else { if (c === '"') inQuotes = true; else if (c === ',') { row.push(field); field=''; } else if (c === '\r') {} else if (c === '\n') { row.push(field); rows.push(row); row=[]; field=''; } else field += c; }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText || document.querySelector('pre')?.innerText || '');
    const g = parseCSV(text);
    const ids = [];
    for (let i = 20; i <= 31; i++) ids.push('KHQ_IV_0' + String(i).padStart(2, '0'));
    ids.push('KHQ_IV_498', 'KHQ_IV_651');
    for (const id of ids) {
      const idx = g.findIndex((r) => (r[0] || '').trim() === id);
      if (idx < 0) { console.log(id, 'NOT FOUND'); continue; }
      const r = g[idx];
      console.log(id, 'H=' + r[7], 'K=' + r[10]);
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

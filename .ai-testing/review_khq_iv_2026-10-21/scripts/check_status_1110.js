process.env.CDP = process.env.CDP || 'http://127.0.0.1:9222';
const L = require('./lib');
const { parseCsv } = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/src/core/sheet_service');
const { sleep } = L;
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';

(async () => {
  const { browser, page } = await L.open();
  try {
    const cookies = await page.cookies('https://docs.google.com');
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`, {
      headers: { Cookie: cookies.map((c) => c.name + '=' + c.value).join('; ') },
    });
    const g = parseCsv(await res.text());
    const ids = [];
    for (let i = 20; i <= 31; i++) ids.push('KHQ_IV_0' + String(i).padStart(2, '0'));
    ids.push('KHQ_IV_498', 'KHQ_IV_651');
    for (const id of ids) {
      const idx = g.findIndex((r) => (r[0] || '').trim() === id);
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

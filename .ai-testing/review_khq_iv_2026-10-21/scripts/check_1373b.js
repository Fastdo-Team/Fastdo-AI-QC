const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function navTo(page, ref) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.focus('#t-name-box');
    await sleep(200);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await sleep(200);
    await page.keyboard.type(ref, { delay: 25 });
    await sleep(250);
    const typed = await page.evaluate(() => document.querySelector('#t-name-box').value);
    if (typed === ref) { await page.keyboard.press('Enter'); await sleep(600); return; }
    await sleep(300);
  }
  throw new Error('nav failed for ' + ref);
}
async function readCell(page, ref) {
  await navTo(page, ref);
  return page.evaluate(() => { const el = document.querySelector('.cell-input'); return el ? el.innerText : null; });
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.bringToFront();
    await sleep(8000);
    for (const r of [978, 979, 980, 981, 982, 983]) {
      const a = await readCell(page, 'A' + r);
      const h = await readCell(page, 'H' + r);
      const i = await readCell(page, 'I' + r);
      const k = await readCell(page, 'K' + r);
      console.log(`row ${r}: A=${JSON.stringify(a)} H=${JSON.stringify(h)} K=${JSON.stringify(k)}`);
      console.log(`  I=${JSON.stringify((i||'').slice(0,150))}`);
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

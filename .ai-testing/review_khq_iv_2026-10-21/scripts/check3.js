const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function navTo(page, ref) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(() => { const n = document.querySelector('#t-name-box'); n.focus(); n.select(); });
    await page.keyboard.sendCharacter(ref);
    await page.keyboard.press('Enter');
    await sleep(500);
    const now = await page.evaluate(() => document.querySelector('#t-name-box').value);
    if (now.toUpperCase() === ref.toUpperCase()) return;
    await sleep(300);
  }
  throw new Error('nav failed ' + ref);
}
async function readCell(page, ref) {
  await navTo(page, ref);
  return page.evaluate(() => {
    const el = document.querySelector('.cell-input');
    return el ? el.innerText.replace(/\n/g, ' ').slice(0, 60) : null;
  });
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#t-name-box', { timeout: 60000 });
    await sleep(6000);
    const rows = [320,321,322,323,324,325,326,327,328,329,330,331,798,951];
    for (const r of rows) {
      const h = await readCell(page, 'H' + r);
      const k = await readCell(page, 'K' + r);
      console.log('row', r, 'H=', h, 'K=', k);
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

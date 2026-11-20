const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function navTo(page, ref) {
  for (let a = 0; a < 5; a++) {
    await page.evaluate(() => { const n = document.querySelector('#t-name-box'); if (n) { n.focus(); n.select(); } });
    await sleep(200);
    await page.keyboard.sendCharacter(ref);
    await page.keyboard.press('Enter');
    await sleep(700);
    const now = await page.evaluate(() => { const n = document.querySelector('#t-name-box'); return n ? n.value : null; });
    if (now && now.toUpperCase() === ref.toUpperCase()) return;
    await sleep(500);
  }
  throw new Error('nav failed ' + ref);
}
async function readCell(page, ref) {
  await navTo(page, ref);
  return page.evaluate(() => { const el = document.querySelector('.cell-input'); return el ? el.innerText.replace(/\n/g, ' | ').slice(0, 200) : null; });
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.bringToFront();
    await sleep(8000);
    const hasBox = await page.evaluate(() => !!document.querySelector('#t-name-box'));
    console.log('hasBox', hasBox);
    for (const r of [978, 979, 980, 981, 982, 983]) {
      for (const col of ['A', 'D', 'H', 'I', 'K']) {
        const v = await readCell(page, col + r);
        if (v) console.log(col + r, '=', v.slice(0, 150));
      }
      console.log('---');
    }
  } catch (e) {
    console.log('ERR', e.message);
    await page.screenshot({ path: 'check_1373_error.png' }).catch(() => {});
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

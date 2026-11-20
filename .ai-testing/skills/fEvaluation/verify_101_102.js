const puppeteer = require('puppeteer-core');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
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
  const val = await page.evaluate(() => {
    const el = document.querySelector('.cell-input');
    return el ? el.innerText : null;
  });
  return val;
}
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p=>p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  await page.bringToFront();
  await sleep(500);
  for (const ref of ['H401','I401','K401','H402','I402','K402']) {
    const v = await readCell(page, ref);
    console.log(ref, '=>', JSON.stringify((v||'').slice(0,80)));
  }
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

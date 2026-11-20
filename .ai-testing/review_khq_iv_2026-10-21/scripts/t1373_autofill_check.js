const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2500);
    const inputs = await page.$$('input');
    const box = await inputs[0].boundingBox();
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    await sleep(1200);
    await page.screenshot({ path: 't1373_autofill.png' });
    const val = await page.evaluate(el => el.value, inputs[0]);
    console.log('email field value after click (possible autofill):', val);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

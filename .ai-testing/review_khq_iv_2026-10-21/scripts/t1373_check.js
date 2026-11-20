const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  try {
    await page.goto('https://dev1.fastdo.vn/homepage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    await page.bringToFront();
    await page.screenshot({ path: 't1373_home.png', fullPage: false });
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('URL:', page.url());
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

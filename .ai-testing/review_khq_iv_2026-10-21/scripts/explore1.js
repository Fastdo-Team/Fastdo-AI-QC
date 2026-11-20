const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'https://60rr1632-3000.asse.devtunnels.ms';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto(BASE + '/homepage', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
    await sleep(3000);
    console.log('URL after homepage goto:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('BODY:', bodyText);
    await page.screenshot({ path: 'explore1_home.png' });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

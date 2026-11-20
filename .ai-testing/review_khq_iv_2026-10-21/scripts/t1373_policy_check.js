const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.goto('https://dev1.fastdo.vn/payroll/config/penalty-policies', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3500);
    await page.screenshot({ path: 't1373_penalty_policies.png', fullPage: true });
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    console.log('url', page.url());
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

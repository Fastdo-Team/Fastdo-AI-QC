const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  await page.screenshot({ path: 't1373_current.png' });
  console.log('url', page.url());
  const n = (await page.$$('input')).length;
  console.log('inputs', n);
  browser.disconnect();
})();

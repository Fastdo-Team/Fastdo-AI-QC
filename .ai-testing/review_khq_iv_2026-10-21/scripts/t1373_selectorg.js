const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('*')];
      const el = els.find(e => e.childElementCount === 0 && e.textContent.trim() === 'Water Quality - NH3T TEAM');
      if (el) { el.click(); return true; }
      return false;
    });
    console.log('org clicked', clicked);
    await sleep(4000);
    await page.screenshot({ path: 't1373_after_org.png' });
    console.log('url', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

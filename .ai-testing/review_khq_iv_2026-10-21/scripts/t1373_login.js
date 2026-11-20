const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.bringToFront();
  try {
    await page.goto('https://dev1.fastdo.vn/homepage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    // click "Đăng nhập"
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('a,button,div,span')];
      const el = els.find(e => e.childElementCount === 0 && e.textContent.trim() === 'Đăng nhập');
      if (el) { el.scrollIntoView({block:'center'}); el.click(); return true; }
      return false;
    });
    console.log('clicked login link:', clicked);
    await sleep(2500);
    await page.screenshot({ path: 't1373_login1.png' });
    console.log('url', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(()=>{});
    browser.disconnect();
  }
})();

const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,a,div,span')];
      const el = btns.find(b => b.childElementCount === 0 && b.textContent.trim() === 'Hủy');
      if (el) el.click();
    });
    await sleep(1000);
    // check current clock + employee avatar tooltip
    const info = await page.evaluate(() => document.querySelector('.alarm_on, [class*=time]')?.textContent || '');
    console.log('closed. info=', info);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

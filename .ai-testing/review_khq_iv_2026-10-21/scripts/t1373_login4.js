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
      const els = [...document.querySelectorAll('a,button,div,span')];
      const el = els.find(e => e.childElementCount === 0 && e.textContent.trim() === 'Đăng nhập');
      if (el) el.click();
    });
    await sleep(1500);
    const inputs = await page.$$('input');
    console.log('inputs found', inputs.length);
    if (inputs.length) {
      const box = await inputs[0].boundingBox();
      await page.mouse.click(box.x + 5, box.y + box.height/2);
      await sleep(1500);
      await page.screenshot({ path: 't1373_autofill2.png' });
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

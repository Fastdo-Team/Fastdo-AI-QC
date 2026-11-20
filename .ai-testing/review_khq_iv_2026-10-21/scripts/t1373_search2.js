const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    // dismiss notification popup
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,a')];
      const el = btns.find(b => b.textContent.trim() === 'Từ chối');
      if (el) el.click();
    });
    await sleep(500);
    const box = await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Tìm tên nhân viên"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: r.x, y: r.y, w: r.width, h: r.height};
    });
    console.log('box', box);
    if (box) {
      await page.mouse.click(box.x + box.w/2, box.y + box.h/2);
      await sleep(300);
      await page.keyboard.type('Hoàng Lệ Giang', { delay: 30 });
      await sleep(1500);
    }
    await page.screenshot({ path: 't1373_search2.png', fullPage: true });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

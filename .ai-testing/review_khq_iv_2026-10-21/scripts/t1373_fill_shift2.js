const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [,, NAME] = process.argv;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.screenshot({ path: 't1373_pos2.png' }); // trap workaround
    const box = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input[type=text]')];
      const el = inputs.find(i => { const r = i.getBoundingClientRect(); return r.width > 400 && r.y < 250 && r.y > 150; });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: r.x, y: r.y, w: r.width, h: r.height};
    });
    console.log('box', box);
    if (box) {
      await page.mouse.click(box.x + box.w/2, box.y + box.h/2);
      await sleep(300);
      await page.keyboard.type(NAME, { delay: 30 });
    }
    await sleep(500);
    const val = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input[type=text]')];
      const el = inputs.find(i => { const r = i.getBoundingClientRect(); return r.width > 400 && r.y < 250 && r.y > 150; });
      return el ? el.value : null;
    });
    console.log('typed name value:', val);
    await page.screenshot({ path: 't1373_after_name2.png' });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

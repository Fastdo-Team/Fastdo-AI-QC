const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [,, NAME, START, END] = process.argv;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.screenshot({ path: 't1373_pos.png' }); // trap workaround
    const nameBox = await page.evaluate(() => {
      const el = document.querySelector('input[type=text]') || [...document.querySelectorAll('input')].find(i=>i.type!=='checkbox');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x:r.x, y:r.y, w:r.width, h:r.height};
    });
    console.log('nameBox', nameBox);
    if (nameBox) {
      await page.mouse.click(nameBox.x + nameBox.w/2, nameBox.y + nameBox.h/2);
      await sleep(300);
      await page.keyboard.type(NAME, { delay: 30 });
    }
    await sleep(500);
    const val = await page.evaluate(() => document.querySelector('input[type=text]')?.value);
    console.log('typed name value:', val);
    // click Gio bat dau dropdown
    const clickedStart = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('label,div,span')];
      const lab = labels.find(l => l.textContent.trim().startsWith('Giờ bắt đầu'));
      if (!lab) return 'no label';
      // find nearest select-like control after label
      let el = lab.closest('div')?.nextElementSibling || lab.parentElement?.querySelector('[class*=select]');
      return lab.outerHTML.slice(0,100);
    });
    console.log('start label check', clickedStart);
    await page.screenshot({ path: 't1373_after_name.png' });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

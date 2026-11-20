const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// args: name, startTime, endTime  (HH:MM)
const [,, NAME, START, END] = process.argv;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,a,div,span')];
      const el = btns.find(b => b.childElementCount <= 2 && b.textContent.trim() === 'Tạo ca làm');
      if (el) el.click();
    });
    await sleep(1500);
    await page.screenshot({ path: 't1373_shift_modal1.png' }); // trap workaround: screenshot before clicking input
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('MODAL BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

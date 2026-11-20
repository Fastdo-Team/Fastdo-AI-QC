const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [,, START, END] = process.argv;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    const result = await page.evaluate((start, end) => {
      const selects = [...document.querySelectorAll('select')];
      const startSel = selects[0];
      const endSel = selects[1];
      function setVal(sel, text) {
        const opt = [...sel.options].find(o => o.textContent.trim() === text);
        if (!opt) return 'no option ' + text;
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        return 'set to ' + opt.value;
      }
      return { start: setVal(startSel, start), end: setVal(endSel, end) };
    }, START, END);
    console.log(JSON.stringify(result));
    await sleep(500);
    await page.screenshot({ path: 't1373_times_set.png' });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

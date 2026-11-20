const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    // click the small search icon near top of the shift grid
    const clicked = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('.material-icons, .material-icons-outlined')];
      const el = icons.filter(i => i.textContent.trim() === 'search');
      if (el.length > 1) { el[1].click(); return 'clicked second search'; }
      if (el.length === 1) { el[0].click(); return 'clicked first search'; }
      return 'not found';
    });
    console.log(clicked);
    await sleep(800);
    const inputs = await page.$$('input');
    console.log('inputs', inputs.length);
    // try typing into any visible text input
    for (const inp of inputs) {
      const visible = await page.evaluate(el => el.offsetParent !== null, inp);
      if (visible) {
        await inp.click();
        await inp.type('Hoàng Lệ Giang', { delay: 20 });
        break;
      }
    }
    await sleep(1500);
    await page.screenshot({ path: 't1373_emp_search.png', fullPage: true });
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

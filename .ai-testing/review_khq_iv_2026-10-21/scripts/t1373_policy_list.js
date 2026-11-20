const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    // dismiss push notification popup if present
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,a,div,span')];
      const el = btns.find(b => b.childElementCount === 0 && b.textContent.trim() === 'Từ chối');
      if (el) el.click();
    });
    await sleep(1000);
    await page.screenshot({ path: 't1373_policy_list.png', fullPage: true });
    const rows = await page.evaluate(() => {
      // try to find table/list rows with title text
      const body = document.body.innerText;
      return body;
    });
    console.log(rows.slice(0, 3000));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

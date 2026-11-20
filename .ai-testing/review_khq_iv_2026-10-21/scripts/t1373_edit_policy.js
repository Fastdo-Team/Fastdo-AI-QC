const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    const clicked = await page.evaluate(() => {
      const row = [...document.querySelectorAll('tr,div')].find(e => e.textContent.includes('ai cho về sớm (phạt)'));
      // find edit icon within the row's area - broad search for pencil-like button near the text
      const icons = [...document.querySelectorAll('[class*=edit], .material-icons, .material-icons-outlined')];
      const editIcon = icons.find(i => i.textContent.trim() === 'edit');
      if (editIcon) { editIcon.click(); return 'clicked edit icon'; }
      return 'not found';
    });
    console.log('result', clicked);
    await sleep(2500);
    await page.screenshot({ path: 't1373_policy_popup.png', fullPage: true });
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

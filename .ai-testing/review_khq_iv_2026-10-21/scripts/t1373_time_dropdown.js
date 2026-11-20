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
      const labels = [...document.querySelectorAll('label')];
      const lab = labels.find(l => l.textContent.trim().startsWith('Giờ bắt đầu'));
      if (!lab) return 'no label';
      const field = lab.closest('.field');
      const control = field.querySelector('.control, [class*=select], div[class*=dropdown]');
      if (control) { control.click(); return 'clicked control: ' + control.className; }
      return 'no control found, field html: ' + field.innerHTML.slice(0,300);
    });
    console.log(clicked);
    await sleep(1000);
    await page.screenshot({ path: 't1373_time_dd.png' });
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('BODY after click:', bodyText.slice(-800));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

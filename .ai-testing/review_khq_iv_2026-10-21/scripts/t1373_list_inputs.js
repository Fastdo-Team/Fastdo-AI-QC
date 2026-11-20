const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  const list = await page.evaluate(() => {
    return [...document.querySelectorAll('input')].map(el => {
      const r = el.getBoundingClientRect();
      return {type: el.type, visible: el.offsetParent !== null, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), placeholder: el.placeholder};
    });
  });
  console.log(JSON.stringify(list, null, 1));
  browser.disconnect();
})();

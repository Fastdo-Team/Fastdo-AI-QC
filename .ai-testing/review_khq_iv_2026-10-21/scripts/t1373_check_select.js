const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB'); browser.disconnect(); return; }
  await page.bringToFront();
  const info = await page.evaluate(() => {
    const el = document.elementFromPoint(774, 455);
    return el ? {tag: el.tagName, class: el.className, outer: el.outerHTML.slice(0,200)} : null;
  });
  console.log(JSON.stringify(info, null, 1));
  const selInfo = await page.evaluate(() => {
    return [...document.querySelectorAll('select')].map(s => {
      const r = s.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), options: [...s.options].map(o=>o.textContent).slice(0,5)};
    });
  });
  console.log('selects:', JSON.stringify(selInfo, null, 1));
  browser.disconnect();
})();

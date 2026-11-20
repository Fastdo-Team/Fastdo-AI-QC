const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL = 'tester01.fastdo@gmail.com';
const PASS = '<MAT_KHAU_TEST — điền trong .env>';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.bringToFront();
  try {
    await page.goto('https://dev1.fastdo.vn/homepage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('a,button,div,span')];
      const el = els.find(e => e.childElementCount === 0 && e.textContent.trim() === 'Đăng nhập');
      if (el) el.click();
    });
    await sleep(2000);
    const inputs = await page.$$('input');
    console.log('num inputs after click', inputs.length);
    for (const inp of inputs) {
      const info = await page.evaluate(el => ({type: el.type, placeholder: el.placeholder}), inp);
      console.log('input:', JSON.stringify(info));
    }
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(EMAIL, { delay: 20 });
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type(PASS, { delay: 20 });
      await sleep(500);
      await page.evaluate(() => {
        const els = [...document.querySelectorAll('button,a,div')];
        const el = els.find(e => e.childElementCount === 0 && e.textContent.trim() === 'Đăng nhập');
        if (el) el.click();
      });
      await sleep(4000);
    }
    await page.screenshot({ path: 't1373_after_login.png' });
    console.log('url after submit', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('BODY:', bodyText);
    const targets = await browser.targets();
    const myTarget = targets.find(t => t._targetId === page.target()._targetId);
    console.log('targetId', page.target()._targetId);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

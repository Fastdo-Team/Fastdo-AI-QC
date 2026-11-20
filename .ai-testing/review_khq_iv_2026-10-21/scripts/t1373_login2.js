const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL = 'tester01.fastdo@gmail.com';
const PASS = '<MAT_KHAU_TEST — điền trong .env>';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // reuse existing dev1 tab if present
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.bringToFront();
  try {
    const hasLoginForm = await page.evaluate(() => !!document.querySelector('input[type=email], input[type=text]'));
    console.log('hasLoginForm', hasLoginForm, 'url', page.url());
    // find email/password inputs generically
    const emailSel = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input')];
      const email = inputs.find(i => i.type === 'email' || i.placeholder?.toLowerCase().includes('email'));
      return email ? true : false;
    });
    console.log('emailSel found', emailSel);
    const inputs = await page.$$('input');
    console.log('num inputs', inputs.length);
    for (const inp of inputs) {
      const info = await page.evaluate(el => ({type: el.type, placeholder: el.placeholder, name: el.name}), inp);
      console.log('input:', JSON.stringify(info));
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

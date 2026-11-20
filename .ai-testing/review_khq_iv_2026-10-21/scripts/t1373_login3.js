const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL = 'tester01.fastdo@gmail.com';
const PASS = '<MAT_KHAU_TEST — điền trong .env>';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dev1.fastdo.vn'));
  if (!page) { console.log('NO TAB FOUND'); browser.disconnect(); return; }
  await page.bringToFront();
  try {
    const inputs = await page.$$('input');
    // clear email
    await inputs[0].click({ clickCount: 3 });
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inputs[0].type(EMAIL, { delay: 15 });
    // clear password
    await inputs[1].click({ clickCount: 3 });
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inputs[1].type(PASS, { delay: 15 });
    await sleep(500);
    const val0 = await page.evaluate(el => el.value, inputs[0]);
    const val1 = await page.evaluate(el => el.value, inputs[1]);
    console.log('email value:', val0, 'pass length:', val1.length);
    await page.screenshot({ path: 't1373_before_submit.png' });
    // click submit button precisely (button element with text Đăng nhập, inside form, not nav)
    const btnClicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => b.textContent.trim() === 'Đăng nhập');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('btnClicked', btnClicked);
    await sleep(5000);
    await page.screenshot({ path: 't1373_after_submit2.png' });
    console.log('url', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('BODY:', bodyText);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    browser.disconnect();
  }
})();

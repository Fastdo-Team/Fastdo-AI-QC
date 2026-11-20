const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  console.log('URL after login:', page.url());
  await page.screenshot({ path: 'smoke_login.png' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });

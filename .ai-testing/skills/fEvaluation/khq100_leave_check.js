const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'hrm/annual-leave', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  console.log('URL:', page.url());
  const text = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log(text);
  await page.screenshot({ path: 'khq100_leave_board.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

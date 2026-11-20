const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'config/timekeeping/dayoff', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const addBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Thêm mới")]');
  console.log('addBtn found', !!addBtn);
  if (addBtn) { await addBtn.click(); await lib.sleep(1500); }
  await page.screenshot({ path: 'khq160_addform.png', fullPage: true });
  const inputs = await page.$$eval('input, select, textarea', els => els.map(e => ({tag: e.tagName, type: e.type, placeholder: e.placeholder, name: e.name})));
  console.log(JSON.stringify(inputs, null, 2));
  await page.close();
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

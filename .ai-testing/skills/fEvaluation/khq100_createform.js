const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'hrm/timekeeping?tab=3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }

  let createBtn = await page.$('xpath/.//button[contains(., "Tạo mới")]');
  if (!createBtn) createBtn = await page.$('xpath/.//*[self::button or self::a or self::div][contains(., "Tạo mới")]');
  console.log('createBtn', !!createBtn);
  if (!createBtn) {
    const buttons = await page.$$eval('button', els => els.map(e => e.textContent.trim()));
    console.log('all buttons:', JSON.stringify(buttons));
  }
  if (createBtn) { await createBtn.click(); await lib.sleep(1500); }
  await page.screenshot({ path: 'khq100_createform1.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

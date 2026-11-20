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

  await page.evaluate(() => {
    const as = Array.from(document.querySelectorAll('a.button.is-primary'));
    const a = as.find(e => e.textContent.includes('Tạo mới'));
    if (a) a.click();
  });
  await lib.sleep(1500);

  const opts = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const sel = selects.find(s => Array.from(s.options).some(o => o.textContent.includes('Chọn loại đơn từ')));
    if (!sel) return 'select not found, total selects=' + selects.length;
    return Array.from(sel.options).map(o => ({value: o.value, text: o.textContent.trim()}));
  });
  console.log(JSON.stringify(opts, null, 2));
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

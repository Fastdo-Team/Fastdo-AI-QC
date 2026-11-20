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

  const selClicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Chọn loại đơn từ');
    if (!el) return 'select not found';
    el.click();
    return 'clicked select';
  });
  console.log(selClicked);
  await lib.sleep(1000);
  await page.screenshot({ path: 'khq100_createform5.png', fullPage: true });

  const options = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('li, .dropdown-item, [role=option]'));
    return all.map(e => e.textContent.trim()).filter(Boolean).slice(0, 40);
  });
  console.log('options:', JSON.stringify(options));

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

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

  const clicked = await page.evaluate(() => {
    const as = Array.from(document.querySelectorAll('a.button.is-primary'));
    const a = as.find(e => e.textContent.includes('Tạo mới'));
    if (!a) return 'not found among ' + as.length;
    a.click();
    return 'clicked: ' + a.textContent.trim();
  });
  console.log(clicked);
  await lib.sleep(1500);
  await page.screenshot({ path: 'khq100_createform4.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

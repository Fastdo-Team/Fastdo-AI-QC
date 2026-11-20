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

  const found = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const matches = all.filter(e => e.textContent.includes('Tạo mới') && e.children.length <= 2);
    return matches.map(e => ({tag: e.tagName, cls: e.className, text: e.textContent.trim().slice(0,30)}));
  });
  console.log(JSON.stringify(found, null, 2));
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

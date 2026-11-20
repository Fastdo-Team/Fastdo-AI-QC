const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'hrm/timekeeping?tab=2', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2000);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const sidebarDonTu = await page.$('xpath/.//div[contains(@class,"")][normalize-space(text())="Đơn từ"]');
  console.log('sidebarDonTu', !!sidebarDonTu);
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && e.textContent.trim() === 'Đơn từ');
    if (els.length === 0) return 'none';
    els[els.length-1].click();
    return 'clicked last of ' + els.length;
  });
  console.log(clicked);
  await lib.sleep(2000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'khq100_forms2.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

const lib = require('./khq_batch2_lib');

(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'config/timekeeping/rules', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const phepTab = await page.$('xpath/.//a[normalize-space(.)="Phép"]');
  if (phepTab) { await phepTab.click(); await lib.sleep(1500); }

  const result = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && e.textContent.trim() === 'Không giới hạn');
    if (labels.length === 0) return 'no labels found';
    const first = labels[0];
    // find associated radio: could be previous sibling input, or within closest label ancestor
    let radio = first.previousElementSibling;
    if (!radio || radio.type !== 'radio') {
      const labelAncestor = first.closest('label');
      if (labelAncestor) radio = labelAncestor.querySelector('input[type=radio]');
    }
    if (!radio) {
      // search parent container for a radio input
      let p = first.parentElement;
      for (let i = 0; i < 3 && p && !radio; i++) {
        radio = p.querySelector('input[type=radio]');
        p = p.parentElement;
      }
    }
    if (radio) { radio.click(); return 'clicked radio, checked=' + radio.checked; }
    first.click();
    return 'clicked label text fallback';
  });
  console.log('result:', result);
  await lib.sleep(500);
  await page.screenshot({ path: 'khq100_before_save2.png' });

  const updateBtn = await page.$('xpath/.//button[contains(., "Cập nhật")]');
  console.log('update btn found', !!updateBtn);
  if (updateBtn) {
    await updateBtn.click();
    await lib.sleep(2000);
  }
  await page.screenshot({ path: 'khq100_after_save.png' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

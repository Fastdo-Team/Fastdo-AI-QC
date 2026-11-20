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

  // click using real mouse coords on the select box near "Chọn loại đơn từ"
  const box = await page.evaluate(() => {
    let el = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Chọn loại đơn từ');
    if (!el) return null;
    for (let i = 0; i < 4; i++) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return { x: r.x, y: r.y, w: r.width, h: r.height, tag: el.tagName, cls: el.className };
      el = el.parentElement;
      if (!el) break;
    }
    return null;
  });
  console.log('box', box);
  const dbg = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Chọn loại đơn từ');
    if (!el) return 'no el';
    return { tag: el.tagName, visible: el.offsetParent !== null, style: el.getAttribute('style'), parentTag: el.parentElement?.tagName, parentCls: el.parentElement?.className };
  });
  console.log('dbg', dbg);
  if (box) {
    await page.mouse.click(box.x + box.w/2, box.y + box.h/2);
  }
  await lib.sleep(1000);
  await page.screenshot({ path: 'khq100_createform6.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

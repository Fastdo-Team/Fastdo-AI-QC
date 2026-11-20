const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'config/timekeeping/rules', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }

  const handle = await page.evaluateHandle(() => Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Hệ số công'));
  const el = handle.asElement();
  console.log('found Hệ số công label:', !!el);
  if (el) {
    await el.evaluate(e => e.scrollIntoView({block: 'center'}));
    await lib.sleep(300);
  }
  await page.screenshot({ path: 'khq160_before.png' });

  const toggleResult = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Hệ số công');
    if (!label) return 'label not found';
    const container = label.closest('[onclick], div');
    // find ancestor with onclick handler toggling is_active_work_coefficient - identified by icon sibling
    let node = label;
    for (let i=0;i<5;i++) { if (node.querySelector && node.querySelector('.material-icons-outlined')) break; node = node.parentElement; }
    const icon = node ? node.querySelector('.material-icons-outlined') : null;
    if (!icon) return 'icon not found';
    const isOn = icon.textContent.trim() === 'toggle_on';
    if (!isOn) { node.click(); }
    return 'was ' + (isOn ? 'ON' : 'OFF');
  });
  console.log('toggle:', toggleResult);
  await lib.sleep(500);
  await page.screenshot({ path: 'khq160_after_toggle.png' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

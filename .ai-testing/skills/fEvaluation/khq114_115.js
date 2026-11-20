const lib = require('./khq_batch2_lib');

async function toggleFormType(page, label, turnOn) {
  const result = await page.evaluate(({label, turnOn}) => {
    const all = Array.from(document.querySelectorAll('*'));
    const labelEl = all.find(e => e.children.length === 0 && e.textContent.trim().includes(label));
    if (!labelEl) return 'label not found';
    const rowA = labelEl.closest('a');
    if (!rowA) return 'row <a> not found';
    const toggleIcon = rowA.querySelector('.icon.is-clickable');
    if (!toggleIcon) return 'toggle icon not found';
    const isOn = toggleIcon.textContent.trim() === 'toggle_on';
    if ((turnOn && isOn) || (!turnOn && !isOn)) return 'already ' + (isOn ? 'ON' : 'OFF');
    toggleIcon.click();
    return 'toggled';
  }, {label, turnOn});
  return result;
}

async function getDropdownOptions(page) {
  await page.evaluate(() => {
    const as = Array.from(document.querySelectorAll('a.button.is-primary'));
    const a = as.find(e => e.textContent.includes('Tạo mới'));
    if (a) a.click();
  });
  await lib.sleep(1500);
  const opts = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const sel = selects.find(s => Array.from(s.options).some(o => o.textContent.includes('Chọn loại đơn từ')));
    if (!sel) return null;
    return Array.from(sel.options).map(o => o.textContent.trim());
  });
  // close the panel
  const closeBtn = await page.$('xpath/.//*[self::a or self::span][normalize-space(.)="Đóng"]');
  if (closeBtn) { await closeBtn.click(); await lib.sleep(500); }
  return opts;
}

(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);

  // Step 1: go to rules > Don tu, turn OFF "Nghi khong luong"
  await page.goto(lib.TARGET_URL + 'config/timekeeping/rules', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  let denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const donTuTab = await page.$('xpath/.//a[normalize-space(.)="Đơn từ"]');
  if (donTuTab) { await donTuTab.click(); await lib.sleep(1500); }

  console.log('toggle off Nghỉ không lương:', await toggleFormType(page, 'Nghỉ không lương', false));
  await lib.sleep(500);
  let updateBtn = await page.$('xpath/.//button[contains(., "Cập nhật")]');
  if (updateBtn) { await updateBtn.click(); await lib.sleep(2000); }

  // Step 2: check dropdown no longer shows it (KHQ_IV_114)
  await page.goto(lib.TARGET_URL + 'hrm/timekeeping?tab=3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const optsAfterOff = await getDropdownOptions(page);
  console.log('114 - options after turning OFF:', JSON.stringify(optsAfterOff));

  // Step 3: go back to rules, turn ON again (KHQ_IV_115)
  await page.goto(lib.TARGET_URL + 'config/timekeeping/rules', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const donTuTab2 = await page.$('xpath/.//a[normalize-space(.)="Đơn từ"]');
  if (donTuTab2) { await donTuTab2.click(); await lib.sleep(1500); }
  console.log('toggle on Nghỉ không lương:', await toggleFormType(page, 'Nghỉ không lương', true));
  await lib.sleep(500);
  updateBtn = await page.$('xpath/.//button[contains(., "Cập nhật")]');
  if (updateBtn) { await updateBtn.click(); await lib.sleep(2000); }

  await page.goto(lib.TARGET_URL + 'hrm/timekeeping?tab=3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }
  const optsAfterOn = await getDropdownOptions(page);
  console.log('115 - options after turning ON again:', JSON.stringify(optsAfterOn));

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

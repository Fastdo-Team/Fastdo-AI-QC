const lib = require('./khq_batch2_lib');

async function clickToggleByLabel(page, labelText) {
  const result = await page.evaluate((label) => {
    const all = Array.from(document.querySelectorAll('*'));
    const candidates = all.filter(e => {
      const t = e.textContent.trim();
      return t.includes(label) && (t.startsWith('toggle_off') || t.startsWith('toggle_on')) && t.length < label.length + 20;
    });
    candidates.sort((a,b) => a.textContent.length - b.textContent.length);
    const el = candidates[0];
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'clicked';
  }, labelText);
  return result;
}

async function getToggleState(page, labelText) {
  return page.evaluate((label) => {
    const all = Array.from(document.querySelectorAll('*'));
    const candidates = all.filter(e => {
      const t = e.textContent.trim();
      return t.includes(label) && (t.startsWith('toggle_off') || t.startsWith('toggle_on')) && t.length < label.length + 20;
    });
    candidates.sort((a,b) => a.textContent.length - b.textContent.length);
    const el = candidates[0];
    if (!el) return 'NOT_FOUND';
    return el.textContent.trim().startsWith('toggle_on') ? 'ON' : 'OFF';
  }, labelText);
}

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

  let state = await getToggleState(page, 'Cho ứng phép');
  console.log('before:', state);
  if (state === 'OFF') {
    await clickToggleByLabel(page, 'Cho ứng phép');
    await lib.sleep(1000);
  }
  state = await getToggleState(page, 'Cho ứng phép');
  console.log('after toggle:', state);

  const radioResult = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && e.textContent.trim() === 'Không giới hạn');
    if (labels.length === 0) return 'no labels';
    const first = labels[0];
    let radio = first.previousElementSibling;
    if (!radio || radio.type !== 'radio') {
      const labelAncestor = first.closest('label');
      if (labelAncestor) radio = labelAncestor.querySelector('input[type=radio]');
    }
    if (!radio) {
      let p = first.parentElement;
      for (let i = 0; i < 3 && p && !radio; i++) { radio = p.querySelector('input[type=radio]'); p = p.parentElement; }
    }
    if (!radio) return 'radio not found';
    radio.click();
    return 'clicked, disabled=' + radio.disabled + ' checked=' + radio.checked;
  });
  console.log('radio:', radioResult);
  await lib.sleep(500);
  await page.screenshot({ path: 'khq100_setup_before_save.png' });

  const updateBtn = await page.$('xpath/.//button[contains(., "Cập nhật")]');
  if (updateBtn) { await updateBtn.click(); await lib.sleep(2500); }
  await page.screenshot({ path: 'khq100_setup_after_save.png' });

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

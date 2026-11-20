const lib = require('./khq_batch2_lib');

async function clickToggleByLabel(page, labelText) {
  const handle = await page.evaluateHandle((label) => {
    const all = Array.from(document.querySelectorAll('*'));
    // find smallest element whose direct text (not descendants) includes the label and an icon ligature
    const candidates = all.filter(e => {
      const t = e.textContent.trim();
      return t.includes(label) && (t.startsWith('toggle_off') || t.startsWith('toggle_on'));
    });
    // pick the most specific (smallest text length)
    candidates.sort((a,b) => a.textContent.length - b.textContent.length);
    return candidates[0] || null;
  }, labelText);
  const el = handle.asElement();
  if (!el) throw new Error('toggle not found for ' + labelText);
  await el.click();
  return el;
}

async function getToggleState(page, labelText) {
  return page.evaluate((label) => {
    const all = Array.from(document.querySelectorAll('*'));
    const candidates = all.filter(e => {
      const t = e.textContent.trim();
      return t.includes(label) && (t.startsWith('toggle_off') || t.startsWith('toggle_on'));
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
  console.log('Cho ứng phép state before:', state);
  if (state === 'OFF') {
    await clickToggleByLabel(page, 'Cho ứng phép');
    await lib.sleep(800);
  }
  state = await getToggleState(page, 'Cho ứng phép');
  console.log('Cho ứng phép state after toggle:', state);

  // Click "Không giới hạn" radio right after "Cho ứng phép" section
  const radioClicked = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const toggleEl = all.find(e => e.textContent.trim().startsWith('toggle_on') && e.textContent.includes('Cho ứng phép') && e.textContent.trim().length < 40);
    if (!toggleEl) return 'toggle not found';
    // the radio group is likely the next sibling container
    let container = toggleEl.parentElement;
    for (let i = 0; i < 3 && container; i++) {
      const label = Array.from(container.querySelectorAll('label, span')).find(e => e.textContent.trim() === 'Không giới hạn');
      if (label) {
        const radio = label.closest('label')?.querySelector('input[type=radio]') || label.previousElementSibling;
        if (radio) { radio.click(); return 'clicked via ' + container.tagName; }
        label.click();
        return 'clicked label text';
      }
      container = container.nextElementSibling || container.parentElement;
    }
    return 'not found';
  });
  console.log('radio click result:', radioClicked);
  await lib.sleep(500);
  await page.screenshot({ path: 'khq100_before_save.png' });

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

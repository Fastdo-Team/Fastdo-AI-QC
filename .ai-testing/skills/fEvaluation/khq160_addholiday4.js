const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  await lib.login(page, lib.EMAIL1, lib.PASS1, lib.ORG_NAME);
  await page.goto(lib.TARGET_URL + 'config/timekeeping/dayoff', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await lib.waitAppReady(page);
  await lib.sleep(2500);
  const denyBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Từ chối")]');
  if (denyBtn) { await denyBtn.click(); await lib.sleep(500); }

  let modalOpen = false;
  for (let i = 0; i < 5 && !modalOpen; i++) {
    const addBtn = await page.$('xpath/.//*[self::a or self::button][contains(., "Thêm mới")]');
    if (addBtn) { await addBtn.click(); }
    await lib.sleep(1200);
    modalOpen = await page.evaluate(() => document.body.innerText.includes('Tạo ngày nghỉ mới'));
  }
  console.log('modalOpen:', modalOpen);

  const nameInput = await page.$('input[placeholder*="Nhập tên ngày nghỉ"]');
  if (nameInput) { await nameInput.click({clickCount:3}); await nameInput.type('QC160 He so cong ngay le 1.5', {delay:10}); }

  async function pickDay21ByLabel(labelText) {
    const clicked = await page.evaluate((label) => {
      const labelEl = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === label);
      if (!labelEl) return 'label not found';
      let container = labelEl.parentElement; let inp = null;
      for (let i = 0; i < 3 && !inp; i++) { inp = container.querySelector('input'); if (!inp) container = container.parentElement; }
      if (!inp) return 'input not found';
      inp.click();
      return 'clicked';
    }, labelText);
    if (clicked !== 'clicked') return clicked;
    await lib.sleep(500);
    const days = await page.$$('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)');
    for (const d of days) {
      const txt = await page.evaluate(el => el.textContent.trim(), d);
      if (txt === '21') { await d.click(); await lib.sleep(300); return 'picked 21'; }
    }
    return 'day 21 not found';
  }
  await pickDay21ByLabel('Bắt đầu nghỉ');
  await pickDay21ByLabel('Kết thúc nghỉ');

  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter(e => e.textContent.trim() === 'Ngày nghỉ tính lương');
    candidates.sort((a,b) => a.innerHTML.length - b.innerHTML.length);
    const labelEl = candidates[0];
    let container = labelEl; let cb = null;
    for (let i=0;i<4 && !cb;i++){ cb = container.querySelector('input[type=checkbox]'); if(!cb) container = container.parentElement; }
    if (cb) cb.click();
  });
  await lib.sleep(700);

  // find the + button via its bounding box near "Nhân viên áp dụng:" label
  const plusBox = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter(e => e.textContent.trim() === 'Nhân viên áp dụng:');
    candidates.sort((a,b) => a.innerHTML.length - b.innerHTML.length);
    const label = candidates[0];
    if (!label) return null;
    // the + button should be the next sibling element after the label in its row
    const row = label.parentElement;
    const btn = row.querySelector('button, a, [role=button]');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, html: btn.outerHTML.slice(0,150) };
  });
  console.log('plusBox:', JSON.stringify(plusBox));
  if (plusBox) {
    await page.mouse.click(plusBox.x, plusBox.y);
    await lib.sleep(1000);
  }
  await page.screenshot({ path: 'khq160_employeepicker2.png', fullPage: true });

  await page.close();
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

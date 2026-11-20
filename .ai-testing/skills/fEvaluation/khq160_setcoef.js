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

  const handle = await page.evaluateHandle(() => Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === 'Ngày lễ' && e.closest('div')?.previousElementSibling === null));
  // Fallback: locate via label text "Ngày lễ" near "Ngày thường"/"Ngày nghỉ" header row, then its sibling input below.
  const result = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && ['Ngày thường','Ngày nghỉ','Ngày lễ'].includes(e.textContent.trim()));
    const holidayHeader = headers.find(e => e.textContent.trim() === 'Ngày lễ');
    if (!holidayHeader) return 'holiday header not found, headers=' + headers.map(h=>h.textContent.trim()).join(',');
    // The input is likely a sibling in the parent column structure - find nearest input in the same column index
    const col = holidayHeader.closest('div');
    let input = col ? col.parentElement.querySelector('input') : null;
    if (!input && col) {
      // try next sibling of col
      input = col.nextElementSibling ? col.nextElementSibling.querySelector('input') : null;
    }
    return { found: !!input, colHTML: col ? col.outerHTML.slice(0,300) : null, parentHTML: col?.parentElement?.outerHTML?.slice(0,800) };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

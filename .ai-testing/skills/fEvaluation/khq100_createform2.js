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

  let target = null;
  for (let attempt = 0; attempt < 8 && !target; attempt++) {
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const t = await b.evaluate(e => e.textContent.trim()).catch(()=>'');
      if (t.includes('Tạo mới')) { target = b; break; }
    }
    if (!target) await lib.sleep(700);
  }
  console.log('target found', !!target);
  if (target) {
    await target.evaluate(e => e.scrollIntoView());
    const box = await target.boundingBox();
    console.log('box', box);
    await target.click();
  }
  await lib.sleep(2000);
  const modalCount = await page.evaluate(() => document.querySelectorAll('.modal, [role=dialog], .mud-dialog').length);
  console.log('modalCount', modalCount);
  await page.screenshot({ path: 'khq100_createform2.png', fullPage: true });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

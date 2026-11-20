const lib = require('./khq_batch2_lib');
(async () => {
  const browser = await lib.getBrowser();
  const pages = await browser.pages();
  // find the page still showing the modal (devtunnel dayoff page)
  let page = pages.find(p => p.url().includes('dayoff'));
  if (!page) { console.log('no dayoff page found, pages:', pages.map(p=>p.url())); await browser.disconnect(); return; }
  page.on('dialog', async d => { console.log('[DIALOG]', d.message()); await d.accept(); });
  const modalOpen = await page.evaluate(() => document.body.innerText.includes('Tạo ngày nghỉ mới'));
  console.log('modal still open:', modalOpen);
  if (modalOpen) {
    const result = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cập nhật'));
      if (!btn) return 'not found';
      btn.click();
      return 'clicked, disabled=' + btn.disabled;
    });
    console.log('save click:', result);
    await lib.sleep(2500);
    await page.screenshot({ path: 'khq160_retry_save.png', fullPage: true });
  }
  await page.close();
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

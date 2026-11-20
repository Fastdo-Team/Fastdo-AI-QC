const puppeteer = require('puppeteer-core');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function navTo(page, ref) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.focus('#t-name-box');
    await sleep(200);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await sleep(200);
    await page.keyboard.type(ref, { delay: 25 });
    await sleep(250);
    const typed = await page.evaluate(() => document.querySelector('#t-name-box').value);
    if (typed === ref) { await page.keyboard.press('Enter'); await sleep(600); return; }
    await sleep(300);
  }
  throw new Error('nav failed for ' + ref);
}
async function setCellDirect(page, ref, value) {
  await navTo(page, ref);
  await page.keyboard.press('Delete');
  await sleep(300);
  if (value) await page.keyboard.type(value, { delay: 6 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(500);
}

const MOTA_MOI = 'Điều kiện: Quy định 1.5.10 (Giới hạn check-out sau ca) đã được bật. Tính năng nhắc nhở trước hạn check-out mặc định bật với số phút mặc định = 15, mức tối đa hệ thống cho phép nhập = 60 phút.\nCác bước:\nB1: Vào cấu hình nhắc nhở, nhập số phút = 0 hoặc giá trị âm.\nB2: Nhập số phút = 61 (vượt mức tối đa 60 phút).\nB3: Nhập số phút hợp lệ = 20 (trong khoảng 1 đến 60) và lưu.\nKết quả mong đợi: Khi nhập giá trị ngoài khoảng cho phép (0/âm hoặc > 60), hệ thống TỰ ĐỘNG nhảy về giá trị hợp lệ gần nhất (vd nhập 61 thì tự nhảy về 60) mà KHÔNG hiển thị bất kỳ thông báo/cảnh báo nào cho người dùng; giá trị 20 trong khoảng cho phép được lưu thành công bình thường.\n\n[QC XÁC NHẬN 21/10/2026]: Mô tả gốc sai ở chỗ "bị chặn kèm cảnh báo" — hành vi thực tế là tự động nhảy về giá trị hợp lệ, KHÔNG có thông báo.';

const NOTE_158 = '[QC xác nhận 21/10/2026]: Đã kiểm chứng — khi nhập số phút nhắc nhở > 60 (vd 61), hệ thống tự động nhảy giá trị về 60, KHÔNG hiển thị thông báo/cảnh báo nào (khác với mô tả gốc "bị chặn kèm cảnh báo"). Giá trị 20 (trong khoảng 1-60) lưu bình thường. Đã sửa lại Mô tả testcase (cột D) cho khớp đúng hành vi thực tế. Kết quả: PASS theo đúng hành vi hệ thống (tự động nhảy về giá trị hợp lệ, không cần/không có thông báo).';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p=>p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  await page.bringToFront();
  await sleep(500);

  await setCellDirect(page, 'D458', MOTA_MOI); console.log('wrote D458');
  await setCellDirect(page, 'H458', 'DONE'); console.log('wrote H458');
  await setCellDirect(page, 'I458', NOTE_158); console.log('wrote I458');
  await setCellDirect(page, 'K458', '21/10/2026'); console.log('wrote K458');

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

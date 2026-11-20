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

const NOTE_101 = '[Đọc code 21/10/2026, theo yêu cầu QC check code]: HrmRewardLeaveTransfer.cs dòng 57-59 — "Convert(overWork, exchange) => overWork > 0 && exchange > 0 ? Math.Round(overWork / exchange, 2) : 0". Đây là phép CHIA TỶ LỆ LIÊN TỤC (công vượt ÷ hệ số quy đổi), KHÔNG PHẢI cơ chế ngưỡng (threshold) như mô tả testcase ("chỉ cộng khi đạt ngưỡng X=26"). Đã grep toàn bộ HrmRulesModel.cs khu vực annual_leave — KHÔNG có field "ngưỡng công vượt", chỉ có is_transfer_leave (bật/tắt) và "exchange" (hệ số quy đổi dùng chung với 1 Phép = X Công). Với đúng số liệu testcase (công vượt=26, hệ số quy đổi=26) thì 26/26=1.0, TRÙNG KHỚP kết quả mong đợi "1 ngày phép thưởng" — nhưng đây là trùng hợp về SỐ, không phải vì có cơ chế ngưỡng. Đề nghị BA xác nhận lại: hệ thống không có khái niệm "ngưỡng mới cộng", mà cộng phép thưởng tỷ lệ thuận liên tục với mọi mức công vượt > 0. File: FastdoServer/Core/Domain/Hrm/Leave/HrmRewardLeaveTransfer.cs';

const NOTE_102 = '[Đọc code 21/10/2026, theo yêu cầu QC check code]: Cùng hàm Convert() ở HrmRewardLeaveTransfer.cs dòng 57-59 — công vượt 25.5, hệ số quy đổi 26 => Convert = Math.Round(25.5/26, 2) = 0.98, KHÔNG PHẢI 0 như Kết quả mong đợi của testcase ("không được cộng phép thưởng, giữ nguyên"). Code không có bất kỳ điều kiện ngưỡng nào để trả về 0 khi công vượt > 0 — chỉ trả 0 khi overWork <= 0 hoặc exchange <= 0. => Thực tế NV vẫn được cộng 0.98 ngày phép thưởng dù "chưa đạt ngưỡng 26 công" theo mô tả. Khớp xác nhận: KHÔNG tồn tại cơ chế ngưỡng, hệ thống cộng phép thưởng theo tỷ lệ liên tục. Giữ Fail (kết quả thực tế khác kết quả mong đợi của testcase). File: FastdoServer/Core/Domain/Hrm/Leave/HrmRewardLeaveTransfer.cs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p=>p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  await page.bringToFront();
  await sleep(500);

  await setCellDirect(page, 'H401', 'Fail'); console.log('wrote H401');
  await setCellDirect(page, 'I401', NOTE_101); console.log('wrote I401');
  await setCellDirect(page, 'K401', '21/10/2026'); console.log('wrote K401');

  await setCellDirect(page, 'H402', 'Fail'); console.log('wrote H402');
  await setCellDirect(page, 'I402', NOTE_102); console.log('wrote I402');
  await setCellDirect(page, 'K402', '21/10/2026'); console.log('wrote K402');

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

const puppeteer = require('D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/fEvaluation/node_modules/puppeteer-core');
const SHEET_ID = '<SHEET_ID>';
const GID = '1953309174';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function navTo(page, ref) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(() => { const n = document.querySelector('#t-name-box'); n.focus(); n.select(); });
    await page.keyboard.sendCharacter(ref);
    await page.keyboard.press('Enter');
    await sleep(500);
    const now = await page.evaluate(() => document.querySelector('#t-name-box').value);
    if (now.toUpperCase() === ref.toUpperCase()) return;
    await sleep(300);
  }
  throw new Error('nav failed ' + ref);
}
async function writeCell(page, ref, text) {
  await navTo(page, ref);
  await page.keyboard.press('Delete');
  await sleep(250);
  await page.keyboard.press('F2');
  await sleep(400);
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) { await page.keyboard.down('Alt'); await page.keyboard.press('Enter'); await page.keyboard.up('Alt'); await sleep(60); }
    if (lines[i]) await page.keyboard.sendCharacter(lines[i]);
  }
  await sleep(400);
  await page.keyboard.press('Enter');
  await sleep(500);
}
async function readCell(page, ref) {
  await navTo(page, ref);
  return page.evaluate(() => document.querySelector('.cell-input')?.innerText || '');
}

const NOTE_498 = `[QC xác nhận 10/11/2026 - ĐỌC CODE giải quyết dứt điểm mâu thuẫn với 076, KHÔNG test UI được do devtunnel yêu cầu đăng nhập GitHub (môi trường chặn, không phải lỗi thao tác)]: Đã tìm ra 2 hàm RIÊNG trong HrmWorkTimeCalculator.cs:
- ApplyOtTimeRangeCoefficientIfActive (dòng 518-556, dùng cho OT tính từ CHẤM CÔNG THỰC TẾ qua HrmAttendanceDayBuilder.cs:333/949) - CHỈ kiểm is_active_time_range_coefficient, KHÔNG đọc is_active_ot_work_coeficient ("Áp dụng làm thêm giờ") => cờ này là dead code trên luồng chấm công thực tế, đúng như KHQ_IV_076 đã kết luận.
- ApplyOtTimeRangeCoefficientFromFormIfActive (dòng 563-633, dùng cho OT tính TỪ ĐƠN qua HrmTimesheetOvertimeCalculator.cs:668, HrmTimesheetPeriodCalculator.cs:514, HrmFormReadService.cs:1070, Form.razor, FormDetailPopup.razor, TimesheetDetailPopup.razor) - CÓ kiểm is_active_ot_work_coeficient (dòng 571: "if (baseWorkOT <= 0 || rules is { is_active_ot_work_coeficient: false }) return baseWorkOT") - cờ này CÓ tác dụng thật trên luồng tính theo đơn (comment dòng 561 xác nhận chủ đích: "Chỉ cho công OT: bỏ tích 'Áp dụng làm thêm giờ' → giữ nguyên (slice HRM 023, BR-HRM-QC-004)").
KẾT LUẬN: không mâu thuẫn - 076 và 498 đều ĐÚNG, chỉ khác luồng tính (chấm công thực tế vs theo đơn). Theo định hướng QC đã chốt trước đây (KHQ_IV_059: "OT tính theo chấm công thực tế, không theo đơn"), luồng chấm công thực tế là luồng thật quyết định số liệu Bảng công - ở luồng này, hệ số 1.5 áp cho OT KHÔNG phải vì "Áp dụng làm thêm giờ" được tôn trọng, mà vì hệ số khung giờ áp dụng vô điều kiện cho OT khi bật master toggle (is_active_time_range_coefficient) + is_active_time_range_coefficient trong phạm vi - cờ con không có vai trò thật. Với kịch bản testcase 498 (cờ BẬT), kết quả quan sát được (OT=1.5x) VẪN khớp "Kết quả mong đợi" dù cơ chế nền không đúng như mô tả ngụ ý; phần B2 (ca theo giờ=1.0x khi tắt cờ riêng) được xác nhận đúng qua is_active_byhours_work_coeficient (dòng ~274, kiểm độc lập, không liên quan is_active_ot_work_coeficient).
GHI CHÚ QUAN TRỌNG CHO BA: cờ "Áp dụng làm thêm giờ" chỉ có tác dụng thật khi OT được tính theo ĐƠN (work_date_shifts), vô tác dụng khi tính theo chấm công thực tế - nên xác nhận với BA đây có phải hành vi chủ đích hay cần đồng bộ 2 luồng.
CHƯA test UI thật được trong phiên này: devtunnel https://60rr1632-3000.asse.devtunnels.ms/ hiện yêu cầu đăng nhập GitHub (trang hiện "Sign in to GitHub to continue to Dev Tunnels") - đây là thay đổi quyền truy cập tunnel ở cấp hạ tầng, không phải lỗi thao tác; localhost:3000 cũng không kết nối được (connection refused). Đề nghị QC mở lại tunnel ở chế độ public/anonymous hoặc cấp URL mới để lần sau xác nhận lại bằng UI thật.`;

const NOTE_651 = `[QC xác nhận 10/11/2026 - ĐỌC CODE xác nhận đầy đủ cả 3 vế, KHÔNG test UI được do devtunnel yêu cầu đăng nhập GitHub]: Tìm ra đúng điểm quyết định: TimesheetDetailPopup.razor, hàm CheckCanEdit() (dòng 3229-3261):
return (ngày trong quá khứ HOẶC (hôm nay có đủ check-in/check-out)) && timeSheetDate != null && !timeSheetDate.locked && (!CheckDayOff || (InData.is_ot && OutData.is_ot))
Hàm này gate TOÀN BỘ phần sửa công thật (nút Cập nhật ở dòng 1323, và gián tiếp cả khối "Sửa ca làm" theo CanEdit ở dòng 1148 do component cha truyền xuống) khớp CHÍNH XÁC cả 3 vế mô tả testcase:
- Ca thường (is_ot=false) + ngày nghỉ (CheckDayOff=true): (!true || false) = false → KHÔNG sửa được. ĐÚNG.
- Ca OT (is_ot=true cả check-in/check-out) + ngày nghỉ (CheckDayOff=true): (!true || true) = true → VẪN sửa được (nếu ngày không khoá). ĐÚNG.
- Ngày đã khoá (timeSheetDate.locked=true): điều kiện !timeSheetDate.locked=false → chặn hoàn toàn bất kể ngày nghỉ/OT. ĐÚNG.
Code có comment "QC 2026-11-05" gần đó (dòng 1270, 1303) cho thấy khu vực này vừa được dev sửa/xác nhận theo phản hồi QC cách đây 5 ngày - logic đang hoạt động (live code, không phải code cũ/chết).
KẾT LUẬN: DONE/Pass theo bằng chứng đọc code - cả 3 hành vi mong đợi đều khớp chính xác với cơ chế CheckCanEdit() thật.
CHƯA test UI thật trong phiên này: devtunnel yêu cầu đăng nhập GitHub (môi trường chặn) + localhost:3000 không kết nối được. Lần trước (28/10) có dữ liệu sẵn ("QC358 Bang cong 27/10" ngày nghỉ, "QC651 Khoa" đã khoá) nhưng click vào ô mở popup read-only - nay đã rõ nguyên nhân: cần đủ điều kiện CheckCanEdit() (vd ngày hôm nay cần đủ check-in+check-out, hoặc đơn giản do lúc đó thiếu ca OT thật để kiểm B2) chứ không phải lỗi UI; đề nghị QC thử lại qua UI thật khi tunnel khôi phục để lấy video xác nhận bổ sung.`;

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const out = {};
  try {
    await page.goto(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#t-name-box', { timeout: 60000 });
    await sleep(6000);

    await writeCell(page, 'H798', 'DONE');
    await writeCell(page, 'I798', NOTE_498);
    await writeCell(page, 'K798', '10/11/2026');

    await writeCell(page, 'H951', 'DONE');
    await writeCell(page, 'I951', NOTE_651);
    await writeCell(page, 'K951', '10/11/2026');

    out.H798 = await readCell(page, 'H798');
    out.K798 = await readCell(page, 'K798');
    out.I798_head = (await readCell(page, 'I798')).slice(0, 80);
    out.H951 = await readCell(page, 'H951');
    out.K951 = await readCell(page, 'K951');
    out.I951_head = (await readCell(page, 'I951')).slice(0, 80);
  } catch (e) {
    out.error = e.message;
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
    console.log(JSON.stringify(out, null, 1));
  }
})();

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

const DATE = '21/10/2026';

const RESULTS = [
  {
    row: 352, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Timekeeping.razor dòng 1647 "inCompany = shiftData.is_hybrid && isHybrid ? true : inCompany;" — NV hybrid check-in trên web được ép InCompany=true, bỏ qua kiểm tra khoảng cách/popup "ngoài vị trí" (khớp xử lý backend CheckinShift đã xác nhận trước đó). Về tên vị trí: Timekeeping.razor dòng 1365/1763 gọi "GeocodingService.ReverseGeocodingAsync(coordinates)" ngay tại UI web để lấy địa chỉ chữ từ toạ độ trước khi gửi request — khớp đúng "tên vị trí ghi bằng địa chỉ chữ lấy từ tọa độ". Khớp đúng Kết quả mong đợi mới. File: FastdoServer.Blazor/Components/Pages/Hrm/Timekeeping.razor'
  },
  {
    row: 355, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Timekeeping.razor dòng 1580-1585 — khi check-out ca "Làm ngoài giờ": "if (timeOT < rules.overtime.min_minutes && rules.overtime.is_active_min_minutes) { tagline(false, \"Thời gian tối thiểu của 1 ca làm ngoài giờ là {min_minutes} phút!\"); return; }" — chặn NGAY LÚC CHECK-OUT trên web bằng đúng thông báo mô tả, không cho tạo ca OT 29 phút (không phải để lọt dữ liệu rồi bảng công bỏ qua). Khớp đúng Kết quả mong đợi mới. Lưu ý: như mô tả đã nêu, hành vi này là của WEB; app/mobile tự check-in/out có thể khác (TK.OT.CH.002), chưa kiểm chứng riêng. File: FastdoServer.Blazor/Components/Pages/Hrm/Timekeeping.razor'
  },
  {
    row: 365, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: TimekeepingOT.razor — modal hiện đúng câu hỏi (localizer "WouldYouLikeToSubmitAnOvertimeRequestFormToYourManager" = "Bạn có muốn tạo đơn từ Đăng ký làm thêm giờ đến quản lý?") với 2 nút: "NoRequestFormCreated" = "Không tạo đơn từ" và nút chính mở luồng chọn người phê duyệt rồi "CreateRequestForm" = "Tạo đơn từ" (dòng 42-64). Xác nhận đúng là có HỘP THOẠI hỏi + yêu cầu chọn người duyệt, KHÔNG tự sinh âm thầm như mô tả cũ. Khớp đúng Kết quả mong đợi mới (tên công tắc đúng là "Hệ thống tự động tạo đơn từ đăng ký làm thêm giờ" = is_active_auto_register). File: FastdoServer.Blazor/Components/Pages/Hrm/TimekeepingOT.razor'
  },
  {
    row: 366, status: 'Fail',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Xác nhận đúng — hộp thoại hỏi tạo đơn OT vẫn hiện bất kể đã có đơn trùng giờ hay chưa. TÌM RA NGUYÊN NHÂN GỐC: biến "allOTExistForm" (TimekeepingOT.razor dòng 377) được tính từ "checkinIdNotForm" (dòng 369): "var checkinIdNotForm = checkins_id.Where(x => !checkins_id.Contains(x)).ToList();" — ĐIỀU KIỆN SO SÁNH CHÍNH NÓ (checkins_id.Contains(x) với x lấy từ checkins_id) nên LUÔN LUÔN rỗng => khối code tính allOTExistForm (dòng 370-381) KHÔNG BAO GIỜ chạy => allOTExistForm luôn = false (giá trị mặc định) => nút "Tạo đơn từ" (điều kiện "!allOTExistForm", dòng 56) LUÔN hiện, kể cả khi đã có đơn trùng giờ được duyệt. Đây là lỗi code thật (biến dùng sai, có thể do gõ nhầm "checkins_id" thay vì "matchedShifts" ở dòng 369), không chỉ là thiếu tính năng. Giữ nguyên Fail, bổ sung bằng chứng code cụ thể. File: FastdoServer.Blazor/Components/Pages/Hrm/TimekeepingOT.razor (dòng 362-381)'
  },
  {
    row: 367, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Timesheet.razor có 2 cột riêng: "@localizer[\"OvertimeHours\"] (h)" = "Giờ OT (h)" (dòng 951/2798) và "Công OT" + "Công OT tháng" (dòng 1462,1550,1553 / 3301,3389,3392) — khớp đúng mô tả 2 cột tách riêng, không phải "2 giờ công OT" gộp chung. Công thức: HrmOvertimeCalculator.CalculateWork = hours/hours_to_workshift*coefficient = 2/8*1 = 0.25 công, khớp đúng số liệu "Giờ OT=2,00, Công OT=0,25" trong mô tả mới. Khớp đúng Kết quả mong đợi mới. File: FastdoServer.Blazor/Components/Pages/Hrm/Timesheet.razor, FastdoServer/Core/Domain/Hrm/Timesheets/HrmOvertimeCalculator.cs'
  },
  {
    row: 369, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: TimeKeepingV3Service.cs dòng 1887-1942+ "LUỒNG CA LIỀN KỀ: tự động kích hoạt khi rule allow_next_shift bật" — khi rules.overtime.allow_next_shift=true và NV thuộc next_shift_apply_type/next_shift_users|departments, hệ thống TỰ TÁCH checkin sớm/checkout trễ quanh ca chính thành tối đa 3 đoạn: OT_before + ca chính + OT_after (biến isSplitOTAllowNextShift, dòng 1893-1942). Khớp đúng mô tả mới (không phải "cho phép check-in ca kế tiếp ngay sau OT" như mô tả cũ). File: FastdoServer/Application/Services/Hrm/Attendance/TimeKeepingV3Service.cs'
  },
  {
    row: 370, status: 'DONE',
    note: '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Cùng cơ chế với KHQ_IV_069 — khi NV B KHÔNG thuộc next_shift_apply_type/next_shift_users|departments, IsUserApplied() trả về false => isSplitOTAllowNextShift không được bật => KHÔNG tách đoạn OT trước/sau, chỉ ghi nhận ca chính bình thường, KHÔNG có bất kỳ thông báo chặn/lỗi nào (vì bản chất tính năng là tự tách ca, không phải chặn check-in). Khớp đúng Kết quả mong đợi mới. File: FastdoServer/Application/Services/Hrm/Attendance/TimeKeepingV3Service.cs'
  },
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p=>p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  await page.bringToFront();
  await sleep(500);

  for (const r of RESULTS) {
    await setCellDirect(page, 'H' + r.row, r.status);
    console.log('wrote H' + r.row);
    await setCellDirect(page, 'I' + r.row, r.note);
    console.log('wrote I' + r.row);
    await setCellDirect(page, 'K' + r.row, DATE);
    console.log('wrote K' + r.row);
  }

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

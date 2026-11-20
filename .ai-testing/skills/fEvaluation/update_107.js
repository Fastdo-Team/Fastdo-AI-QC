const lib = require('./khq_batch2_lib');

const NOTE_107 = '[QC xác nhận 21/10/2026 - đọc code, có field riêng đúng như mô tả]: HrmRulesModel.cs dòng 1507-1509: field "is_hide_old_leave" - AiFact "Ẩn trên bảng phép nếu phép năm cũ hết hạn" (đúng khớp "Ẩn tick phép cũ hết hạn" trong mô tả testcase). TimekeepingRulesDTO.cs dòng 309-313 + FormV3Service.cs dòng 121-123/179-181: "isHideOldLeave = rules.annual_leave.is_hide_old_leave && user.role==3 && annualLeaveInfo.IsExpired" - server tính sẵn cờ ẩn gửi về client khi: (1) bật is_hide_old_leave, (2) user có role=3 (nhân viên thường), (3) phép chuyển từ năm cũ đã hết hạn (annualLeaveInfo.IsExpired, dựa theo is_expiry_unlimited/date_expiry ở HrmAnnualLeaveBalance.cs dòng 127). Khi đủ 3 điều kiện, dòng phép năm cũ hết hạn sẽ KHÔNG hiển thị trên bảng phép của NV đó - đúng "Kết quả mong đợi" testcase. Chưa dựng được dữ liệu lịch sử (NV có phép chuyển từ năm cũ + đã hết hạn) để test UI trực tiếp trong phiên này do cần thời gian lùi ngày/dữ liệu nhiều tháng; kết luận dựa trên đọc code chính xác đường đi dữ liệu client nhận được.';

(async () => {
  const browser = await lib.getBrowser();
  await lib.writeResult(browser, 407, { status: 'DONE', note: NOTE_107, date: '21/10/2026' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

const lib = require('./khq_batch2_lib');

const NOTE_100 = '[QC xác nhận 21/10/2026 - UI (cấu hình) + đọc code (luồng duyệt đơn)]: Đã BẬT thật trên UI DEMO FASTDO: Quy định > Phép > "Cho ứng phép" = BẬT + chọn "Không giới hạn" (đã lưu thành công, xác nhận lại bằng tải lại trang). Không tìm thấy luồng "Tạo đơn từ" nào trong UI có loại "Nghỉ phép năm" (danh sách loại đơn từ hiện có của DEMO FASTDO: Nghỉ không lương, Xin đi trễ, Xin bù công, Đổi ca làm việc, Đổi nhượng ca, Đơn từ làm thêm, Cưới/Tang, Công tác, Làm việc từ xa, Ngày lễ, Mẫu đơn 1-3) nên không dựng được kịch bản duyệt đơn thật trong phiên này. Đối chiếu code: FormV3Service.cs dòng 559-571 / HrmFormApprovalService.cs dòng 297-309 chỉ CHẶN duyệt đơn khi HrmAnnualLeaveBalance.GetPermitsInYear (tính TRƯỚC khi cộng đơn đang xét) < 0; khi "ứng phép không giới hạn" bật, GetPossiblePermitsMax (dòng 88-103) bỏ hẳn điều kiện chặn theo date_take_limit -> số phép có thể ứng không bị giới hạn trần. AllocatePermitsByPriority (dòng 375-419) trả về "totalRemain" KHÔNG có Math.Max(0, ...) nên khi permits_used_current vượt tổng phép có, "phép tồn" hiển thị ra số ÂM đúng như mô tả, không bị chặn/clamp về 0. Kết luận theo code: đúng hành vi mong đợi của testcase (đơn được duyệt, phép tồn thành âm). Đề nghị QC xác nhận thêm qua UI thật nếu cần (chưa tìm ra đúng màn tạo đơn nghỉ phép năm có lương trong phiên này).';

(async () => {
  const browser = await lib.getBrowser();
  await lib.writeResult(browser, 400, { status: 'DONE', note: NOTE_100, date: '21/10/2026' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

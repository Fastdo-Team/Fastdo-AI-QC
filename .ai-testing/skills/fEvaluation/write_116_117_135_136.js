const lib = require('./khq_batch2_lib');

const COMMON_PREFIX = '[QC xác nhận 21/10/2026 - đọc code (chưa dựng được tài khoản Trưởng/Phó phòng ban qua UI trong phiên này - trang Phòng ban bị lỗi không chuyển nội dung khi bấm chọn phòng ban con, đã thử nhiều cách, không kịp khắc phục)]: ';

const NOTE_116 = COMMON_PREFIX + 'AnnualLeave.razor dòng 1899-1923 (GetUserSelect): với user không phải Admin/Manager, danh sách NV hiển thị trên Bảng phép được lọc qua DepartmentService.GetUsersWithRoleInDepartments(user, departments) - TRƯỞNG/PHÓ PHÒNG (role 1/2) luôn thấy được thành viên phòng ban mình quản lý KHÔNG PHỤ THUỘC vào bất kỳ toggle bật/tắt nào ở Quy định > Chung. Đáng chú ý: toggle UI "Xem bảng phép" (field is_rule_annual_leave, HrmRulesModel.cs dòng 1547-1551) KHÔNG được code nào đọc tới (chỉ định nghĩa, không dùng) - có vẻ là cờ chết/thừa. Nhưng vì việc xem dữ liệu vốn hoạt động không điều kiện theo vai trò phòng ban, nên HÀNH VI THỰC TẾ vẫn khớp đúng "Kết quả mong đợi" của testcase (Trưởng/Phó phòng ban xem được bảng phép phòng ban mình quản lý).';

const NOTE_117 = COMMON_PREFIX + 'AnnualLeave.razor dòng 1826-1828: biến "_access" (quyết định hiện nút "Chỉnh sửa", dòng 60/119/887) = HrmService.HasAccess(user, dataRules.is_update_annual_leave, userRoleAndDepartment) - tức phụ thuộc trực tiếp vào toggle "Chỉnh sửa bảng phép" (is_update_annual_leave), KHÔNG phải "Xem bảng phép". Khi "Chỉnh sửa bảng phép" TẮT: _access=false (trừ khi user là Admin/Manager-có-quyền-chấm-công) -> nút "Chỉnh sửa" (dòng 60,119,887) không hiển thị cho Trưởng/Phó phòng ban dù vẫn xem được dữ liệu bình thường (xem Ghi chú 116). Khớp đúng "Kết quả mong đợi" (chỉ xem được, không có quyền/nút sửa).';

const NOTE_135 = COMMON_PREFIX + 'HrmTimesheetPermission.cs dòng 75-104 (VisibleUserIds, dùng trong Timesheet.razor): với vai trò Trưởng phòng (role=1) thấy toàn bộ thành viên phòng; Phó phòng (role=2) thấy thành viên trừ Trưởng phòng - hoàn toàn dựa theo DepartmentModel.members_list, KHÔNG kiểm tra bất kỳ rule toggle nào ("Xem bảng công" / is_rule_timesheets cũng không được code đọc ở đâu khác ngoài định nghĩa field, giống trường hợp bảng phép). Hành vi thực tế: Trưởng/Phó phòng ban luôn xem được bảng công phòng ban mình, khớp đúng "Kết quả mong đợi" testcase.';

const NOTE_136 = COMMON_PREFIX + 'HrmTimesheetPermission.cs dòng 29-32 (CanSaveEdits) + HrmTimesheetEditService.cs dòng 145-155: lưu chỉnh sửa bảng công cho phép khi "role==Admin HOẶC (role==Manager && canManageTimekeeping) HOẶC (rules.is_update_timesheets==true && HrmTimesheetPermission.IsDepartmentManager(userId, departments))". Khi Admin BẬT "Chỉnh sửa bảng công" (is_update_timesheets=true) VÀ user là Trưởng/Phó phòng ban (role 1/2) của phòng có NV cần sửa: CanSaveEdits trả về true -> lưu chỉnh sửa giờ công thành công. Khớp đúng "Kết quả mong đợi" (sửa và lưu thành công khi được cấp quyền).';

(async () => {
  const browser = await lib.getBrowser();
  await lib.writeResult(browser, 416, { status: 'DONE', note: NOTE_116, date: '21/10/2026' });
  await lib.writeResult(browser, 417, { status: 'DONE', note: NOTE_117, date: '21/10/2026' });
  await lib.writeResult(browser, 435, { status: 'DONE', note: NOTE_135, date: '21/10/2026' });
  await lib.writeResult(browser, 436, { status: 'DONE', note: NOTE_136, date: '21/10/2026' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

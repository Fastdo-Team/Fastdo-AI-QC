const lib = require('./khq_batch2_lib');

const NOTE_114 = '[QC xác nhận 21/10/2026 - test UI thật trên DEMO FASTDO]: Vào Cài đặt > Quy định chấm công > tab "Đơn từ", tắt toggle loại đơn "V - Nghỉ không lương" và Cập nhật. Sau đó vào Chấm công > Đơn từ > "+ Tạo mới" > dropdown "Đơn từ áp dụng": loại "Nghỉ không lương" KHÔNG còn xuất hiện trong danh sách chọn (chỉ còn Xin đi trễ, Xin bù công, Đổi ca làm việc, Đổi nhượng ca, Đơn từ làm thêm). Đúng kết quả mong đợi.';
const NOTE_115 = '[QC xác nhận 21/10/2026 - test UI thật trên DEMO FASTDO, nối tiếp 114]: Bật lại toggle "V - Nghỉ không lương" trong Quy định đơn từ và Cập nhật. Vào lại dropdown "Đơn từ áp dụng" khi tạo đơn: loại "Nghỉ không lương" đã XUẤT HIỆN LẠI trong danh sách, chọn được bình thường. Đúng kết quả mong đợi. Đã khôi phục cấu hình DEMO FASTDO về trạng thái ban đầu (loại đơn Nghỉ không lương = BẬT, như trước khi test).';

(async () => {
  const browser = await lib.getBrowser();
  await lib.writeResult(browser, 414, { status: 'DONE', note: NOTE_114, date: '21/10/2026' });
  await lib.writeResult(browser, 415, { status: 'DONE', note: NOTE_115, date: '21/10/2026' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

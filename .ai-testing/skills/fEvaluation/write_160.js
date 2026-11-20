const lib = require('./khq_batch2_lib');

const NOTE_160 = '[QC xác nhận 21/10/2026 - test UI THẬT + VIDEO, có upload Drive]: Đã bật "Hệ số công" trong Quy định làm ngoài giờ và tạo Ngày nghỉ "Ngày nghỉ tính lương" cho 21/10/2026 áp dụng phòng ban DEMO FASTDO với "Hệ số công chung" = 1.5 (tại /config/timekeeping/dayoff). Tạo ca làm QC160b (22:15-22:30, Số công=1), phân ca cho Hoàng Lệ Giang ngày 21/10, check-in/check-out thật lúc 22:15-22:30 (xem Lịch sử chấm công). Kết quả: "Số công ngày" của 21/10 tăng từ 4.5 lên 6.0 ngay sau khi check-in/out ca này — đúng +1.5 (= 1 công gốc × hệ số 1.5), khớp "Kết quả mong đợi" testcase (công được nhân hệ số 1.5 thay vì 1). Đã tắt tạm "Chấm công bằng hình ảnh" để check-in được (do fStorage hết hạn chặn ảnh), đã BẬT LẠI sau khi test xong. Video: https://drive.google.com/file/d/<DRIVE_FILE_ID>/view?usp=sharing';

(async () => {
  const browser = await lib.getBrowser();
  await lib.writeResult(browser, 460, { status: 'DONE', note: NOTE_160, date: '21/10/2026' });
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

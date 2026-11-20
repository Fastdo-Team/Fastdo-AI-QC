---
name: weekly-dashboard
description: Dựng Dashboard QC tuần/tháng từ dữ liệu thật (weekly_state.json, results_<ID>.json, GitHub, module Plan/Quy trình xử lý ticket trên Fastdo) — PR lên Production theo AI test/QC test tay, ticket mới log trong tuần, testcase Pass/Fail/Suggest/Pending, so sánh theo tháng. Dùng khi người dùng gõ /weekly-dashboard hoặc nhắc tới "dashboard tuần", "báo cáo QC tuần", "thống kê tháng".
argument-hint: "[trống = tuần hiện tại] | week <NN> | month <weeks 44,45,46,47>"
---

# Dashboard QC Tuần/Tháng

Bộ file: `D:\GIANG\a\FASTDO\Fastdo\fastdo-testing\.ai-testing\skills\Weekly Ticket Management Skills\`
- `Dashboard_QC_Tuan_Mockup.html` — layout đã QC duyệt (giữ nguyên CSS/cấu trúc, chỉ thay số liệu).
- `Weekly_Dashboard_Generator.js` — tính số liệu THẬT từ `weekly_state(.week<NN>).json` + `results_<ID>.json`.

## Số liệu nào script tự tính được, số liệu nào Claude phải tự đọc

`Weekly_Dashboard_Generator.js` chỉ đọc file local (weekly_state, results_*.json), tự tính được:
- Ticket tuần thực hiện (đếm ticket `y:1`), PR lên Production (PR base chứa `production` + status MERGED).
- Testcase Pass(DONE+Suggest)/Fail/Suggest/Pending, độ phủ AI Testing (ticket có ít nhất 1 case đã chạy).
- Trạng thái từng ticket: Pass / Fail / Chưa test / Doing / Pending / Cancel (logic nằm sẵn trong script).
- Cờ "Lên Production chưa test xong".

Script **không** đọc được Fastdo nên luôn trả `method: "chua_xac_dinh"` hoặc thiếu `mod` — 3 việc Claude phải tự đọc qua Chrome debug (cổng 9222, CHỈ ĐỌC, không bấm Lưu/Sửa) trước khi render:

1. **Nhãn "Book QC" trên module Plan** — mở từng ticket có `prStatus:"merged"` và `totalRun>0` trong JSON script in ra, kiểm tra có nhãn Book QC không → ticket đó `method: "qc_manual"`, còn lại `method: "ai"`.
2. **"Thời gian Khởi tạo công việc" trên module Quy trình xử lý ticket** — để lọc đúng ticket mới tạo trong tuần/tháng đang xem (không phải ticket thực hiện ở Plan).
3. **Trường Module trên quy trình** cho ticket nào `mod` đang `null` trong JSON script in ra.

Ghi 3 việc trên vào 1 file tạm, ví dụ `dash_meta.json`:
```json
{ "bookQcTickets": ["1410"], "newTicketsThisWeek": [{"id":"1393","name":"...","created":"16/11","type":"Bug","mod":"Bảng công"}], "pendingTickets": [] }
```
rồi truyền `--meta dash_meta.json` khi gọi script. Không có file `--meta` → script để `method` là `"chua_xac_dinh"`, đừng tự đoán AI/QC.

## Điểm AI Testing (bắt buộc có trên dashboard tuần và tháng)

Chấm sau các ticket của tuần/tháng, thang 100, **chỉ từ dữ liệu thật** (script tự tính, không chấm tay):

| Tiêu chí | Điểm | Cách tính |
|---|---|---|
| Độ phủ test | 20 | Ticket tuần thực hiện có ≥1 testcase đã chạy / tổng ticket tuần thực hiện |
| Hoàn thành testcase | 15 | Testcase có kết quả chốt (DONE/Fail/Suggest) / tổng testcase đã viết (kể cả chưa chạy, Pending) |
| Gác cổng Production | 20 | Ticket có PR merge Production mà AI đã test TRƯỚC giờ merge / tổng ticket có PR merge Production |
| Bằng chứng | 15 | Testcase đã chốt có link video Drive / ảnh bằng chứng / tổng testcase đã chốt |
| Tốc độ phản hồi | 15 | Từ lúc nhánh ticket merge lên beta tới lần test đầu: ≤24h đủ điểm, ≤48h 2/3, ≤72h 1/3, >72h 0 (trung bình các ticket) |
| Mức tự động hoá | 15 | Testcase do AI chạy (không phải QC test tay) / tổng testcase đã chốt |

Xếp hạng: **A ≥ 85 · B ≥ 70 · C ≥ 50 · D < 50**. Tiêu chí chưa đo được (VD tuần không có PR merge Production) không tính vào mẫu số, điểm quy đổi lại về thang 100. Tuần không có ticket tick chạy test → "chưa chấm" (không tính 0 vào điểm tháng). Tháng = trung bình các tuần đã chấm.

- Xem bộ tiêu chí: `node "Weekly_Dashboard_Generator.js" rubric`. Điểm nằm trong JSON của `data` (`score`) và `month` (`score`, `perWeek[].score`).
- **Sau khi dựng `Dashboard_QC_Tuan_Live.html`** (tuần hoặc tháng) LUÔN chạy: `node "Weekly_Dashboard_Generator.js" inject --week <NN> [--weeks <các tuần trong tháng>]` để ghi điểm vào panel "Điểm AI Testing" (khối `<script id="aiScoreData">`). Bản Live dựng từ Mockup cũ chưa có panel → chép panel + `aiScoreCss` + `aiScoreJs` từ `Dashboard_QC_Tuan_Mockup.html`.
- Khi báo QC: nêu tổng điểm + hạng, 2 tiêu chí thấp nhất và việc cụ thể để cải thiện (VD "Bằng chứng 6.5/15 — 147 testcase chốt chưa có video Drive → upload video và gắn link").

## Xử lý theo `$ARGUMENTS`

**Trống hoặc `week <NN>`**
1. `node "Weekly_Dashboard_Generator.js" data [--week <NN>]` (không `--week` = tuần hiện tại, đọc `weekly_state.json`).
2. Đọc JSON trả về. Với ticket có `mod:null` hoặc cần xác định AI/QC test, đọc Fastdo (mục trên) rồi ghi `dash_meta.json`, chạy lại `data --meta dash_meta.json` lấy số liệu đã đủ.
3. Lấy danh sách ticket mới log trong tuần: mở module Quy trình xử lý ticket, lọc theo "Thời gian Khởi tạo công việc" nằm trong khoảng `from`–`to` của tuần (JSON có sẵn `from`/`to`). Không phải danh sách `tickets` của bước 1 (đó là ticket **thực hiện** ở Plan).
4. Copy `Dashboard_QC_Tuan_Mockup.html` → `Dashboard_QC_Tuan_Live.html`, sửa đúng các khối số liệu (KPI, bảng "Ticket tuần thực hiện", panel "PR lên Production", panel "Ticket mới log") bằng số liệu bước 2–3, giữ nguyên CSS/cấu trúc/JS tương tác (highlight, expand, trend chart). Xoá dòng "Số liệu minh hoạ..." ở đầu trang vì giờ là số thật.
5. In link mở file ở dòng riêng cuối câu trả lời, giống quy ước `/weekly-ticket-qc`:
```
🔗 Dashboard tuần <NN>: file:///D:/GIANG/a/FASTDO/Fastdo/fastdo-testing/.ai-testing/skills/Weekly%20Ticket%20Management%20Skills/Dashboard_QC_Tuan_Live.html
```
Không tự mở trình duyệt trừ khi được yêu cầu. Nhắc thêm 1 dòng: `Trong VS Code: bấm 🔗 Dashboard tuần ở thanh trạng thái (hoặc Ctrl+Alt+D) — tab tự làm mới khi file này đổi.` (extension cùng với Pipeline tuần, `fastdo-qc.fastdo-weekly-pipeline`).

**`month <danh sách tuần>`** (vd `month 44,45,46,47`)
1. `node "Weekly_Dashboard_Generator.js" month --weeks <danh sách> [--meta dash_meta.json]`.
2. **Lưu ý trước khi tin số liệu tuần cũ**: `weekly_state.week<NN>.json` chỉ là ảnh chụp lúc `init`, có thể **chưa cập nhật** tick ✓/kết quả test về sau (đã gặp: tuần 47 archive toàn `y:0` dù bản `weekly_state.json` sống đã tick và chạy test xong). Nếu nghi ngờ số liệu tuần nào bằng 0 bất thường, báo QC: "tuần <NN> dùng archive chưa cập nhật, số liệu có thể thiếu" thay vì báo sai mà không nói gì.
3. Render phần "So sánh giữa các tháng" / `monthView` trong `Dashboard_QC_Tuan_Live.html` bằng số liệu `month`, giữ nguyên dropdown chọn tháng và 2 biểu đồ so sánh.
4. In link mở file như trên.

## Bắt buộc
- Fastdo: chỉ đọc (Chrome debug 9222), không bấm Lưu/Sửa/Xoá/Duyệt.
- Không tự đoán AI test / QC test tay khi chưa đọc nhãn Book QC — để `"chưa xác định"` trên dashboard và nói rõ với QC, không mặc định tất cả là AI test.
- Số liệu testcase/ticket lấy từ `Weekly_Dashboard_Generator.js`, không tự cộng tay để tránh lệch với `results_<ID>.json`.

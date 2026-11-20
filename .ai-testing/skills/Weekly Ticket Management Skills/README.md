# Weekly Ticket Management Skills — Pipeline ticket tuần

Bộ file để chạy pipeline xử lý ticket tuần (đọc ticket → code change → scenario → testcase → test → retest → đóng ticket trên production).

## File trong folder

| File | Dùng để |
|---|---|
| `Prompt_Pipeline_Ticket_Tuan.md` | Prompt tổng quan giao cho Claude Code: vai trò, đầu vào, tài khoản, 7 bước, lưu trữ, mô tả giao diện |
| `Pipeline_Ticket_Tuan_UI.html` | Giao diện pipeline mẫu (mở bằng trình duyệt), cũng là template cho lệnh `ui`. Các nút gửi lệnh sẽ **sao chép lệnh** để dán vào Claude Code |
| `Weekly_Ticket_Management_Skills.js` | CLI chạy pipeline trên terminal (xem mục dưới) |
| `weekly_state.json` | *(tự tạo khi chạy `init`)* trạng thái tuần: ticket, tick ✓/✕, thông tin QC từng ticket |
| `Pipeline_Ticket_Tuan_Live.html` | *(tự tạo khi chạy `ui`)* giao diện với số liệu thật |

## CLI — `Weekly_Ticket_Management_Skills.js`

Chạy trong thư mục này: `node Weekly_Ticket_Management_Skills.js <lệnh>` (xem đủ bằng `help`).

| Bước | Lệnh | Ví dụ |
|---|---|---|
| Tạo tuần | `init` | `init 09 --from 16/11 --to 22/11` |
| 1 · ticket AI lấy từ quy trình/KH tuần | `add` | `add 1384 --name "UPDATE HOA HƯNG" --type Update --env Localhost --deadline 11/11 --group "phép/lương" --lane B` |
| 1 · tick ✓ / ✕ | `approve` / `reject` / `list` | `approve 1384 1373` · `reject 1376` |
| 1c · thông tin QC | `set` | `set 1384 --sheet <link> --tab "TESTCASE - 2026" --web <URL> --org "..." --qc Giang` · `set 1373 --like 1384 --web <URL>` |
| Tài khoản | `accounts` | kiểm tra Chrome debug 9222 có tab fastdo.vn, `gh auth status`, credentials.json |
| Bắt đầu | `start` | báo ticket còn thiếu thông tin, rồi tạo lệnh chạy pipeline (tự sao chép) |
| 5–6 · tiến độ | `status` | đã chạy/tổng, DONE/Fail/Suggest/Pending, link dải dòng Sheet |
| 5–6 · cần QC check | `qc` | `qc 1384` — từng case kèm lý do + link đúng dòng |
| 6 · retest chọn lọc | `retest` | `retest 1384 022 074` · `retest 1384 --fail` · `retest 1384 --qc` |
| Giao diện số liệu thật | `ui` | xuất và mở `Pipeline_Ticket_Tuan_Live.html` |

CLI **không** đăng nhập hộ, không ghi Fastdo/GitHub; với Sheet chỉ đọc metadata (lấy gid của tab). Việc test/ghi kết quả vẫn do Claude Code làm theo lệnh CLI tạo ra. Số liệu lấy từ `Ticket_<ID>/results_<ID>.json` — ticket cũ chưa có file này sẽ hiện "chưa chạy test".

## File dùng chung (không nằm trong folder này — giữ nguyên vị trí vì nhiều ticket cùng dùng)

| File | Vị trí |
|---|---|
| Quy tắc test (Rules_Skill, mục C.4a: 1 ticket = 1 file JSON) | `D:\GIANG\a\FASTDO\Fastdo\fastdo-testing\.ai-testing\skills\Rules_Skill.md` |
| Template, CLAUDE.md, QC_Dau_Vao.md | `D:\GIANG\a\FASTDO\Fastdo\fastdo-testing\.ai-testing\templates\` |
| `ticket_results.js` (ghi/đọc `results_<ID>.json`) | `D:\GIANG\a\Automation\ticket_results.js` |
| `jwt_sheets.js`, `credentials.json` (ghi Google Sheet) | `D:\GIANG\a\Automation\` |
| Kết quả từng ticket | `D:\GIANG\a\Automation\AI TESTING\Ticket_<ID>\` |

## Chạy

1. Đăng nhập: Fastdo trên Chrome debug 9222 (chỉ đọc), GitHub bằng `gh auth login` (chỉ đọc), Sheet đã chia sẻ Editor cho Service Account.
2. Mở Claude Code ở `D:\GIANG\a\FASTDO\Fastdo\fastdo-testing`, gửi nội dung khối prompt trong `Prompt_Pipeline_Ticket_Tuan.md` — hoặc dùng CLI: `init` → `add` → `approve` → `set` → `start` rồi dán lệnh đã sao chép.
3. Tick ✓ / ✕ ticket chạy test → điền thông tin QC từng ticket (1c) → duyệt scenario, testcase → xem kết quả, retest từng case.

## Skill `/weekly-ticket-qc`

- Bản gốc để sửa: `skills/weekly-ticket-qc/SKILL.md` (trong thư mục này).
- Bản Claude thật sự đọc: `C:\Users\ADMIN\.claude\skills\weekly-ticket-qc\SKILL.md`. Claude chỉ tìm skill ở `~/.claude/skills`, nên **không chuyển/xoá thư mục đó**. Sửa bản gốc xong thì chép đè sang:
  `copy /Y "skills\weekly-ticket-qc\SKILL.md" "%USERPROFILE%\.claude\skills\weekly-ticket-qc\SKILL.md"`
- Thư mục `skills/synced` là skill đồng bộ của Claude, bản đang dùng nằm ở `~/.claude/skills/synced`.
- CLI tự tìm `D:\GIANG\a\Automation` (chứa `jwt_sheets.js`, `ticket_results.js`, `AI TESTING\Ticket_<ID>`). Nếu đổi chỗ, đặt biến môi trường `FASTDO_AUTOMATION_ROOT`.

## Skill `/weekly-dashboard`

Dựng Dashboard QC tuần/tháng từ dữ liệu thật (xem `skills/weekly-dashboard/SKILL.md` để biết chi tiết cách tính và phần Claude phải tự đọc trên Fastdo).

Xem **trong VS Code**: bấm 🔗 **Dashboard tuần** ở thanh trạng thái hoặc `Ctrl+Alt+D` — mở `Dashboard_QC_Tuan_Live.html` trong 1 tab webview, tự làm mới khi file đó (hoặc `weekly_state.json`/`results_<ID>.json`) thay đổi. Cùng extension với Pipeline tuần (`fastdo-qc.fastdo-weekly-pipeline`, `Ctrl+Alt+P`) — sửa `vscode-extension/extension.js` xong thì build lại: `powershell -ExecutionPolicy Bypass -File vscode-extension\build_vsix.ps1` rồi `Developer: Reload Window`.

| File | Dùng để |
|---|---|
| `Dashboard_QC_Tuan_Mockup.html` | Layout đã QC duyệt — giữ nguyên, chỉ copy ra bản `_Live.html` rồi thay số liệu |
| `Weekly_Dashboard_Generator.js` | CLI tính số liệu thật từ `weekly_state(.week<NN>).json` + `results_<ID>.json` (`data [--week <NN>]` / `month --weeks 44,45,46,47`) |
| `Dashboard_QC_Tuan_Live.html` | *(tự tạo khi chạy skill)* bản có số liệu thật |

Bản gốc skill để sửa: `skills/weekly-dashboard/SKILL.md` trong thư mục này; Claude đọc bản chép ở `C:\Users\ADMIN\.claude\skills\weekly-dashboard\SKILL.md` — sửa xong nhớ chép đè như skill ở trên.

**Lưu ý đã biết**: `weekly_state.week<NN>.json` chỉ là ảnh chụp lúc `init`, không tự cập nhật theo tick/kết quả test về sau — số liệu `month` cho tuần cũ có thể thiếu nếu archive chưa được lưu lại. Script không đọc được nhãn "Book QC" (module Plan), "Thời gian Khởi tạo công việc" và trường Module còn thiếu (module Quy trình xử lý ticket) — 3 việc này Claude phải tự đọc qua Chrome debug rồi truyền vào bằng `--meta <file.json>`.

## Xem pipeline trong VS Code

Extension `vscode-extension/` (đã cài: `fastdo-qc.fastdo-weekly-pipeline`). Bấm **🚀 Pipeline tuần** ở thanh trạng thái hoặc `Ctrl+Alt+P` → mở tab Visual Pipeline, tự làm mới khi kết quả test đổi. Sửa extension xong: `powershell -ExecutionPolicy Bypass -File vscode-extension\build_vsix.ps1` rồi Reload Window.

## Worktree · tổ chức · solution · điểm AI Testing (20/11)

| Lệnh | Việc |
|---|---|
| `wt up <id> --wait` | Ticket Localhost: worktree riêng `Fastdo2/fastdo-server-wt-<id>` + cổng riêng (3101…), `dotnet run` nền |
| `wt list` / `wt sync` / `wt down <id>` / `wt clean` | Xem · lấy commit mới của nhánh · xoá tay · tự xoá worktree ticket PASS hết |
| `orgs` / `orgs assign` / `orgs add "<tên>"` / `set <id> --org auto` | Beta/Production: mỗi ticket 1 tổ chức riêng |
| `solution <id>` | Đọc solution AI Coding `.workspace/**/ticket_<id>*.md` (cần dev bỏ chặn `.workspace/tickets` trong .gitignore) |
| `node Weekly_Dashboard_Generator.js inject --week NN --weeks 44,45,46,47` | Ghi Điểm AI Testing (6 tiêu chí, thang 100) vào dashboard |

# Fastdo – Pipeline ticket tuần (extension VS Code)

Mở Visual Pipeline ticket tuần trong 1 tab của VS Code, không cần trình duyệt.

- Mở: bấm **🚀 Pipeline tuần** ở thanh trạng thái (góc dưới bên trái), hoặc `Ctrl+Alt+P`, hoặc `Ctrl+Shift+P` → "Fastdo: Mở Pipeline ticket tuần".
- Tự làm mới khi `weekly_state.json` hoặc `results_<ID>.json` thay đổi; nút ⟳ ở góc phải tab để làm mới tay.
- Nút gửi/retest trong giao diện → sao chép lệnh, dán (Ctrl+V) vào Claude Code. Link Google Sheet → mở trình duyệt.
- Sửa code xong: chạy lại `powershell -ExecutionPolicy Bypass -File build_vsix.ps1` rồi Reload Window.

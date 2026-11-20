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
  }
}
const OLD = `[ĐÃ THỬ THẬT TRÊN LDPLAYER 27/10/2026, chưa hoàn tất được do lỗi hạ tầng]: Cùng lỗi hạ tầng với KHQ_IV_001 — màn chấm công liên tục báo 'Cần quyền truy cập vị trí'/'Ứng dụng cần quyền truy cập vị trí để chấm công và hiển thị bản đồ' dù đã cấp đủ quyền Vị trí (app + hệ thống), không tới được bước chấm công thật để quan sát có bị chặn theo bán kính hay không. Có lúc màn 'Chọn địa điểm chấm công' hiện ra kèm 1 địa điểm được tự động đánh dấu '(Đang chọn)' dựa trên vị trí GPS giả lập hiện tại của máy (gợi ý máy ĐANG có 1 toạ độ GPS ảo cố định nào đó, không rõ có khớp vị trí thật của các địa điểm cấu hình hay không) nhưng bấm vào không dẫn tới xác nhận chấm công mà quay lại yêu cầu cấp quyền. Kết hợp đọc code: RulesTimekeepingV3Service.cs dòng 137-149 xác nhận isCheckLocation tính đúng theo phòng ban/is_location_required, nhưng việc tính khoảng cách GPS + chặn do vượt bán kính không thấy trong fastdo-server (nhiều khả năng là logic phía app, không tới được bước này để quan sát do mắc ở bước xin quyền vị trí). Đề nghị QC thử trên điện thoại thật hoặc kiểm tra lại GPS ảo LDPlayer.`;
const APPEND = `

[Cập nhật 10/11/2026]: KHQ_IV_020-031 (cả batch) vẫn 0/12 - đã thử tiếp qua LDPlayer (ldconsole.exe locate để bơm GPS, kỹ thuật uiautomator dump lấy toạ độ tap chính xác theo feedback mới) nhưng BỊ CHẶN HOÀN TOÀN ở tầng hạ tầng khác: devtunnel https://60rr1632-3000.asse.devtunnels.ms/ hiện yêu cầu đăng nhập GitHub ("Sign in to GitHub to continue to Dev Tunnels") thay vì trang "Continue" như trước - không cấu hình được gì trên CMS web (địa điểm, quy định) nên không dựng được tiền điều kiện cho bất kỳ case nào trong batch; localhost:3000 cũng connection refused. Đây là thay đổi quyền truy cập tunnel ở cấp hạ tầng/tài khoản GitHub, ngoài khả năng tự khắc phục của AI. Tìm thêm 1 manh mối code: HrmTrackingRule.cs (FastdoServer/Core/Domain/Hrm/Configuration) CÓ hàm Haversine distance + IsInside(location, lat, lon, threshold) dùng bán kính thật - trái với ghi chú 27/10 nói "không thấy trong fastdo-server" - nhưng đây là module cho tính năng TRACKING (theo dõi vị trí liên tục), chưa xác nhận có phải cùng logic chặn check-in hay không (cần dò thêm HrmTrackingService.cs/service gọi check-in thật, codebase đã tái cấu trúc nhiều - TimeKeepingV3Service.cs cũ không còn tồn tại). Đề nghị: (1) QC mở lại tunnel chế độ public hoặc cấp URL/credentials GitHub mới; (2) phiên sau dành thời gian riêng dò lại đúng service xử lý check-in để đọc code cho 020-031 thay vì tiếp tục cố test UI nếu tunnel chưa khôi phục.`;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#t-name-box', { timeout: 60000 });
    await sleep(6000);
    await navTo(page, 'I320');
    await page.keyboard.press('Delete');
    await sleep(250);
    await page.keyboard.press('F2');
    await sleep(400);
    const full = OLD + APPEND;
    const lines = full.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) { await page.keyboard.down('Alt'); await page.keyboard.press('Enter'); await page.keyboard.up('Alt'); await sleep(50); }
      if (lines[i]) await page.keyboard.sendCharacter(lines[i]);
    }
    await sleep(400);
    await page.keyboard.press('Enter');
    await sleep(500);
    await navTo(page, 'I320');
    const check = await page.evaluate(() => document.querySelector('.cell-input')?.innerText.slice(-200));
    console.log('tail:', check);
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();

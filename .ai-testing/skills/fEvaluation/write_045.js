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

const NOTE = '[Đọc code 21/10/2026, theo mô tả đã cập nhật]: Hàm BatchCheckinAsync (TimeKeepingV3Service.cs dòng 4556-4589) — xử lý đúng chức năng "Chấm công cho nhân viên": khi is_check_actor_rules=false (tương ứng "KHÔNG bật Kiểm tra theo quy định của người chấm công thay" theo điều kiện testcase), code CHỦ ĐỘNG set "singleRequest.IsValid = true; singleRequest.InCompany = true;" TRƯỚC khi gọi CheckinShift — ép ghi nhận là trong vị trí hợp lệ, không phụ thuộc vị trí thật. Ngoài ra ở CheckinShift, điều kiện trừ quota chấm công ngoài vị trí (dòng 871-876) cũng loại trừ riêng mọi request có ActorId khác nhân viên (chấm hộ). => B1 chấm hộ không bị chặn "hết số lần chấm công ngoài vị trí", lượt chấm hộ không bị tính vào quota của NV A — khớp đúng Kết quả mong đợi. File: FastdoServer/Application/Services/Hrm/Attendance/TimeKeepingV3Service.cs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p=>p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  await page.bringToFront();
  await sleep(500);

  await setCellDirect(page, 'H345', 'DONE'); console.log('wrote H345');
  await setCellDirect(page, 'I345', NOTE); console.log('wrote I345');
  await setCellDirect(page, 'K345', '21/10/2026'); console.log('wrote K345');

  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

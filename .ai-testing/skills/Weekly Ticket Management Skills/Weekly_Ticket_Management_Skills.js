#!/usr/bin/env node
// Weekly_Ticket_Management_Skills.js — CLI điều khiển Pipeline ticket tuần trên terminal.
//
// Không đăng nhập hộ, không nhập mật khẩu, KHÔNG ghi Fastdo / GitHub. Chỉ:
//   - lưu trạng thái tuần (ticket nào được tick ✓, thông tin QC từng ticket) vào weekly_state.json
//   - đọc kết quả thật từ AI TESTING/Ticket_<ID>/results_<ID>.json
//   - đọc metadata Google Sheet (gid của tab) để tạo link đúng dòng
//   - tạo lệnh (prompt) để dán vào Claude Code + sao chép vào clipboard
//   - xuất giao diện HTML với số liệu thật
//
// Chạy:  node Weekly_Ticket_Management_Skills.js help

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const http = require('http');

// ---------- Đường dẫn ----------
const HERE = __dirname;
const STATE_FILE = path.join(HERE, 'weekly_state.json');
const UI_TEMPLATE = path.join(HERE, 'Pipeline_Ticket_Tuan_UI.html');
const UI_OUT = path.join(HERE, 'Pipeline_Ticket_Tuan_Live.html');
function findRoot() { // thư mục chứa jwt_sheets.js (gốc dự án Automation)
  const cands = [process.env.FASTDO_AUTOMATION_ROOT, 'D:/GIANG/a/Automation'].filter(Boolean);
  for (const c of cands) if (fs.existsSync(path.join(c, 'jwt_sheets.js'))) return path.resolve(c);
  let d = HERE;
  for (let i = 0; i < 6; i++) { if (fs.existsSync(path.join(d, 'jwt_sheets.js'))) return d; d = path.dirname(d); }
  return null;
}
const ROOT = findRoot();
const AIT = ROOT ? path.join(ROOT, 'AI TESTING') : path.dirname(HERE);
const ticketDir = id => path.join(AIT, `Ticket_${id}`);

// ---------- Tiện ích ----------
const C = process.stdout.isTTY ? { g: s => `\x1b[32m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, d: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m` }
  : { g: s => s, r: s => s, y: s => s, d: s => s, b: s => s };
const die = m => { console.error(C.r('✕ ' + m)); process.exit(1); };
const pad = (s, n) => { s = String(s ?? ''); return s.length >= n ? s.slice(0, n - 1) + '…' : s + ' '.repeat(n - s.length); };
const normId = s => String(s).replace(/^TK/i, '').trim();
const STATUS = s => String(s || '').trim();
const FIELDS = { sheet: 'sh', tab: 'tab', web: 'web', app: 'app', org: 'org', qc: 'qcn', mode: 'mode' };
const MODE_TXT = { 1: '[1] Phân tích + sinh Test Scenario / Phân tích Fix (dừng chờ QC review)', 2: '[2] Sinh Test Case vào Sheet (dừng chờ QC review)', 3: '[3] Chạy test tự động + ghi Sheet', 4: '[4] Làm tuần tự 1→2→3, dừng chờ QC xác nhận sau bước 1 và 2' };
const REQ = ['sh', 'tab', 'web', 'org', 'qcn'];
const LABEL = { sh: 'Link Sheet', tab: 'Tên tab', web: 'URL Web', app: 'App', org: 'Tổ chức', qcn: 'QC' };

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 1), 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}
function needState() { const s = loadState(); if (!s) die('Chưa có tuần nào. Chạy: init <số tuần>'); return s; }
function getTicket(s, id) { const t = s.tickets.find(x => x.id === normId(id)); if (!t) die(`Không có TK${normId(id)} trong tuần ${s.week}. Thêm bằng: add ${normId(id)} --name "..."`); return t; }

function parseArgs(argv) { // tách --key value / --flag, còn lại là positional
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; opt[k] = v; }
    else pos.push(a);
  }
  return { pos, opt };
}
function sheetId(url) { const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]{20,})/); return m ? m[1] : ''; }
function missing(t) {
  const f = t.f || {};
  return REQ.filter(k => !String(f[k] || '').trim()
    || (k === 'sh' && !sheetId(f[k]))
    || (k === 'web' && !/^https?:\/\//.test(f[k]) && !isLocal(f[k])));
}
const isLocal = v => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(String(v || '').trim());
function normWeb(v) { // "localhost" → "http://localhost:3000"
  v = String(v || '').trim();
  if (isLocal(v) && !/^https?:\/\//.test(v)) v = 'http://' + v;
  if (/^http:\/\/(localhost|127\.0\.0\.1)\/?$/i.test(v)) v = v.replace(/\/?$/, ':3000');
  return v;
}
const SERVER_DIR = process.env.FASTDO_SERVER_DIR || 'D:/GIANG/a/FASTDO/Fastdo/Fastdo2/fastdo-server';
const LOCAL_STEPS = url => `Localhost (${url}): trong ${SERVER_DIR} — git status (có thay đổi chưa commit → DỪNG hỏi QC, không stash/reset), git fetch origin, tìm PR/nhánh của ticket (gh pr checkout <số PR> hoặc git checkout <nhánh ticket> && git pull), rồi chạy nền: dotnet run --project FastdoServer.Blazor --urls ${url.replace(/\/$/, '')}; đợi trang trả 200 rồi mới test. Không push, không sửa code.`;
function copy(text) { // clipboard Windows, giữ đúng tiếng Việt (qua base64 UTF-8)
  try {
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    const r = spawnSync('powershell', ['-NoProfile', '-Command',
      `Set-Clipboard -Value ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')))`], { stdio: 'ignore' });
    return r.status === 0;
  } catch { return false; }
}
function emitPrompt(text) {
  console.log('\n' + C.d('──── Lệnh dán vào Claude Code ────'));
  console.log(text);
  console.log(C.d('──────────────────────────────────'));
  if (process.argv.includes('--no-copy')) return;
  console.log(copy(text) ? C.g('✓ Đã sao chép vào clipboard') : C.y('! Không sao chép được, hãy copy đoạn trên'));
}

// ---------- Đọc kết quả thật của ticket ----------
const QC_NOTE = /(cần QC[^.;\n]{0,80}|QC (kiểm tra|xác nhận|test tay)[^.;\n]{0,70})/i;
function ticketData(t) {
  const dir = ticketDir(t.id);
  const file = path.join(dir, `results_${t.id}.json`);
  const out = { exists: fs.existsSync(file), total: 0, n: {}, lan: 0, r0: 0, r1: 0, qc: [], cases: {} };
  let defs = [];
  let start = 0;
  try { const cf = path.join(dir, `tk${t.id}_cases.js`); if (fs.existsSync(cf)) { delete require.cache[require.resolve(cf)]; defs = require(cf); } } catch { defs = []; }
  if (defs && !Array.isArray(defs)) { start = +defs.START_ROW || 0; defs = Array.isArray(defs.cases) ? defs.cases : []; }
  if (!out.exists) { out.total = defs.length || t.total || 0; if (start && defs.length) { out.r0 = start; out.r1 = start + defs.length - 1; } return out; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cases = data.cases || {};
  out.cases = cases;
  const ids = Object.keys(cases);
  out.total = Math.max(defs.length, ids.length, t.total || 0);
  // dòng Sheet: dùng sheetRow có sẵn, thiếu thì suy từ case khác (dòng = gốc + số thứ tự)
  let base = null;
  for (const [k, c] of Object.entries(cases)) if (c.sheetRow) { base = c.sheetRow - parseInt(k.split('_').pop(), 10); break; }
  const rowOf = (k, c) => c.sheetRow || (base != null ? base + parseInt(k.split('_').pop(), 10) : 0);
  const rows = [];
  for (const [k, c] of Object.entries(cases)) {
    const last = (c.runs || [])[c.runs.length - 1];
    if (!last) continue;
    const st = STATUS(last.status);
    out.n[st] = (out.n[st] || 0) + 1;
    out.lan = Math.max(out.lan, ...c.runs.map(r => r.lan || 1));
    const row = rowOf(k, c); if (row) rows.push(row);
    const note = (String(last.result || '').match(QC_NOTE) || [])[0];
    if (/^(Fail|Pending|Suggest)$/i.test(st) || note) {
      const reason = note ? note.trim() : String(last.result || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s/)[0].slice(0, 90);
      out.qc.push({ id: k, num: k.split('_').pop(), status: st, title: (c.title || '').replace(/^[\d.x]+\s*-\s*/, '').slice(0, 70), reason, row });
    }
  }
  const order = { Fail: 0, Pending: 1, Suggest: 2 };
  out.qc.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.num.localeCompare(b.num));
  if (rows.length) { out.r0 = Math.min(...rows); out.r1 = Math.max(...rows); }
  return out;
}
const doneOf = d => Object.values(d.n).reduce((a, b) => a + b, 0);

// Report nhanh bước 7: QC, môi trường đã test, số case PASS, lỗi ở đâu, ==> PASS / FAIL
function reportOf(t) {
  const d = ticketData(t);
  let defs = [];
  try { const cf = path.join(ticketDir(t.id), `tk${t.id}_cases.js`); if (fs.existsSync(cf)) { const x = require(cf); defs = Array.isArray(x) ? x : (x.cases || []); } } catch { }
  const titleOf = Object.fromEntries(defs.map(c => [c.id, c.title]));
  const n = d.n, pass = (n.DONE || 0) + (n.Suggest || 0), fail = n.Fail || 0, pend = n.Pending || 0, notRun = Math.max(0, d.total - doneOf(d));
  const envs = new Set(); let lastDate = '';
  for (const c of Object.values(d.cases)) for (const r of c.runs || []) { if (r.env) envs.add(r.env); if (r.date > lastDate) lastDate = r.date; }
  const g = t.git || {};
  const envTxt = envs.size ? [...envs].map(e => e + (/local/i.test(e) && t.f.web ? ` (${t.f.web})` : !/local/i.test(e) && t.f.web && e === t.env ? ` (${t.f.web})` : '')).join(', ') : '— (chưa chạy test)';
  const clean = s => String(s || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s*-\s*Video Test Record:.*$/is, '').replace(/\s+/g, ' ').trim();
  const bad = [];
  for (const [k, c] of Object.entries(d.cases)) {
    const l = (c.runs || [])[c.runs.length - 1]; if (!l) continue;
    const st = STATUS(l.status); if (!/^(Fail|Pending)$/i.test(st)) continue;
    const why = clean(l.result).split(/(?<=[.;])\s/).filter(Boolean).slice(-1)[0] || '';
    bad.push({ k, st, title: (x => x.length > 90 ? x.slice(0, 90).replace(/s+S*$/, '') + '…' : x)(titleOf[k] || c.title || ''), why: why.slice(0, 160), row: c.sheetRow || (d.r0 ? d.r0 + parseInt(k.split('_').pop(), 10) - 1 : 0) });
  }
  bad.sort((a, b) => (a.st === 'Fail' ? 0 : 1) - (b.st === 'Fail' ? 0 : 1) || a.k.localeCompare(b.k));
  const ok = d.total > 0 && fail === 0 && pend === 0 && notRun === 0;
  const prod = [...envs].some(e => /prod/i.test(e));
  const verdict = ok ? 'PASS' : 'FAIL';
  const lines = [
    `REPORT TK${t.id} — ${t.name || ''}`,
    `QC: ${(t.f && t.f.qcn) || 'Giang'}${lastDate ? ' · test ngày ' + lastDate.slice(0, 10).split('-').reverse().join('/') : ''}`,
    `Môi trường đã test: ${envTxt}${g.branch ? ` · nhánh ${g.branch}${g.commit ? ' (' + g.commit + ')' : ''}` : ''}${d.lan ? ' · lần test ' + d.lan : ''}`,
    `Kết quả: ${pass}/${d.total} testcase PASS${n.Suggest ? ` (gồm ${n.Suggest} Suggest)` : ''} · ${fail} Fail · ${pend} Pending${notRun ? ` · ${notRun} chưa chạy` : ''}`,
    bad.length ? 'Lỗi / chưa đạt:' : 'Lỗi: không có',
    ...bad.map(b => `  - ${b.k} (${b.st}${b.row ? ', dòng ' + b.row : ''}): ${b.title}${b.why ? ' → ' + b.why : ''}`),
    `==> ${verdict}${ok && !prod ? ' (chưa test Production — chưa đóng ticket)' : ''}${!ok && !fail && (pend || notRun) ? ' (còn ' + (pend + notRun) + ' case chưa có kết quả)' : ''}`,
  ];
  return { text: lines.join('\n'), verdict, pass, total: d.total, fail, pend, notRun, prod };
}

function link(t, a, b) {
  const id = sheetId(t.f && t.f.sh); if (!id || !a) return '';
  return `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${t.gid ?? 0}&range=A${a}:W${b || a}`;
}

// ---------- Google Sheet: lấy gid của tab (chỉ đọc metadata) ----------
async function resolveGid(t) {
  if (!ROOT || !t.f || !sheetId(t.f.sh) || !t.f.tab) return;
  try {
    const J = require(path.join(ROOT, 'jwt_sheets.js'));
    const tok = await J.getAccessToken();
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId(t.f.sh)}?fields=sheets.properties(title,sheetId)`, { headers: { Authorization: 'Bearer ' + tok } });
    const m = await r.json();
    const sh = (m.sheets || []).find(x => x.properties.title.trim() === String(t.f.tab).trim());
    if (sh) t.gid = sh.properties.sheetId; else console.log(C.y(`! TK${t.id}: không thấy tab "${t.f.tab}" trong Sheet`));
  } catch (e) { console.log(C.y(`! TK${t.id}: không đọc được Sheet (${e.message}) — kiểm tra Sheet đã chia sẻ cho Service Account chưa`)); }
}

// ---------- Kiểm tra tài khoản (không đăng nhập hộ) ----------
function getJSON(url) {
  return new Promise(res => {
    const req = http.get(url, { timeout: 2500 }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch { res(null); } }); });
    req.on('error', () => res(null)); req.on('timeout', () => { req.destroy(); res(null); });
  });
}
async function checkAccounts(port = 9222) {
  const acc = [];
  // dò cổng chỉ định trước, rồi các cổng Chrome debug hay dùng (9222–9226); ưu tiên tab work.fastdo.vn (KH Tuần ở production)
  const ports = [...new Set([+port, 9222, 9223, 9224, 9225, 9226])];
  let found = null, anyOpen = [];
  for (const pt of ports) {
    const tabs = await getJSON(`http://127.0.0.1:${pt}/json/list`); if (!tabs) continue; anyOpen.push(pt);
    const work = tabs.find(x => /work\.fastdo\.vn/.test(x.url || '')), dev = tabs.find(x => /fastdo\.vn/.test(x.url || ''));
    if (work) { found = { pt, url: work.url }; break; }
    if (dev && !found) found = { pt, url: dev.url, devOnly: true };
  }
  if (!anyOpen.length) acc.push({ k: 'fd', name: 'Fastdo', ok: false, msg: `Không có Chrome debug nào (cổng ${ports.join('/')}) — mở Chrome debug rồi đăng nhập work.fastdo.vn` });
  else if (!found) acc.push({ k: 'fd', name: 'Fastdo', ok: false, msg: `Chrome debug ${anyOpen.join('/')} đang chạy nhưng chưa có tab fastdo.vn — đăng nhập work.fastdo.vn` });
  else acc.push({ k: 'fd', name: 'Fastdo', ok: !found.devOnly, port: found.pt, msg: found.devOnly ? `Cổng ${found.pt} chỉ có tab dev1 (${found.url.slice(0, 50)}) — cần tab work.fastdo.vn để đọc KH Tuần` : `Cổng ${found.pt}: đang mở ${found.url.slice(0, 60)}` });
  let gh = { k: 'gh', name: 'GitHub', ok: false, msg: 'Chưa cài GitHub CLI (gh) — cài rồi chạy: gh auth login' };
  const GH = ['C:/Program Files/GitHub CLI/gh.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs/GitHub CLI/gh.exe')].find(p => fs.existsSync(p));
  try { const o = execSync(`${GH ? `"${GH}"` : 'gh'} auth status 2>&1`, { encoding: 'utf8' }); gh = { k: 'gh', name: 'GitHub', ok: /Logged in/i.test(o), msg: /Logged in/i.test(o) ? 'Đã đăng nhập (chỉ đọc)' : 'Chưa đăng nhập — chạy: gh auth login' }; }
  catch (e) { const o = String(e.stdout || ''); if (o && !/not recognized|not found|không được nhận/i.test(o)) gh = { k: 'gh', name: 'GitHub', ok: false, msg: 'Chưa đăng nhập — chạy: gh auth login' }; }
  acc.push(gh);
  const cred = ROOT && fs.existsSync(path.join(ROOT, 'Test-automation', 'credentials.json'));
  acc.push({ k: 'gs', name: 'Google Sheet', ok: !!cred, msg: cred ? 'Có Service Account (credentials.json) — Sheet phải chia sẻ quyền Editor' : 'Không thấy Test-automation/credentials.json' });
  return acc;
}

// ---------- Lệnh ----------
const CMD = {};

// =====================================================================
// WORKTREE THEO TICKET — mỗi ticket 1 thư mục fastdo-server-wt-<id> + 1 cổng riêng (3101, 3102…)
// Chỉ thao tác git CỤC BỘ (fetch / worktree add / checkout --detach) — không push, không sửa code, không đổi nhánh của checkout chính.
// =====================================================================
const WT_BASE_PORT = 3101;
const wtPath = id => path.join(path.dirname(SERVER_DIR), `fastdo-server-wt-${id}`);
// -c core.longpaths=true: repo có đường dẫn dài, Windows báo "Could not reset index file" nếu thiếu (chỉ áp cho lệnh này, không đổi cấu hình git của máy)
const git = (args, cwd = SERVER_DIR, timeout = 120000) => execSync(`git -c core.longpaths=true ${args}`, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const wtPortFree = port => new Promise(res => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); });
const portUp = port => new Promise(res => { const r = http.get({ host: '127.0.0.1', port, path: '/', timeout: 4000 }, x => { x.resume(); res(true); }); r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false); }); });
async function pickPort(s, id) {
  const used = new Set(s.tickets.filter(t => t.wt && t.id !== id).map(t => t.wt.port));
  for (let p = WT_BASE_PORT; p < WT_BASE_PORT + 100; p++) if (!used.has(p) && await wtPortFree(p)) return p;
  die('Hết cổng trống từ ' + WT_BASE_PORT);
}
function wtBranch(t, opt = {}) {
  const b = (typeof opt.branch === 'string' && opt.branch) || (t.git && t.git.branch) || gitInfo(t).branch;
  if (!b) die(`TK${t.id}: chưa biết nhánh — ghi bằng set ${t.id} --branch <nhánh> (hoặc wt up ${t.id} --branch <nhánh>)`);
  return b.replace(/^origin\//, '');
}
// file cấu hình bị .gitignore (không có trong worktree) → chép từ checkout chính
function copyIgnoredConfig(dest) {
  for (const rel of ['FastdoServer/appsettings.FastdoServer.Blazor.json', 'FastdoServer.Blazor/appsettings.FastdoServer.Blazor.Development.json']) {
    const a = path.join(SERVER_DIR, rel), b = path.join(dest, rel);
    if (fs.existsSync(a) && !fs.existsSync(b)) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
  }
}
function pidsOnPort(port) {
  try { return [...new Set(execSync('netstat -ano', { encoding: 'utf8' }).split(/\r?\n/).filter(l => new RegExp(`[:.]${port}\\s+\\S+\\s+LISTENING`).test(l)).map(l => l.trim().split(/\s+/).pop()))]; } catch { return []; }
}
function killTree(pid) { try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); return true; } catch { return false; } }
function startServer(t) {
  const { spawn } = require('child_process');
  const logF = path.join(path.dirname(SERVER_DIR), `wt-${t.id}.log`);
  const out = fs.openSync(logF, 'a');
  const ch = spawn('dotnet', ['run', '--project', 'FastdoServer.Blazor', '--urls', `http://localhost:${t.wt.port}`], { cwd: t.wt.path, detached: true, stdio: ['ignore', out, out], windowsHide: true });
  ch.unref();
  t.wt.pid = ch.pid; t.wt.log = logF; t.wt.startedAt = new Date().toISOString();
  return ch.pid;
}
function stopServer(t) {
  const killed = [];
  if (t.wt && t.wt.pid && killTree(t.wt.pid)) killed.push(t.wt.pid);
  if (t.wt) for (const p of pidsOnPort(t.wt.port)) if (killTree(p)) killed.push(p);
  return killed;
}
async function waitUp(port, ms = 420000) { const end = Date.now() + ms; while (Date.now() < end) { if (await portUp(port)) return true; await new Promise(r => setTimeout(r, 5000)); } return false; }
async function wtUp(s, t, opt = {}) {
  const branch = wtBranch(t, opt);
  git(`fetch origin ${branch}`);
  const sha = git(`rev-parse --short origin/${branch}`);
  const dir = wtPath(t.id);
  if (!fs.existsSync(dir)) git(`worktree add --detach "${dir}" origin/${branch}`, SERVER_DIR, 600000);
  else if (git('rev-parse --short HEAD', dir) !== sha) git(`checkout --detach origin/${branch}`, dir);
  copyIgnoredConfig(dir);
  const port = (t.wt && t.wt.port) || (typeof opt.port === 'string' ? +opt.port : await pickPort(s, t.id));
  t.wt = { ...(t.wt || {}), path: dir, port, branch, commit: sha, at: new Date().toISOString() };
  if (!(await portUp(port))) startServer(t);
  t.git = { ...(t.git || {}), branch, commit: t.git && t.git.commit && t.git.branch === branch ? t.git.commit : sha };
  const url = `http://localhost:${port}`;
  if (!t.f.web || isLocal(t.f.web)) { t.f.web = url; t.env = 'Localhost'; }
  console.log(C.g(`▶ TK${t.id}: worktree ${dir} · nhánh ${branch} @${sha} · cổng ${port}`) + C.d(` (log: ${t.wt.log || '—'})`));
  return t.wt;
}
async function wtDown(s, t, opt = {}) {
  if (!t.wt) { console.log(C.d(`TK${t.id}: không có worktree`)); return false; }
  const dir = t.wt.path; const killed = stopServer(t);
  if (fs.existsSync(dir)) {
    let dirty = ''; try { dirty = git('status --porcelain', dir); } catch { }
    if (dirty && !opt.force) { console.log(C.y(`! TK${t.id}: worktree có thay đổi chưa commit — KHÔNG xoá (thêm --force nếu chắc chắn):\n${dirty.split('\n').slice(0, 8).join('\n')}`)); return false; }
    try { git(`worktree remove --force "${dir}"`); } catch (e) { console.log(C.y(`! Không xoá được ${dir}: ${String(e.stderr || e.message).split('\n')[0]} — thử lại sau khi đóng VS Code/Explorer đang mở thư mục này`)); return false; }
  }
  try { git('worktree prune'); } catch { }
  console.log(C.g(`✓ TK${t.id}: đã dừng server (${killed.join(', ') || 'không có tiến trình'}) và xoá worktree ${dir}`));
  delete t.wt; return true;
}
// Đồng bộ worktree với nhánh trên GitHub: có commit mới (VD vừa đẩy lên beta) → dừng server, checkout commit mới, chạy lại
async function wtSync(s, t) {
  const branch = t.wt.branch; git(`fetch origin ${branch}`);
  const remote = git(`rev-parse --short origin/${branch}`), local = git('rev-parse --short HEAD', t.wt.path);
  if (remote === local) return false;
  stopServer(t); git(`checkout --detach origin/${branch}`, t.wt.path); copyIgnoredConfig(t.wt.path);
  t.wt.commit = remote; t.git = { ...(t.git || {}), branch, commit: remote }; startServer(t);
  notify(s, t.id, `Nhánh ${branch} có commit mới ${local} → ${remote}: đã cập nhật worktree và chạy lại server cổng ${t.wt.port}`);
  return true;
}
CMD.wt = async ({ pos, opt }) => {
  const s = needState(); const sub = pos[0] || 'list';
  const pick = () => opt.all ? s.tickets.filter(t => t.wt) : pos.slice(1).map(id => getTicket(s, id));
  if (sub === 'up') {
    const ts = pos.slice(1).map(id => getTicket(s, id)); if (!ts.length) die('VD: wt up 1393 [--branch fix/ticket_1393] [--port 3101] [--wait]');
    for (const t of ts) { await wtUp(s, t, opt); saveState(s); if (opt.wait) console.log((await waitUp(t.wt.port)) ? C.g(`  ✓ http://localhost:${t.wt.port} đã chạy`) : C.y(`  ! Chưa lên sau 7 phút — xem log ${t.wt.log}`)); }
  } else if (sub === 'down') {
    for (const t of pick()) await wtDown(s, t, opt);
  } else if (sub === 'sync') {
    let n = 0; for (const t of (pos.length > 1 ? pick() : s.tickets.filter(t => t.wt))) if (t.wt && await wtSync(s, t)) n++;
    console.log(n ? C.g(`✓ Đã cập nhật ${n} worktree theo commit mới`) : C.d('Worktree đã ở commit mới nhất'));
  } else if (sub === 'clean') { // xoá worktree của ticket đã PASS toàn bộ testcase
    let n = 0;
    for (const t of s.tickets.filter(t => t.wt)) { const r = reportOf(t); if (r.verdict === 'PASS') { console.log(C.d(`TK${t.id}: ${r.pass}/${r.total} PASS → xoá worktree`)); if (await wtDown(s, t, opt)) { notify(s, t.id, `PASS ${r.pass}/${r.total} testcase → đã tự xoá worktree và dừng server cổng`); n++; } } }
    console.log(n ? C.g(`✓ Đã xoá ${n} worktree của ticket PASS toàn bộ`) : C.d('Chưa có ticket nào PASS toàn bộ để xoá worktree'));
  } else { // list
    const ws = s.tickets.filter(t => t.wt);
    if (!ws.length) console.log(C.d('Chưa có worktree nào. Tạo: wt up <id>'));
    for (const t of ws) console.log(`TK${t.id}  :${t.wt.port}  ${(await portUp(t.wt.port)) ? C.g('đang chạy') : C.y('chưa chạy')}  ${t.wt.branch}@${t.wt.commit}  ${t.wt.path}`);
  }
  saveState(s);
};

// =====================================================================
// TỔ CHỨC TEST — test Beta/Production nhiều ticket cùng lúc thì mỗi ticket 1 tổ chức riêng (dev1 & production dùng chung dữ liệu)
// =====================================================================
const DEFAULT_ORGS = ['Water Quality - NH3T TEAM', 'TEAM 1ST', 'DEMO FASTDO'];
const orgPool = s => (s.orgPool && s.orgPool.length ? s.orgPool : DEFAULT_ORGS);
const sharedEnv = t => !isLocal(t.f && t.f.web) && !/local/i.test(t.env || ''); // Beta / Production
// ticket đã test nhiều case đứng trước → được giữ tổ chức; ticket mới đổi sang tổ chức khác
const activeOnShared = s => s.tickets.filter(t => t.y && sharedEnv(t) && t.f && t.f.org && reportOf(t).verdict !== 'PASS').sort((a, b) => doneOf(ticketData(b)) - doneOf(ticketData(a)));
function orgConflicts(s, t, org) { return activeOnShared(s).filter(x => x.id !== t.id && x.f.org === org); }
function freeOrg(s, t) { const busy = new Set(activeOnShared(s).filter(x => x.id !== t.id).map(x => x.f.org)); return orgPool(s).find(o => !busy.has(o)) || null; }
CMD.orgs = ({ pos, opt }) => {
  const s = needState(); const sub = pos[0] || 'list';
  if (sub === 'add') { s.orgPool = [...new Set([...orgPool(s), ...pos.slice(1)])]; saveState(s); }
  else if (sub === 'rm') { s.orgPool = orgPool(s).filter(o => !pos.slice(1).includes(o)); saveState(s); }
  else if (sub === 'assign') { // ticket trùng tổ chức → ticket sau đổi sang tổ chức còn trống
    const seen = new Map(); let changed = 0;
    for (const t of activeOnShared(s)) {
      if (!seen.has(t.f.org)) { seen.set(t.f.org, t.id); continue; }
      const o = freeOrg(s, t);
      if (!o) { console.log(C.r(`✕ TK${t.id}: trùng tổ chức "${t.f.org}" với TK${seen.get(t.f.org)} nhưng hết tổ chức trống — thêm bằng: orgs add "<tên tổ chức>"`)); continue; }
      console.log(C.y(`↻ TK${t.id}: "${t.f.org}" (đang dùng cho TK${seen.get(t.f.org)}) → "${o}"`)); t.f.org = o; seen.set(o, t.id); changed++;
    }
    saveState(s); console.log(changed ? C.g(`✓ Đã đổi tổ chức cho ${changed} ticket`) : C.g('✓ Không có ticket nào trùng tổ chức'));
  }
  console.log(C.b('Danh sách tổ chức test: ') + orgPool(s).join(' · '));
  for (const o of orgPool(s)) { const u = activeOnShared(s).filter(t => t.f.org === o); console.log(`  ${pad(o, 30)} ${u.length ? (u.length > 1 ? C.r('TRÙNG: ') : '') + u.map(t => 'TK' + t.id + ' (' + (t.env || '?') + ')').join(', ') : C.d('trống')}`); }
};

// =====================================================================
// SOLUTION CỦA AI CODING — .workspace/**/ticket_<id>*.md trên nhánh ticket → beta/dev1 → production (CHỈ ĐỌC)
// =====================================================================
function findSolution(t) {
  const refs = []; const b = (t.git && t.git.branch) || gitInfo(t).branch;
  if (b) refs.push('origin/' + b.replace(/^origin\//, ''));
  refs.push('origin/beta/dev1', 'origin/production');
  const re = new RegExp('(^|/)ticket[_-]?0*' + t.id + '(?!\\d)[^/]*\\.md$', 'i');
  for (const ref of refs) {
    let files = [];
    try { files = execSync(`git ls-tree -r --name-only ${ref} -- .workspace`, { cwd: SERVER_DIR, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' }, stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/).filter(f => re.test(f)); } catch { continue; }
    if (files.length) return { ref, files };
  }
  return null;
}
CMD.solution = ({ pos, opt }) => {
  const s = needState(); const ids = pos.length ? pos : s.tickets.filter(t => t.y).map(t => t.id);
  try { git('fetch origin production beta/dev1', SERVER_DIR, 180000); } catch { }
  for (const id of ids) {
    const t = getTicket(s, id); const b = (t.git && t.git.branch) || gitInfo(t).branch;
    if (b) try { git(`fetch origin ${b.replace(/^origin\//, '')}`); } catch { }
    const f = findSolution(t);
    if (!f) {
      t.sol = { missing: true, at: new Date().toISOString() };
      console.log(C.y(`! TK${t.id}: chưa có file solution (.workspace/**/ticket_${t.id}*.md) trên ${b ? 'nhánh ' + b + ', ' : ''}beta/dev1, production.`) + C.d(' Lưu ý: .gitignore của fastdo-server đang bỏ qua ".workspace/tickets" — dev cần đẩy file solution (mở chặn hoặc đặt chỗ khác) thì AI Test mới đọc được.'));
      continue;
    }
    const out = path.join(ticketDir(t.id), `solution_${t.id}.md`); fs.mkdirSync(path.dirname(out), { recursive: true });
    const body = f.files.map(p => { const c = execSync(`git show ${f.ref}:${p}`, { cwd: SERVER_DIR, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } }); return `<!-- nguồn: ${f.ref}:${p} -->\n${c}`; }).join('\n\n---\n\n');
    fs.writeFileSync(out, `<!-- Bản chép CHỈ ĐỌC từ fastdo-server lúc ${new Date().toLocaleString('vi-VN')} — không sửa ở đây -->\n${body}`, 'utf8');
    const commit = git(`rev-parse --short ${f.ref}`);
    const old = t.sol && t.sol.commit;
    t.sol = { ref: f.ref, files: f.files, commit, local: out, at: new Date().toISOString() };
    if (old && old !== commit) notify(s, t.id, `Solution AI Coding cập nhật (${old} → ${commit}) — đọc lại trước khi test tiếp`);
    console.log(C.g(`✓ TK${t.id}: solution ${f.ref}:${f.files.join(', ')} @${commit}`) + C.d(` → ${out}`));
  }
  saveState(s);
};

CMD.report = ({ pos }) => {
  const s = needState(); const ids = pos.length ? pos.map(normId) : s.tickets.filter(t => t.y).map(t => t.id);
  if (!ids.length) die('Thiếu mã ticket. VD: report 1393');
  const txt = ids.map(id => reportOf(getTicket(s, id)).text).join('\n\n');
  console.log(txt);
  if (!process.argv.includes('--no-copy') && copy(txt)) console.log(C.d('\n(đã sao chép report)'));
};

CMD.help = () => console.log(`
${C.b('Weekly Ticket Management Skills — Pipeline ticket tuần')}

  init <tuần> [--from dd/mm --to dd/mm]     Tạo tuần mới (VD: init 09)
  add <id> --name "..." [--type Bug|Update --module ... --env Beta --deadline 18/11
           --group "..." --lane A]          Thêm ticket AI lấy từ quy trình/KH tuần
  list                                       Bước 1: danh sách ticket + tick ✓/✕
  approve <id...> | --all                    Tick ✓ chạy test (áp dụng ngay xuống các bước sau)
  reject  <id...> | --all                    Tick ✕ không test tuần này
  set <id> [--sheet URL --tab "..." --web URL|localhost --app LDPlayer --org "..." --qc Giang --mode 1|2|3|4]
           [--like <id>]                     Bước 1c: thông tin QC theo từng ticket
  accounts [--port 9222]                     Kiểm tra Fastdo / GitHub / Sheet (không đăng nhập hộ)
  start                                      Kiểm tra đủ thông tin → tạo lệnh chạy pipeline
  status                                     Bước 5–6: đã chạy/tổng, Fail/Pending/Suggest, link Sheet
  qc <id>                                    Danh sách "Cần QC check" kèm link đúng dòng
  retest <id> <case...> | --fail | --qc      Tạo lệnh retest đúng các case (VD: retest 1384 022 074)
  step <bước> [--ticket id --note "..."]  Báo bước đang chạy (1,1a,1b,1c,2..7) → highlight trên UI
  gate <id|--all> <2|3|4|6|7|all> ok|no|reset   QC chấp nhận / từ chối 1 bước của ticket (UI gọi lệnh này)
  set <id> --branch <nhánh> [--pr 123 --commit abc1234]   Bước 2: ghi nhánh/PR đang test
  prs                                        Bước 1: đọc PR GitHub (chỉ đọc) — PR lên production/beta, báo PR mới
  plan [--port 9222]                         Bước 1: đọc trạng thái công việc trên KH Tuần (tab Chrome debug, chỉ đọc)
  port [--from 3000]                         Localhost: báo cổng đang bị chiếm (tiến trình nào) + cổng trống kế tiếp, server đang khoá thư mục build
  report [<id>...]                           Bước 7: report nhanh (QC, môi trường, số case PASS, lỗi, ==> PASS/FAIL)
  wt up <id...> [--branch b --port 3101 --wait]   Localhost: worktree riêng fastdo-server-wt-<id> + cổng riêng, dotnet run
  wt list | sync [<id>] | down <id> [--force] | clean   sync = lấy commit mới của nhánh; clean = xoá worktree ticket PASS hết
  orgs [list | add "<tên>" | rm "<tên>" | assign]   Beta/Production: mỗi ticket 1 tổ chức riêng (set --org auto)
  solution [<id>...]                         Bước 2: đọc solution AI Coding .workspace/**/ticket_<id>*.md (chỉ đọc)
  seen                                       Đánh dấu đã xem thông báo trên Visual Pipeline
  step off [--ticket id]                     Kết thúc bước của 1 ticket (không có --ticket = tắt hết)
  ui [--open]                                Xuất Pipeline_Ticket_Tuan_Live.html với số liệu thật, in link
                                             (Ctrl + Click để mở); --open thì tự mở trình duyệt, --vscode mở tab trong VS Code

  Tuỳ chọn chung: --no-copy (không sao chép lệnh vào clipboard)
`);

CMD.init = ({ pos, opt }) => {
  const week = pos[0]; if (!week) die('Thiếu số tuần. VD: init 09');
  const old = loadState();
  if (old && old.week !== week && !opt.force) die(`Đang có tuần ${old.week}. Thêm --force để tạo tuần mới (file cũ được giữ ở weekly_state.week${old.week}.json)`);
  if (old && old.week !== week) fs.copyFileSync(STATE_FILE, path.join(HERE, `weekly_state.week${old.week}.json`));
  if (old && old.week === week) { console.log(C.y(`Tuần ${week} đã có, giữ nguyên.`)); return; }
  saveState({ week, from: opt.from || '', to: opt.to || '', tickets: [] });
  console.log(C.g(`✓ Đã tạo KH Tuần ${week}`) + C.d(` → ${STATE_FILE}`));
};

CMD.add = ({ pos, opt }) => {
  const s = needState(); const id = normId(pos[0] || ''); if (!id) die('Thiếu mã ticket');
  let t = s.tickets.find(x => x.id === id);
  if (!t) { t = { id, y: 0, f: { app: 'LDPlayer' } }; s.tickets.push(t); }
  const map = { name: 'name', type: 'type', module: 'mod', env: 'env', deadline: 'dl', group: 'grp', lane: 'lane', warn: 'warn' };
  for (const [k, v] of Object.entries(map)) if (opt[k] !== undefined && opt[k] !== true) t[v] = opt[k];
  if (!t.name) t.warn = t.warn || 'Thiếu mô tả trên quy trình, cần hỏi PO';
  saveState(s); console.log(C.g(`✓ TK${id}`) + ` ${t.name || '(chưa có mô tả)'}`);
};

CMD.list = () => {
  const s = needState();
  console.log(C.b(`\nBước 1 · KH Tuần ${s.week}`) + C.d(`  ${s.from || ''}${s.to ? '–' + s.to : ''}`));
  console.log(C.d(pad('Test', 6) + pad('Ticket', 8) + pad('Tên', 34) + pad('Loại', 8) + pad('Môi trường', 12) + 'Hạn'));
  for (const t of s.tickets) {
    console.log((t.y ? C.g(pad('✓', 6)) : C.r(pad('✕', 6))) + pad('TK' + t.id, 8) + pad(t.name || '(chưa có mô tả)', 34) + pad(t.type || '—', 8) + pad(t.env || '—', 12) + (t.dl || '—')
      + (t.warn ? '  ' + C.y('! ' + t.warn) : ''));
  }
  const ap = s.tickets.filter(t => t.y);
  console.log(`\n${C.g('✓ ' + ap.length + ' chạy test')}  ${C.r('✕ ' + (s.tickets.length - ap.length) + ' không test')}`);
  if (ap.length) {
    const L = {}; ap.forEach(t => (L[t.lane || '?'] = L[t.lane || '?'] || []).push(t.id));
    console.log(C.d('1b (tự động): ') + Object.keys(L).sort().map(k => `Luồng ${k}: ${L[k].join(' → ')}`).join(' · '));
  }
};

function toggle(v) {
  return ({ pos, opt }) => {
    const s = needState();
    const ids = opt.all ? s.tickets.map(t => t.id) : pos.map(normId);
    if (!ids.length) die('Thiếu mã ticket');
    for (const id of ids) {
      const t = getTicket(s, id);
      if (v && t.warn && !opt.force) { console.log(C.y(`! TK${id}: ${t.warn} — bỏ qua (thêm --force nếu PO đã bổ sung)`)); continue; }
      t.y = v; console.log((v ? C.g('✓') : C.r('✕')) + ` TK${id}`);
    }
    saveState(s); CMD.list();
  };
}
CMD.approve = toggle(1);
CMD.reject = toggle(0);

CMD.set = async ({ pos, opt }) => {
  const s = needState(); const t = getTicket(s, pos[0]);
  if (opt.like) { const src = getTicket(s, opt.like); t.f = { ...src.f }; if (src.gid != null) t.gid = src.gid; }
  for (const [k, v] of Object.entries(FIELDS)) if (opt[k] !== undefined && opt[k] !== true) t.f[v] = String(opt[k]);
  if (t.f.web) t.f.web = normWeb(t.f.web);
  if (t.f.mode !== undefined) { t.f.mode = String(t.f.mode).replace(/[\[\]\s]/g, ''); if (!MODE_TXT[t.f.mode]) die('Chế độ phải là 1, 2, 3 hoặc 4'); console.log(C.d('  Chế độ TK' + t.id + ': ' + MODE_TXT[t.f.mode])); }
  if (typeof opt.plan === 'string') t.plan = { st: opt.plan, at: new Date().toISOString() };
  for (const k of ['branch', 'pr', 'commit']) if (typeof opt[k] === 'string') { t.git = t.git || {}; t.git[k] = opt[k].replace(/^#/, ''); }
  if (t.git && (opt.branch || opt.pr || opt.commit)) console.log(C.g(`  Bước 2 · TK${t.id}: nhánh ${t.git.branch || '—'}${t.git.pr ? ' · PR #' + t.git.pr : ''}${t.git.commit ? ' · ' + t.git.commit : ''}`));
  if (isLocal(t.f.web)) { if (t.env !== 'Localhost') console.log(C.d(`  Môi trường TK${t.id}: ${t.env || '—'} → Localhost`)); t.env = 'Localhost'; console.log(C.d('  ' + LOCAL_STEPS(t.f.web))); }
  // Beta/Production dùng chung dữ liệu: mỗi ticket đang test 1 tổ chức riêng — trùng thì tự chọn tổ chức còn trống
  if (t.f.org === 'auto') { const o = freeOrg(s, t); if (!o) die('Hết tổ chức trống — thêm bằng: orgs add "<tên tổ chức>"'); t.f.org = o; console.log(C.g(`  Tổ chức TK${t.id}: tự chọn "${o}"`)); }
  else if (t.y && t.f.org && sharedEnv(t) && !opt.share) {
    const cf = orgConflicts(s, t, t.f.org);
    if (cf.length) { const o = freeOrg(s, t); if (o) { console.log(C.y(`↻ TK${t.id}: tổ chức "${t.f.org}" đang dùng cho ${cf.map(x => 'TK' + x.id).join(', ')} (Beta/Production chung dữ liệu) → tự chọn "${o}"`)); t.f.org = o; } else console.log(C.r(`✕ TK${t.id}: trùng tổ chức "${t.f.org}" với ${cf.map(x => 'TK' + x.id).join(', ')} và hết tổ chức trống — thêm bằng: orgs add "<tên>"`)); }
  }
  const miss = missing(t);
  for (const k of miss) console.log(C.y(`! TK${t.id}: ${LABEL[k]} ${t.f[k] ? 'chưa đúng định dạng' : 'còn trống'}`));
  if (!miss.includes('sh') && t.f.tab && (opt.sheet || opt.tab || opt.like || t.gid == null)) await resolveGid(t);
  saveState(s);
  console.log(miss.length ? C.y(`TK${t.id}: thiếu ${miss.length} mục`) : C.g(`✓ TK${t.id}: đủ thông tin`) + C.d(t.gid != null ? ` (gid ${t.gid})` : ''));
};

CMD.accounts = async ({ opt }) => {
  const acc = await checkAccounts(opt.port || 9222);
  const perm = { fd: 'Chỉ đọc', gh: 'Chỉ đọc', gs: 'Đọc + ghi' };
  for (const a of acc) console.log(`${a.ok ? C.g('✓') : C.r('✕')} ${pad(a.name, 14)}${pad(perm[a.k], 11)}${a.msg}`);
  console.log(C.d('\nKhông nhập mật khẩu ở đây — QC tự đăng nhập trên trang chính thức.'));
  return acc;
};

CMD.start = async () => {
  const s = needState(); const ap = s.tickets.filter(t => t.y);
  if (!ap.length) die('Chưa tick ✓ ticket nào. Chạy: approve <id>');
  const bad = ap.filter(t => missing(t).length);
  if (bad.length) { bad.forEach(t => console.log(C.r(`✕ TK${t.id} thiếu: ${missing(t).map(k => LABEL[k]).join(', ')}`))); die('Điền bằng: set <id> --sheet ... --tab ... --web ... --org ... --qc ...'); }
  // trước khi chạy: không để 2 ticket Beta/Production test chung 1 tổ chức
  { const seen = new Map(); let ch = 0; for (const t of activeOnShared(s)) { if (seen.has(t.f.org)) { const o = freeOrg(s, t); if (o) { console.log(C.y(`↻ TK${t.id}: trùng tổ chức "${t.f.org}" với TK${seen.get(t.f.org)} → "${o}"`)); t.f.org = o; ch++; } else die(`TK${t.id} trùng tổ chức "${t.f.org}" với TK${seen.get(t.f.org)} và hết tổ chức trống — orgs add "<tên>"`); } seen.set(t.f.org, t.id); } if (ch) saveState(s); }
  const acc = await checkAccounts();
  const fd = acc.find(a => a.k === 'fd');
  if (!fd.ok) console.log(C.y('! ' + fd.msg + ' (AI sẽ dừng ở bước 1 cho tới khi đăng nhập)'));
  emitPrompt(`Chạy Pipeline ticket tuần theo "${path.join(HERE, 'Prompt_Pipeline_Ticket_Tuan.md')}".
KH Tuần ${s.week}. Chỉ test các ticket đã tick: ${ap.map(t => 'TK' + t.id).join(', ')}. Không test: ${s.tickets.filter(t => !t.y).map(t => 'TK' + t.id).join(', ') || 'không có'}. 1a, 1b chạy tự động.
Thông tin QC theo từng ticket:
${ap.map(t => `- TK${t.id}: Sheet ${t.f.sh} | Tab ${t.f.tab} | Web ${t.f.web} | App ${t.f.app || 'LDPlayer'} | Tổ chức ${t.f.org} | QC ${t.f.qcn} | Chế độ ${MODE_TXT[t.f.mode || 4]}` + (isLocal(t.f.web) ? `\n  → ${LOCAL_STEPS(t.f.web)}` : '')).join('\n')}`);
};

CMD.status = () => {
  const s = needState(); const ap = s.tickets.filter(t => t.y);
  if (!ap.length) die('Chưa tick ✓ ticket nào');
  let ran = 0, all = 0;
  console.log(C.b(`\nBước 5–6 · Chạy test và retest — KH Tuần ${s.week}`));
  for (const t of ap) {
    const d = ticketData(t); const done = doneOf(d); ran += done; all += d.total;
    const pct = d.total ? Math.round(done / d.total * 100) : 0;
    const w = 24, fill = d.total ? Math.round(done / d.total * w) : 0;
    console.log(`\n${C.b('TK' + t.id)} ${t.name || ''} ${C.d(`· ${t.env || '—'} · Lần ${d.lan || '—'}${t.lane ? ' · Luồng ' + t.lane : ''}`)}`);
    console.log('  Duyệt: ' + GATES.map(x => { const v = gateOf(t, x); return (v === 'ok' ? C.g('✓') : v === 'no' ? C.r('✕') : C.d('○')) + ' ' + x + ' ' + GATE_NAME[x]; }).join('  '));
    if (t.git && t.git.branch) console.log(C.d(`  Nhánh: ${t.git.branch}${t.git.pr ? ' · PR #' + t.git.pr : ''}${t.git.commit ? ' · ' + t.git.commit : ''}`));
    if (!d.exists) { console.log(C.d(`  Chưa có results_${t.id}.json — chưa chạy test`)); continue; }
    console.log(`  ${C.b(done + '/' + d.total)} testcase đã chạy · ${pct}%  [${'█'.repeat(fill)}${'░'.repeat(w - fill)}]`);
    console.log(`  ${C.g('DONE ' + (d.n.DONE || 0))}  ${C.r('Fail ' + (d.n.Fail || 0))}  ${C.y('Suggest ' + (d.n.Suggest || 0))}  ${C.d('Pending ' + (d.n.Pending || 0))}  ${C.d('Chưa chạy ' + (d.total - done))}`);
    const l = link(t, d.r0, d.r1); if (l) console.log(C.d(`  Testcase dòng ${d.r0}–${d.r1}: `) + l);
    console.log(d.qc.length ? C.y(`  ! Cần QC check (${d.qc.length}) → node ${path.basename(__filename)} qc ${t.id}`) : C.g('  ✓ Không có case cần QC check'));
  }
  console.log(`\n${C.b('Tổng tuần: ' + ran + '/' + all)} testcase đã chạy`);
  const notProd = ap.filter(t => !/prod/i.test(t.env || ''));
  if (notProd.length) console.log(C.d(`Bước 7: ${notProd.map(t => 'TK' + t.id).join(', ')} chưa test trên Production → chưa thể đóng ticket`));
};

CMD.qc = ({ pos }) => {
  const s = needState(); const t = getTicket(s, pos[0]); const d = ticketData(t);
  if (!d.exists) die(`Chưa có results_${t.id}.json`);
  console.log(C.b(`\nTK${t.id} · Cần QC check (${d.qc.length})`) + C.d(`  ${t.env || ''} · Lần ${d.lan} → retest ghi vào TEST LẦN ${d.lan + 1}`));
  const col = { Fail: C.r, Pending: C.d, Suggest: C.y };
  for (const q of d.qc) {
    console.log(`  ${pad(q.num, 5)}${(col[q.status] || (x => x))(pad(q.status, 9))}${q.title}`);
    console.log(C.d(`       ${q.reason}`));
    const l = link(t, q.row); if (l) console.log(C.d(`       Dòng ${q.row}: `) + l);
  }
  console.log(C.d(`\nRetest: node ${path.basename(__filename)} retest ${t.id} <mã case...>   |   --fail   |   --qc`));
};

CMD.retest = ({ pos, opt }) => {
  const s = needState(); const t = getTicket(s, pos[0]); const d = ticketData(t);
  let nums = pos.slice(1).map(x => x.replace(/^TK\d+_/i, '').padStart(3, '0'));
  if (opt.fail) nums = d.qc.filter(q => q.status === 'Fail').map(q => q.num);
  if (opt.qc) nums = d.qc.map(q => q.num);
  if (!nums.length) die('Chọn case: retest <id> 022 074   hoặc --fail / --qc');
  const unknown = d.exists ? nums.filter(n => !d.cases[`TK${t.id}_${n}`]) : [];
  if (unknown.length) console.log(C.y(`! Không thấy trong results_${t.id}.json: ${unknown.join(', ')} (vẫn tạo lệnh)`));
  const lan = (d.lan || 0) + 1;
  emitPrompt(`Retest ${nums.map(n => `TK${t.id}_${n}`).join(', ')} lần ${lan} trên ${t.env || '(môi trường?)'} (${t.f.web || 'URL chưa điền'}, tổ chức ${t.f.org || 'chưa điền'}, QC ${t.f.qcn || '—'}).
Chỉ chạy đúng các case này, ghi vào nhóm cột TEST LẦN ${lan} trên Sheet ${t.f.sh || '(chưa điền)'} tab "${t.f.tab || ''}", rồi saveRun vào results_${t.id}.json (lan ${lan}).`);
};

const STEPS = ['1', '1a', '1b', '1c', '2', '3', '4', '5', '6', '7'];

// ---------- Localhost: dò cổng trống + server đang chạy ----------
const net = require('net');
const portFree = port => new Promise(res => { const sv = net.createServer().once('error', () => res(false)).once('listening', () => sv.close(() => res(true))).listen(port, '127.0.0.1'); });
function psJson(cmd) { try { const o = execSync(`powershell -NoProfile -Command "${cmd} | ConvertTo-Json -Compress"`, { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); if (!o) return []; const j = JSON.parse(o); return Array.isArray(j) ? j : [j]; } catch { return []; } }
function portOwner(port) {
  const c = psJson(`Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1 OwningProcess`)[0];
  if (!c) return null;
  const p = psJson(`Get-CimInstance Win32_Process -Filter 'ProcessId=${c.OwningProcess}' | Select-Object ProcessId,Name,ExecutablePath,@{n='Start';e={$_.CreationDate.ToString('HH:mm dd/MM')}}`)[0];
  return p ? { pid: p.ProcessId, name: p.Name, exe: p.ExecutablePath || '', start: p.Start } : { pid: c.OwningProcess };
}
// Server Fastdo đang chạy từ thư mục build của repo (khoá DLL → dotnet build/run lại sẽ lỗi MSB3027)
function runningServers(dir) {
  const want = path.resolve(dir).toLowerCase();
  return psJson(`Get-CimInstance Win32_Process -Filter \\"Name='FastdoServer.Blazor.exe'\\" | Select-Object ProcessId,ExecutablePath,@{n='Start';e={$_.CreationDate.ToString('HH:mm dd/MM')}}`)
    .filter(p => (p.ExecutablePath || '').toLowerCase().startsWith(want));
}
CMD.port = async ({ opt }) => {
  const from = +(opt.from || 3000), to = from + 20, dir = opt.dir || SERVER_DIR;
  const owner = portOwner(from);
  if (owner) console.log(C.y(`! Cổng ${from} đang bị dùng: ${owner.name || 'PID'} (PID ${owner.pid}${owner.start ? ', bật lúc ' + owner.start : ''})`) + C.d(owner.exe ? '\n  ' + owner.exe : ''));
  else console.log(C.g(`✓ Cổng ${from} đang trống`));
  let free = null; for (let p = from; p <= to && !free; p++) if (await portFree(p) && !portOwner(p)) free = p;
  const srv = runningServers(dir);
  let branch = ''; try { branch = execSync(`git -C "${dir}" branch --show-current`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { }
  if (srv.length) {
    console.log(C.y(`! Đang có ${srv.length} FastdoServer.Blazor chạy từ ${dir} (nhánh hiện tại của repo: ${branch || '?'})`));
    srv.forEach(p => console.log(C.d(`  PID ${p.ProcessId} · bật lúc ${p.Start}`)));
    console.log(C.d('  → Cùng thư mục build: dotnet build/run lại sẽ lỗi "file is locked" dù đổi cổng. Dùng worktree riêng cho nhánh khác (xem gợi ý bên dưới).'));
  }
  if (!free) die(`Không có cổng trống trong ${from}–${to}`);
  console.log(C.g(`→ Cổng trống: ${free}`) + C.d(`  (URL test: http://localhost:${free})`));
  console.log(C.d(`  Chạy:  dotnet run --project FastdoServer.Blazor --urls http://localhost:${free}`));
  if (srv.length) console.log(C.d(`  Nhánh khác:  git -C "${dir}" worktree add "${dir}-wt${free}" <nhánh ticket>  →  cd "${dir}-wt${free}" rồi dotnet run như trên`));
  if (opt.json) console.log('JSON ' + JSON.stringify({ busy: owner, free, url: 'http://localhost:' + free, servers: srv, branch }));
};
const GATES = ['2', '3', '4', '6', '7'];
const ghBin = () => ['C:/Program Files/GitHub CLI/gh.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs/GitHub CLI/gh.exe')].find(p => fs.existsSync(p)) || 'gh';
function repoOf() {
  try { const u = execSync(`git -C "${SERVER_DIR}" remote get-url origin`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); const m = u.match(/github\.com[/:]([^/]+\/[^/.]+)/); if (m) return m[1]; } catch { }
  return 'Fastdo-Team/fastdo-server';
}
const pad2 = n => String(n).padStart(2, '0');
const hhmm = d => { d = new Date(d); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); };
const BASE_NAME = b => b === 'production' ? 'production' : /^beta|dev1/.test(b) ? 'beta (' + b + ')' : b;
function notify(s, id, text) { s.notices = s.notices || []; s.notices.push({ at: new Date().toISOString(), id, text }); s.notices = s.notices.slice(-30); console.log(C.y('🔔 TK' + id + ': ' + text)); }

// Bước 1 · PR trên GitHub (CHỈ ĐỌC: gh pr list)
CMD.prs = async ({ opt }) => {
  const s = needState(); const repo = repoOf();
  let list;
  try { list = JSON.parse(execSync(`"${ghBin()}" pr list -R ${repo} --state all --limit ${opt.limit || 300} --json number,title,state,baseRefName,headRefName,mergedAt,updatedAt,url`, { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (e) { die('Không đọc được PR GitHub: ' + String(e.stderr || e.message).trim().split('\n')[0] + ' (cần gh auth login)'); }
  let found = 0;
  for (const t of s.tickets) {
    const re = new RegExp('ticket[-_ ]?0*' + t.id + '(?!\\d)', 'i');
    const hit = list.filter(p => re.test(p.headRefName) || re.test(p.title))
      .map(p => ({ n: p.number, base: p.baseRefName, head: p.headRefName, st: p.state, merged: p.mergedAt || null, url: p.url, title: p.title.slice(0, 120) }));
    const old = Object.fromEntries((t.prs || []).map(p => [p.n, p]));
    for (const p of hit) {
      const o = old[p.n];
      if (!o) notify(s, t.id, `PR #${p.n} → ${BASE_NAME(p.base)} ${p.st === 'MERGED' ? 'đã MERGE' : p.st === 'OPEN' ? 'vừa được tạo (đang mở)' : 'đã đóng'}`);
      else if (o.st !== p.st) notify(s, t.id, `PR #${p.n} → ${BASE_NAME(p.base)}: ${o.st} → ${p.st === 'MERGED' ? 'đã MERGE' : p.st}`);
    }
    if (hit.length) found++;
    t.prs = hit;
  }
  s.prsAt = new Date().toISOString(); saveState(s);
  console.log(C.g(`✓ Đã đọc ${list.length} PR gần nhất của ${repo} — ${found} ticket tuần ${s.week} có PR`));
  for (const t of s.tickets.filter(t => t.prs && t.prs.length)) console.log(`  TK${t.id}: ` + t.prs.map(p => `#${p.n} → ${BASE_NAME(p.base)} · ${p.st}`).join(' | '));
  // nhánh ticket có commit mới (VD vừa đẩy lên beta) → tự cập nhật worktree đang chạy local
  if (!opt['no-wt']) { let n = 0; for (const t of s.tickets.filter(t => t.wt)) { try { if (await wtSync(s, t)) n++; } catch (er) { console.log(C.y('! wt sync TK' + t.id + ': ' + String(er.message).split(/\r?\n/)[0])); } } if (n) { saveState(s); console.log(C.g('✓ Đã cập nhật ' + n + ' worktree theo commit mới')); } }
};

// Bước 1 · trạng thái công việc trên KH Tuần (CHỈ ĐỌC: đọc bảng trên tab Chrome debug đã mở, không bấm)
const PLAN_URL = 'https://work.fastdo.vn/work/plan/260129085329S138GL3X844JV8Y9IE50';
CMD.plan = async ({ opt }) => {
  const s = needState(); const port = opt.port || 9222;
  let pup; for (const p of [path.join(ROOT || '', 'Test-automation/node_modules/puppeteer-core'), 'puppeteer-core']) { try { pup = require(p); break; } catch { } }
  if (!pup) die('Không có puppeteer-core (Automation/Test-automation/node_modules)');
  let b; try { b = await pup.connect({ browserURL: 'http://127.0.0.1:' + port, defaultViewport: null }); } catch { die('Không kết nối Chrome debug cổng ' + port + ' — mở Chrome debug và đăng nhập Fastdo'); }
  try {
    const pg = (await b.pages()).find(p => p.url().startsWith(PLAN_URL));
    if (!pg) die('Chưa mở tab KH Tuần trên Chrome debug: ' + PLAN_URL + '/detail');
    const rows = await pg.evaluate(() => {
      const ths = [...document.querySelectorAll('th')].map(t => t.innerText.trim());
      const iSt = ths.findIndex(x => x === 'Trạng thái'), iDue = ths.findIndex(x => x === 'Dự kiến');
      return [...document.querySelectorAll('tr')].map(tr => { const c = [...tr.children].map(td => td.innerText.trim()); const m = c.join(' ').match(/\[(\d{3,5})\]/); return m && iSt >= 0 ? { id: m[1], st: (c[iSt] || '').split('\n')[0].trim(), due: (c[iDue] || '').replace(/event|\s+/g, ' ').trim() } : null; }).filter(Boolean);
    });
    const map = Object.fromEntries(rows.map(r => [r.id, r]));
    let n = 0, miss = [];
    for (const t of s.tickets) {
      const r = map[t.id]; if (!r || !r.st) { miss.push(t.id); continue; }
      if (t.plan && t.plan.st && t.plan.st !== r.st) notify(s, t.id, `Trạng thái KH Tuần: ${t.plan.st} → ${r.st}`);
      t.plan = { st: r.st, due: r.due, at: new Date().toISOString() }; n++;
    }
    s.planAt = new Date().toISOString(); saveState(s);
    console.log(C.g(`✓ Trạng thái KH Tuần: cập nhật ${n}/${s.tickets.length} ticket`) + (miss.length ? C.y(`  · chưa thấy trên bảng (nhóm tuần đang thu gọn?): ${miss.map(x => 'TK' + x).join(', ')}`) : ''));
  } finally { b.disconnect(); }
};
CMD.seen = () => { const s = needState(); s.noticesSeen = new Date().toISOString(); saveState(s); console.log(C.g('✓ Đã đánh dấu đã xem thông báo')); };
const GATE_NAME = { 2: 'Nhánh / code change', 3: 'Test Scenario', 4: 'Testcase', 6: 'Kết quả test', 7: 'Hoàn thành' };
CMD.gate = ({ pos, opt }) => {
  const s = needState();
  const args = opt.all ? pos : pos.slice(1);
  const ids = opt.all ? s.tickets.filter(t => t.y).map(t => t.id) : [normId(pos[0] || '')];
  const [st, val] = args.map(x => String(x || '').toLowerCase());
  if (!ids[0]) die('Thiếu mã ticket. VD: gate 1393 3 ok');
  const steps = st === 'all' ? GATES : [st];
  if (!steps.every(x => GATES.includes(x))) die('Bước duyệt phải là ' + GATES.join(', ') + ' hoặc all');
  if (!['ok', 'no', 'reset'].includes(val)) die('Giá trị phải là ok | no | reset');
  for (const id of ids) {
    const t = getTicket(s, id); t.g = t.g || {};
    for (const x of steps) { if (val === 'reset') delete t.g[x]; else t.g[x] = { v: val, at: new Date().toISOString(), note: typeof opt.note === 'string' ? opt.note : undefined }; }
    console.log((val === 'ok' ? C.g('✓') : val === 'no' ? C.r('✕') : C.d('○')) + ` TK${t.id} · ${steps.map(x => 'bước ' + x + ' (' + GATE_NAME[x] + ')').join(', ')}: ${val === 'ok' ? 'QC chấp nhận' : val === 'no' ? 'QC từ chối' : 'chờ duyệt'}`);
  }
  saveState(s);
};
const gateOf = (t, x) => (t.g && t.g[x] && t.g[x].v) || '';

let REFS = null; // nhánh trong fastdo-server (chỉ đọc)
function gitInfo(t) {
  const out = { ...(t.git || {}) };
  try {
    if (!fs.existsSync(path.join(SERVER_DIR, '.git'))) return out;
    const run = c => execSync(`git -C "${SERVER_DIR}" ${c}`, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (REFS === null) REFS = { list: run('for-each-ref --format=%(refname:short) refs/heads refs/remotes/origin').split(/\r?\n/).filter(Boolean), cur: run('branch --show-current') };
    if (!out.branch) {
      const re = new RegExp('(^|[^0-9])' + t.id + '([^0-9]|$)');
      const hit = REFS.list.filter(r => re.test(r) && !/HEAD$/.test(r));
      const b = hit.find(r => !r.startsWith('origin/')) || hit[0];
      if (b) { out.branch = b.replace(/^origin\//, ''); out.auto = 1; out.ref = b; }
    }
    if (out.branch && !out.commit) try { out.commit = run(`rev-parse --short "${out.ref || out.branch}"`); } catch { }
    if (out.branch) out.cur = REFS.cur === out.branch ? 1 : 0;
  } catch { }
  return out;
}
function scenarioOf(t) {
  const f = path.join(ticketDir(t.id), `Test_Scenario_${t.id}.md`);
  if (!fs.existsSync(f)) return null;
  const txt = fs.readFileSync(f, 'utf8');
  return { file: f, text: txt.length > 60000 ? txt.slice(0, 60000) + '\n\n…(đã cắt bớt, mở file để xem đủ)' : txt, mtime: fs.statSync(f).mtime.toISOString() };
}
CMD.step = async ({ pos, opt }) => {
  const s = needState(); const st = String(pos[0] || '').toLowerCase();
  if (!st) die('Thiếu bước. VD: step 5 --ticket 1384 --note "Chạy 20 case trên Beta"');
  s.runs = s.runs || {};
  if (s.run && s.run.step && s.run.ticket) { s.runs[s.run.ticket] = { step: s.run.step, note: s.run.note, at: s.run.at }; s.run = null; } // dữ liệu cũ
  const ticket = opt.ticket ? normId(opt.ticket) : undefined;
  if (ticket && !s.tickets.some(t => t.id === ticket)) die('Không có TK' + ticket + ' trong tuần ' + s.week);
  const now = new Date().toISOString();
  if (['off', 'done', 'stop', 'xong'].includes(st)) {
    if (ticket) { // chỉ tắt ticket này, các ticket khác vẫn đang chạy
      const p = s.runs[ticket]; delete s.runs[ticket];
      if (p) s.runLast = { step: p.step, ticket, at: now };
      console.log(C.g(`✓ TK${ticket}: đã tắt trạng thái đang chạy${p ? ' (bước ' + p.step + ')' : ''}`) + C.d(` · còn ${Object.keys(s.runs).length} ticket đang chạy`));
    } else { // tắt hết
      const p = (s.run && s.run.step) ? { step: s.run.step } : Object.entries(s.runs).map(([id, r]) => ({ step: r.step, ticket: id }))[0];
      if (p) s.runLast = { ...p, at: now };
      s.run = null; s.runs = {};
      console.log(C.g('✓ Đã tắt trạng thái đang chạy của mọi ticket'));
    }
  } else {
    if (!STEPS.includes(st)) die('Bước không hợp lệ: ' + st + ' (dùng ' + STEPS.join(', ') + ')');
    const rec = { step: st, note: typeof opt.note === 'string' ? opt.note : undefined, at: now };
    if (ticket) s.runs[ticket] = rec; else s.run = rec;
    const par = Object.keys(s.runs).length;
    console.log(C.g('▶ Đang chạy bước ' + st + (ticket ? ' · TK' + ticket : '') + (rec.note ? ' — ' + rec.note : '')) + (par > 1 ? C.d(` · ${par} ticket chạy song song`) : ''));
  }
  saveState(s);
  await CMD.ui();
};

CMD.ui = async () => {
  const s = needState();
  if (!fs.existsSync(UI_TEMPLATE)) die('Không thấy Pipeline_Ticket_Tuan_UI.html');
  // chỉ ghi lại state khi vừa lấy thêm gid (tránh đè lên thay đổi của phiên Claude đang chạy song song)
  const needGid = s.tickets.filter(t => t.y && t.gid == null && !missing(t).includes('sh'));
  for (const t of needGid) await resolveGid(t);
  const got = needGid.filter(t => t.gid != null);
  if (got.length) { const cur = loadState(); for (const t of got) { const c = cur.tickets.find(x => x.id === t.id); if (c && c.gid == null) c.gid = t.gid; } saveState(cur); }
  const acc = await checkAccounts();
  const A = [
    { k: 'fd', ic: 'building', name: 'Fastdo', use: 'Bước 1 · quy trình + KH tuần', perm: 'ro', permT: 'Chỉ đọc', how: 'Đăng nhập trên Chrome debug 9222', url: 'https://work.fastdo.vn' },
    { k: 'gh', ic: 'brand-github', name: 'GitHub', use: 'Bước 2 · nhánh, PR, code', perm: 'ro', permT: 'Chỉ đọc', how: 'Chạy trong terminal:', cmd: 'gh auth login' },
    { k: 'gs', ic: 'table', name: 'Google Sheet', use: 'Bước 4–6 · testcase, kết quả', perm: 'rw', permT: 'Đọc + ghi', how: 'Sheet chia sẻ Editor cho Service Account' }
  ].map(a => ({ ...a, st: acc.find(x => x.k === a.k).ok ? 1 : 0 }));
  const T = s.tickets.map(t => {
    const d = ticketData(t);
    return { id: t.id, name: t.name || '(chưa có mô tả)', mod: t.mod || '—', type: t.type || '—', grp: t.grp || 'khác', lane: t.lane || '?', env: t.env || '—', dl: t.dl || '—',
      y: t.y ? 1 : 0, warn: t.warn || undefined, gid: t.gid, r0: d.r0, r1: d.r1, lan: d.lan || 1, real: 1, total: d.total, n: d.n, f: { app: 'LDPlayer', ...t.f },
      qc: d.qc.map(q => [q.num, q.status, q.title, q.reason, q.row]),
      g: Object.fromEntries(GATES.map(x => [x, gateOf(t, x)])), git: t.y ? gitInfo(t) : {}, sc: t.y ? scenarioOf(t) : null, prs: t.prs || [], plan: t.plan || null, rep: t.y ? reportOf(t) : null, wt: t.wt ? { port: t.wt.port, branch: t.wt.branch, commit: t.wt.commit } : null, sol: t.sol ? { missing: !!t.sol.missing, ref: t.sol.ref, files: t.sol.files, commit: t.sol.commit, local: t.sol.local } : null, orgDup: t.y && t.f && t.f.org && sharedEnv(t) ? orgConflicts(s, t, t.f.org).map(x => x.id) : [] };
  });
  let html = fs.readFileSync(UI_TEMPLATE, 'utf8');
  const swap = (re, val, name) => { if (!re.test(html)) die(`Không tìm thấy khối ${name} trong template UI`); html = html.replace(re, val); };
  swap(/const A=\[[\s\S]*?\n\];/, 'const A=' + JSON.stringify(A) + ';', 'A');
  swap(/const T=\[[\s\S]*?\n\];/, 'const T=' + JSON.stringify(T) + ';', 'T');
  html = html.replace("const CLI_PATH='__CLI__';", "const CLI_PATH=" + JSON.stringify(__filename.replace(/\\/g, '/')) + ";");
  const NOTI = { list: (s.notices || []).filter(n => !s.noticesSeen || n.at > s.noticesSeen).slice(-8), prsAt: s.prsAt || null, planAt: s.planAt || null };
  html = html.replace('const NOTI=null;', 'const NOTI=' + JSON.stringify(NOTI) + ';');
  swap(/const RUN=null;/,'const RUN=' + JSON.stringify((() => { const t = { ...(s.runs || {}) }; let g = s.run && s.run.step ? s.run : null; if (g && g.ticket) { t[g.ticket] = g; g = null; } const last = s.runLast || (s.run && s.run.last ? { step: s.run.last, ticket: s.run.ticket, at: s.run.at } : null); return { g, t, last }; })()) + ';', 'RUN');
  html = html.replace('edit#gid=${GID}', 'edit#gid=${t.gid??GID}')
    .replaceAll('const row=t.r0+parseInt(q[0],10)-1', 'const row=q[4]||t.r0+parseInt(q[0],10)-1')
    .replace(/KH Tuần 09 · 16\/11–22\/11/g, `KH Tuần ${s.week}${s.from ? ' · ' + s.from + (s.to ? '–' + s.to : '') : ''}`)
    .replace(/KH Tuần 09/g, `KH Tuần ${s.week}`)
    .replace('<title>Pipeline ticket tuần</title>', `<title>Pipeline tuần ${s.week}</title>`);
  fs.writeFileSync(UI_OUT, html, 'utf8');
  const url = 'file:///' + encodeURI(UI_OUT.replace(/\\/g, '/'));
  console.log(C.g('✓ Đã xuất giao diện Pipeline tuần ' + s.week + ' với số liệu thật'));
  console.log('\n  Mở giao diện (Ctrl + Click vào link):');
  console.log('  ' + C.b(url) + '\n');
  if (process.argv.includes('--vscode')) { try { execSync('start "" "vscode://fastdo-qc.fastdo-weekly-pipeline/open"', { shell: 'cmd.exe', stdio: 'ignore' }); console.log(C.g('  → Đã mở tab Pipeline trong VS Code')); } catch { console.log(C.y('  ! Không mở được VS Code — bấm 🚀 Pipeline tuần ở thanh trạng thái')); } }
  if (process.argv.includes('--open')) try { execSync(`start "" "${UI_OUT}"`, { shell: 'cmd.exe', stdio: 'ignore' }); } catch { }
};

// ---------- Main ----------
(async () => {
  const [cmd = 'help', ...rest] = process.argv.slice(2);
  const fn = CMD[cmd]; if (!fn) { console.error(C.r(`Lệnh không hợp lệ: ${cmd}`)); CMD.help(); process.exit(1); }
  if (!ROOT) console.log(C.y('! Không tìm thấy jwt_sheets.js ở thư mục cha — link Sheet / kiểm tra Sheet sẽ bị hạn chế'));
  await fn(parseArgs(rest));
})().catch(e => die(e.message));

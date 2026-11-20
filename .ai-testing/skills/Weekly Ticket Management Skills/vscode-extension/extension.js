// Fastdo – Pipeline ticket tuần: mở Visual Pipeline trong 1 tab của VS Code (webview), không cần trình duyệt.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

let panel = null;
let watchers = [];
let timer = null;
let poll = null;

let dashPanel = null;
let dashWatchers = [];
let dashTimer = null;

const cfg = () => vscode.workspace.getConfiguration('fastdoPipeline');
const folder = () => cfg().get('folder');
const cli = () => path.join(folder(), 'Weekly_Ticket_Management_Skills.js');
const liveHtml = () => path.join(folder(), 'Pipeline_Ticket_Tuan_Live.html');
const dashboardHtml = () => path.join(folder(), cfg().get('dashboardFile') || 'Dashboard_QC_Tuan_Live.html');

// Chạy "node Weekly_Ticket_Management_Skills.js ui" để dựng lại giao diện từ weekly_state.json + results_<ID>.json
function regenerate() {
  return new Promise(resolve => {
    if (!fs.existsSync(cli())) { vscode.window.showErrorMessage(`Không thấy ${cli()} — kiểm tra cài đặt fastdoPipeline.folder`); return resolve(false); }
    execFile('node', [cli(), 'ui', '--no-copy'], { cwd: folder(), windowsHide: true, timeout: 60000 }, (err, out, errOut) => {
      if (err) vscode.window.showWarningMessage('Pipeline: ' + (errOut || out || err.message).toString().trim().split('\n').pop());
      resolve(!err);
    });
  });
}

// Cầu nối (chèn đầu <head>): lưu thao tác qua CLI, giữ popup/cuộn khi tự làm mới, link ngoài → trình duyệt
const BRIDGE_HEAD = `<script>
(function(){
  const vscode = window.__vscode = acquireVsCodeApi();
  const get = () => vscode.getState() || {};
  const put = o => vscode.setState(Object.assign(get(), o));
  window.__toast = msg => { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', 2500); };
  window.PIPE = {
    cli: (args, say) => { vscode.postMessage({ type: 'cli', args, say }); window.__toast(say ? 'Đang lưu + gửi cho Claude…' : 'Đang lưu…'); },
    save: ui => put({ ui }),
    load: () => get().ui || null,
  };
  window.addEventListener('message', e => { const m = e.data || {}; if (m.type === 'saved') window.__toast(m.ok ? 'Đã lưu ✓' : 'Lưu lỗi: ' + (m.err || '')); });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/^(https?|file):/i.test(href)) { e.preventDefault(); vscode.postMessage({ type: 'open', href }); }
  }, true);
  const y = get().y;
  if (y) window.addEventListener('load', () => window.scrollTo(0, y));
  window.addEventListener('scroll', () => put({ y: window.scrollY }));
})();
</script>`;
// Chèn cuối <body>: thay sendPrompt (template tự định nghĩa trong <head>)
const BRIDGE = `<script>
window.sendPrompt = function(text){
  window.__vscode.postMessage({ type: 'copy', text });
  window.__toast('Đã sao chép — dán (Ctrl+V) vào Claude Code');
};
</script>`;
const CLI_OK = ['approve', 'reject', 'set', 'gate', 'seen'];

// Gửi nội dung vào terminal đang chạy Claude Code (tiêu đề có ✳/✻/claude); không thấy thì sao chép
function claudeTerminal(ticket) {
  const want = (cfg().get('claudeTerminal') || '').toLowerCase();
  const ts = vscode.window.terminals;
  const re = ticket ? new RegExp('(^|[^0-9])' + ticket + '([^0-9]|$)') : null;
  return (re && ts.find(t => re.test(t.name)))           // terminal đặt tên theo ticket (VD "1393")
    || (want && ts.find(t => t.name.toLowerCase().includes(want)))
    || ts.find(t => /^[\u2733\u273b\u2736\u2722\u00b7*]|claude/i.test(t.name.trim()))
    || null;
}
async function sayToClaude(text, ticket) {
  const t = claudeTerminal(ticket);
  if (!t) { await vscode.env.clipboard.writeText(text); vscode.window.showInformationMessage('Không thấy terminal Claude — đã sao chép nội dung, dán (Ctrl+V) vào Claude Code.'); return false; }
  t.sendText(text.replace(/\r?\n/g, ' '), true);
  vscode.window.setStatusBarMessage('$(comment) Đã gửi cho Claude (terminal "' + t.name + '"): ' + text.slice(0, 60) + '…', 5000);
  return true;
}

// Tự kiểm tra GitHub (PR) + KH Tuần định kỳ khi tab đang mở — chỉ đọc
function runBg(args) { return new Promise(r => execFile('node', [cli(), ...args, '--no-copy'], { cwd: folder(), windowsHide: true, timeout: 120000 }, () => r())); }
async function checkRemote() { await runBg(['prs']); await runBg(['plan']); }
function startPoll() { stopPoll(); const min = Math.max(2, +cfg().get('pollMinutes') || 10); checkRemote(); poll = setInterval(checkRemote, min * 60000); }
function stopPoll() { if (poll) clearInterval(poll); poll = null; }
function runCli(args) {
  return new Promise(resolve => {
    if (!Array.isArray(args) || !CLI_OK.includes(args[0]) || args.some(a => typeof a !== 'string')) return resolve({ ok: false, err: 'lệnh không hợp lệ' });
    execFile('node', [cli(), ...args, '--no-copy'], { cwd: folder(), windowsHide: true, timeout: 60000 }, (err, out, errOut) => {
      resolve(err ? { ok: false, err: String(errOut || out || err.message).trim().split('\n').pop() } : { ok: true, out: String(out).trim() });
    });
  });
}

function render() {
  if (!panel) return;
  const f = liveHtml();
  if (!fs.existsSync(f)) { panel.webview.html = `<body style="font-family:sans-serif;padding:24px">Chưa có tuần nào. Chạy <code>/weekly-ticket-qc</code> trong Claude Code hoặc <code>node Weekly_Ticket_Management_Skills.js init &lt;tuần&gt;</code>.</body>`; return; }
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace(/<head>/i, '<head>' + BRIDGE_HEAD);
  html = html.includes('</body>') ? html.replace('</body>', BRIDGE + '</body>') : html + BRIDGE;
  const theme = cfg().get('theme') || 'dark'; // 'dark' = nền đen, 'light' = nền sáng, 'auto' = theo máy
  if (theme !== 'auto') html = html.replace(/<html([^>]*)>/i, (m, at) => '<html' + at.replace(/\sdata-theme="[^"]*"/, '') + ' data-theme="' + theme + '">');
  panel.webview.html = html;
}

async function refresh(show) {
  await regenerate();
  render();
  if (show) vscode.window.setStatusBarMessage('$(check) Pipeline ticket tuần đã làm mới', 2500);
}

// Tự làm mới khi weekly_state.json hoặc results_<ID>.json thay đổi (gộp nhiều lần ghi trong 1.5s)
function watch() {
  unwatch();
  // trạng thái tuần, kết quả test, Test Scenario, nhánh đang checkout của fastdo-server
  const kick = file => { if (!/weekly_state\.json$|results_\d+\.json$|Test_Scenario_\d+\.md$|^HEAD$/.test(path.basename(String(file || '')))) return; clearTimeout(timer); timer = setTimeout(() => refresh(false), 1000); };
  const add = (dir, recursive) => { try { if (fs.existsSync(dir)) watchers.push(fs.watch(dir, { recursive }, (_, f) => kick(f))); } catch { } };
  add(folder(), false);
  add(path.join(cfg().get('automationRoot'), 'AI TESTING'), true);
  add(path.join(cfg().get('serverDir') || 'D:/GIANG/a/FASTDO/Fastdo/Fastdo2/fastdo-server', '.git'), false);
}
function unwatch() { watchers.forEach(w => { try { w.close(); } catch { } }); watchers = []; }

// Cầu nối tối giản cho Dashboard: chỉ cần link ngoài (file:///, https:) mở bằng trình duyệt thật,
// không có thao tác lưu/gửi Claude nào (Dashboard là báo cáo đọc, không phải bảng duyệt như Pipeline).
const DASH_BRIDGE_HEAD = `<script>
(function(){
  const vscode = acquireVsCodeApi();
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/^(https?|file):/i.test(href)) { e.preventDefault(); vscode.postMessage({ type: 'open', href }); }
  }, true);
})();
</script>`;

function renderDashboard() {
  if (!dashPanel) return;
  const f = dashboardHtml();
  if (!fs.existsSync(f)) {
    dashPanel.webview.html = `<body style="font-family:sans-serif;padding:24px">Chưa có <code>${path.basename(f)}</code>. Chạy <code>/weekly-dashboard</code> trong Claude Code trước.</body>`;
    return;
  }
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace(/<head>/i, '<head>' + DASH_BRIDGE_HEAD);
  const theme = cfg().get('theme') || 'dark';
  if (theme !== 'auto') html = html.replace(/<html([^>]*)>/i, (m, at) => '<html' + at.replace(/\sdata-theme="[^"]*"/, '') + ' data-theme="' + theme + '">');
  dashPanel.webview.html = html;
}

// Dashboard được Claude (qua skill /weekly-dashboard) ghi thẳng ra file — không có lệnh CLI
// để "dựng lại" như Pipeline, nên refresh() ở đây chỉ đọc lại file, không execFile node nào.
function refreshDashboard(show) {
  renderDashboard();
  if (show) vscode.window.setStatusBarMessage('$(check) Dashboard tuần đã làm mới', 2500);
}

function watchDashboard() {
  unwatchDashboard();
  const kick = file => {
    if (!/^Dashboard_QC_Tuan_Live\.html$|^weekly_state(\.week\d+)?\.json$|^results_\d+\.json$/.test(path.basename(String(file || '')))) return;
    clearTimeout(dashTimer);
    dashTimer = setTimeout(() => refreshDashboard(false), 800);
  };
  const add = (dir, recursive) => { try { if (fs.existsSync(dir)) dashWatchers.push(fs.watch(dir, { recursive }, (_, f) => kick(f))); } catch { } };
  add(folder(), false);
  add(path.join(cfg().get('automationRoot'), 'AI TESTING'), true);
}
function unwatchDashboard() { dashWatchers.forEach(w => { try { w.close(); } catch { } }); dashWatchers = []; }

async function openDashboard() {
  if (dashPanel) { dashPanel.reveal(); return refreshDashboard(true); }
  dashPanel = vscode.window.createWebviewPanel('fastdoDashboard', 'Dashboard QC Tuần', vscode.ViewColumn.Active, {
    enableScripts: true, retainContextWhenHidden: true, enableFindWidget: true,
  });
  dashPanel.iconPath = new vscode.ThemeIcon('graph');
  dashPanel.webview.onDidReceiveMessage(m => {
    if (m.type === 'open') vscode.env.openExternal(vscode.Uri.parse(m.href));
  });
  dashPanel.onDidDispose(() => { dashPanel = null; unwatchDashboard(); });
  renderDashboard();
  watchDashboard();
}

async function open() {
  if (panel) { panel.reveal(); return refresh(true); }
  panel = vscode.window.createWebviewPanel('fastdoPipeline', 'Pipeline ticket tuần', vscode.ViewColumn.Active, {
    enableScripts: true, retainContextWhenHidden: true, enableFindWidget: true,
  });
  panel.iconPath = new vscode.ThemeIcon('rocket');
  panel.webview.onDidReceiveMessage(async m => {
    if (m.type === 'copy') {
      await vscode.env.clipboard.writeText(m.text);
      vscode.window.setStatusBarMessage('$(clippy) Đã sao chép lệnh — dán vào Claude Code', 3000);
    } else if (m.type === 'cli') {
      const r = await runCli(m.args);
      if (panel) panel.webview.postMessage({ type: 'saved', ok: r.ok, err: r.err });
      if (r.ok && typeof m.say === 'string' && m.say.trim() && cfg().get('sendToClaude') !== false) await sayToClaude(m.say.trim(), m.args[0] === 'gate' ? m.args[1] : undefined);
      if (!r.ok) vscode.window.showWarningMessage('Pipeline: không lưu được — ' + r.err);
      else { vscode.window.setStatusBarMessage('$(check) ' + (r.out || 'Đã lưu').split('\n')[0], 4000); clearTimeout(timer); timer = setTimeout(() => refresh(false), 300); }
    } else if (m.type === 'open') {
      vscode.env.openExternal(vscode.Uri.parse(m.href));
    }
  });
  panel.onDidDispose(() => { panel = null; unwatch(); stopPoll(); });
  render(); // hiện ngay bản đang có, rồi dựng lại bản mới
  watch();
  await refresh(false);
  startPoll();
}

function activate(ctx) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('fastdoPipeline.open', open),
    vscode.commands.registerCommand('fastdoPipeline.refresh', () => panel ? refresh(true) : open()),
    vscode.commands.registerCommand('fastdoPipeline.openDashboard', openDashboard),
    vscode.commands.registerCommand('fastdoPipeline.refreshDashboard', () => dashPanel ? refreshDashboard(true) : openDashboard()),
  );
  // Cho phép Claude/terminal mở tab: start "" "vscode://fastdo-qc.fastdo-weekly-pipeline/open"
  // hoặc .../openDashboard cho Dashboard tuần.
  ctx.subscriptions.push(vscode.window.registerUriHandler({
    handleUri(uri) {
      if (/^\/(open|refresh)?$/.test(uri.path)) open();
      else if (/^\/(openDashboard|refreshDashboard)$/.test(uri.path)) openDashboard();
    },
  }));
  const sb = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  sb.text = '$(rocket) Pipeline tuần';
  sb.tooltip = 'Mở Visual Pipeline ticket tuần (Ctrl+Alt+P)';
  sb.command = 'fastdoPipeline.open';
  sb.show();

  const sbDash = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  sbDash.text = '$(graph) Dashboard tuần';
  sbDash.tooltip = 'Mở Dashboard QC Tuần (Ctrl+Alt+D)';
  sbDash.command = 'fastdoPipeline.openDashboard';
  sbDash.show();

  ctx.subscriptions.push(sb, sbDash, { dispose: unwatch }, { dispose: unwatchDashboard });
}

module.exports = { activate, deactivate: () => { unwatch(); stopPoll(); unwatchDashboard(); } };

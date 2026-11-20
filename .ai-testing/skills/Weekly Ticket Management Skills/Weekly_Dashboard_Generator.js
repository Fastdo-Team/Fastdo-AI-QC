// Weekly_Dashboard_Generator.js — tính số liệu thật cho Dashboard QC tuần/tháng
// Nguồn: weekly_state(.week<NN>).json (ticket, PR, plan) + AI TESTING/Ticket_<ID>/results_<ID>.json (case DONE/Fail/Suggest/Pending)
// KHÔNG đọc Fastdo (module Plan "Book QC", module Quy trình "Thời gian Khởi tạo công việc", Module) —
// các phần đó do Claude đọc qua Chrome debug rồi truyền vào bằng --meta <file.json> (xem SKILL.md weekly-dashboard).
//
// Dùng:
//   node Weekly_Dashboard_Generator.js data [--week <NN>] [--meta <file.json>]   -> in JSON số liệu 1 tuần
//   node Weekly_Dashboard_Generator.js month --weeks 44,45,46,47 [--meta <file.json>] -> in JSON cộng dồn tháng
//   node Weekly_Dashboard_Generator.js inject [--week NN] [--weeks 44,45,46,47] [--html file] -> ghi Điểm AI Testing vào dashboard
//   node Weekly_Dashboard_Generator.js rubric -> in bộ tiêu chí chấm điểm
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const AUTOMATION_ROOT = (() => {
  const cands = [process.env.FASTDO_AUTOMATION_ROOT, 'D:/GIANG/a/Automation'].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return cands[0];
})();

function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function stateFile(week) {
  const live = path.join(HERE, 'weekly_state.json');
  if (!week) return live;
  // tuần đang chạy: bản sống weekly_state.json mới nhất (bản .week<NN>.json chỉ là ảnh chụp lúc init, có thể chưa tick/chưa có kết quả)
  try { if (String(JSON.parse(fs.readFileSync(live, 'utf8')).week) === String(week)) return live; } catch { }
  return path.join(HERE, `weekly_state.week${week}.json`);
}

function resultsFile(id) {
  return path.join(AUTOMATION_ROOT, 'AI TESTING', `Ticket_${id}`, `results_${id}.json`);
}

function isProdPrMerged(t) {
  // Chỉ tính base PRODUCTION THẬT ("production" / "api_production"), không
  // tính "api_production_beta" hay "beta/dev1" — các base có chữ "production"
  // nhưng vẫn là môi trường beta, không phải production thật.
  return (t.prs || []).some(p => /^(api_)?production$/i.test((p.base || '').trim()) && /merged/i.test(p.st || ''));
}

// 1 ticket -> {totalRun, counts:{DONE,Fail,Suggest,Pending}, status, hasProdPR}
function ticketTestInfo(t, meta) {
  const r = readJSON(resultsFile(t.id));
  const counts = { DONE: 0, Fail: 0, Suggest: 0, Pending: 0 };
  let totalRun = 0;
  if (r && r.cases) {
    for (const c of Object.values(r.cases)) {
      if (!c.runs || !c.runs.length) continue;
      totalRun++;
      const st = c.runs[c.runs.length - 1].status;
      if (counts[st] !== undefined) counts[st]++;
    }
  }
  const hasProdPR = isProdPrMerged(t);
  const passCount = counts.DONE + counts.Suggest;
  const mPending = meta && meta.pendingTickets && meta.pendingTickets.includes(t.id);
  let status;
  if (totalRun === 0) {
    if (t.plan && t.plan.st === 'Done' && !hasProdPR) status = 'Cancel';
    else if (mPending) status = 'Pending';
    else status = 'Chưa test';
  } else if (counts.Fail > 0) status = 'Fail';
  else if (passCount === totalRun) status = 'Pass';
  else status = 'Doing';

  // Phương thức test: cần nhãn "Book QC" trên module Plan (đọc qua Fastdo, truyền bằng --meta).
  // Không có --meta cho ticket này => để 'chưa_xác_định' thay vì đoán, SKILL.md sẽ nhắc Claude bổ sung.
  let method = null;
  if (hasProdPR && totalRun > 0) {
    const bookQC = meta && meta.bookQcTickets && meta.bookQcTickets.includes(t.id);
    method = bookQC ? 'qc_manual' : (meta && meta.bookQcTickets ? 'ai' : 'chua_xac_dinh');
  } else if (hasProdPR && totalRun === 0) method = 'chua_test';

  return { totalRun, counts, status, hasProdPR, method };
}


// =====================================================================
// ĐIỂM AI TESTING (thang 100) — chấm sau các ticket của tuần/tháng, chỉ dùng dữ liệu thật
// (weekly_state + results_<ID>.json + tk<ID>_cases.js + PR GitHub đã đọc bằng lệnh prs)
// =====================================================================
const SCORE_RUBRIC = [
  { key: 'phu', name: 'Độ phủ test', max: 20, how: 'Ticket tuần thực hiện có ≥1 testcase đã chạy / tổng ticket tuần thực hiện' },
  { key: 'xong', name: 'Hoàn thành testcase', max: 15, how: 'Testcase có kết quả chốt (DONE/Fail/Suggest) / tổng testcase đã viết (kể cả chưa chạy, Pending)' },
  { key: 'gac', name: 'Gác cổng Production', max: 20, how: 'Ticket có PR merge Production mà AI đã test TRƯỚC thời điểm merge / tổng ticket có PR merge Production' },
  { key: 'chung', name: 'Bằng chứng', max: 15, how: 'Testcase đã chốt có link video (Drive) hoặc ảnh bằng chứng / tổng testcase đã chốt' },
  { key: 'nhanh', name: 'Tốc độ phản hồi', max: 15, how: 'Thời gian từ khi nhánh ticket merge lên beta (hoặc tạo PR) tới lần test đầu: ≤24h đủ điểm, ≤48h 2/3, ≤72h 1/3, quá 72h 0 — lấy trung bình các ticket' },
  { key: 'tudong', name: 'Mức tự động hoá', max: 15, how: 'Testcase do AI chạy (không phải QC test tay) / tổng testcase đã chốt' },
];
const GRADE = p => p >= 85 ? 'A' : p >= 70 ? 'B' : p >= 50 ? 'C' : 'D';
function parseRunDate(s) {
  s = String(s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/))) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
function caseDefsCount(id) {
  try { const f = path.join(AUTOMATION_ROOT, 'AI TESTING', `Ticket_${id}`, `tk${id}_cases.js`); if (!fs.existsSync(f)) return 0; const d = require(f); return (Array.isArray(d) ? d : (d.cases || [])).length; } catch { return 0; }
}
function scoreTickets(tickets) {
  const ratio = (a, b) => (b ? a / b : null);
  const tested = tickets.filter(t => t._test.totalRun > 0);
  // 1 độ phủ
  const phu = ratio(tested.length, tickets.length);
  // 2 hoàn thành + 4 bằng chứng + 6 tự động hoá (theo lần chạy mới nhất của từng case)
  let defined = 0, finals = 0, withEvidence = 0, byAI = 0;
  const firstRun = {};
  for (const t of tickets) {
    const r = readJSON(resultsFile(t.id)); const cases = (r && r.cases) || {};
    defined += Math.max(caseDefsCount(t.id), Object.keys(cases).length);
    for (const c of Object.values(cases)) {
      const runs = c.runs || []; if (!runs.length) continue;
      for (const x of runs) { const d = parseRunDate(x.date); if (d && (!firstRun[t.id] || d < firstRun[t.id])) firstRun[t.id] = d; }
      const last = runs[runs.length - 1]; const st = String(last.status || '').trim();
      if (!/^(DONE|Fail|Suggest)$/i.test(st)) continue;
      finals++;
      if (/^https?:\/\//.test(String(last.video || '')) || /drive\.google|prnt\.sc|catbox/.test(String(last.result || '')) || (last.evidence || []).length) withEvidence++;
      if (!/QC|Sheet \(QC/i.test(String(last.source || ''))) byAI++;
    }
  }
  // 3 gác cổng: test trước giờ merge Production
  const prodMerged = tickets.map(t => ({ t, m: (t.prs || []).filter(p => /production/.test(p.base || '') && p.merged).map(p => new Date(p.merged)).sort((a, b) => a - b)[0] })).filter(x => x.m);
  const gacOk = prodMerged.filter(x => firstRun[x.t.id] && firstRun[x.t.id] <= x.m).length;
  // 5 tốc độ: mốc = merge beta/dev1 (hoặc thời điểm PR gần nhất) → lần test đầu
  const speeds = [];
  for (const t of tested) {
    const ps = (t.prs || []).filter(p => /beta|dev1/.test(p.base || '') && p.merged).map(p => new Date(p.merged)).sort((a, b) => a - b);
    const start = ps[0]; if (!start || !firstRun[t.id]) continue;
    const h = (firstRun[t.id] - start) / 3600000; speeds.push(Math.max(0, h));
  }
  const speedPts = speeds.length ? speeds.map(h => h <= 24 ? 1 : h <= 48 ? 2 / 3 : h <= 72 ? 1 / 3 : 0).reduce((a, b) => a + b, 0) / speeds.length : null;
  const val = { phu, xong: ratio(finals, defined), gac: ratio(gacOk, prodMerged.length), chung: ratio(withEvidence, finals), nhanh: speedPts, tudong: ratio(byAI, finals) };
  const detail = {
    phu: `${tested.length}/${tickets.length} ticket`, xong: `${finals}/${defined} testcase`, gac: `${gacOk}/${prodMerged.length} ticket merge Production`,
    chung: `${withEvidence}/${finals} testcase`, nhanh: speeds.length ? `TB ${Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)}h · ${speeds.length} ticket có mốc beta` : 'chưa có ticket có mốc merge beta',
    tudong: `${byAI}/${finals} testcase do AI chạy`,
  };
  // tiêu chí không đo được (null) thì bỏ khỏi mẫu số, quy đổi lại thang 100
  let got = 0, max = 0;
  const criteria = SCORE_RUBRIC.map(c => { const v = val[c.key]; const pts = v == null ? null : Math.round(v * c.max * 10) / 10; if (pts != null) { got += pts; max += c.max; } return { ...c, value: v == null ? null : Math.round(v * 1000) / 10, points: pts, detail: detail[c.key] }; });
  if (!tickets.length || !max) return { total: null, grade: '—', measured: 0, criteria, note: 'Tuần không có ticket tick chạy test (hoặc file tuần chưa cập nhật) — không chấm' };
  const total = Math.round(got / max * 1000) / 10;
  return { total, grade: GRADE(total), measured: max, criteria };
}

function computeWeek(week, meta) {
  const state = readJSON(stateFile(week));
  if (!state) throw new Error(`Không thấy ${stateFile(week)}`);
  const tickets = (state.tickets || []).map(t => ({ ...t, _test: ticketTestInfo(t, meta) }));
  const ticketThucHien = tickets.filter(t => t.y === 1);
  // Phạm vi "PR lên Production" bám theo đúng những gì dashboard hiển thị:
  // chỉ tính trong 9 ticket tuần thực hiện (module Plan), không tính toàn bộ
  // weekly_state (bao gồm cả ticket chưa tick y:1).
  const prodPRs = ticketThucHien.filter(t => t._test.hasProdPR);
  // Ticket có PR lên Production nhưng KHÔNG nằm trong danh sách module Plan
  // tuần này (y !== 1) — đây là nghĩa thật của "ngoài kế hoạch".
  const outsidePlanProd = tickets.filter(t => t.y !== 1 && t._test.hasProdPR);
  const aiTest = prodPRs.filter(t => t._test.method === 'ai').length;
  const qcTest = prodPRs.filter(t => t._test.method === 'qc_manual').length;
  const unresolvedMethod = prodPRs.filter(t => t._test.method === 'chua_xac_dinh').length;
  const notTestedProd = prodPRs.filter(t => t._test.method === 'chua_test').length;
  const aiCoverage = ticketThucHien.filter(t => t._test.totalRun > 0).length;
  const tc = ticketThucHien.reduce((a, t) => {
    a.DONE += t._test.counts.DONE; a.Fail += t._test.counts.Fail;
    a.Suggest += t._test.counts.Suggest; a.Pending += t._test.counts.Pending;
    return a;
  }, { DONE: 0, Fail: 0, Suggest: 0, Pending: 0 });
  const flagNotDone = prodPRs.filter(t => t._test.status === 'Chưa test' || t._test.status === 'Doing' || t._test.status === 'Pending').length;

  return {
    week: state.week, from: state.from, to: state.to,
    ticketThucHien: ticketThucHien.length,
    prProd: prodPRs.length,
    prAiTest: aiTest, prQcTest: qcTest, prChuaTest: notTestedProd, prChuaXacDinh: unresolvedMethod,
    aiTestingCoverage: { tested: aiCoverage, total: ticketThucHien.length },
    testcase: tc,
    flagLenProdChuaTestXong: flagNotDone,
    outsidePlanProd: outsidePlanProd.map(t => ({ id: t.id, name: t.name })),
    score: scoreTickets(ticketThucHien),
    tickets: ticketThucHien.map(t => ({
      id: t.id, name: t.name, type: t.type, mod: t.mod || null,
      prStatus: t._test.hasProdPR ? 'merged' : ((t.prs || [])[0] ? (t.prs[0].st || '').toLowerCase() : 'chưa có PR'),
      totalRun: t._test.totalRun, counts: t._test.counts, status: t._test.status, method: t._test.method,
    })),
  };
}

function computeMonth(weeks, meta) {
  const parts = weeks.map(w => computeWeek(w, meta));
  const sum = (key) => parts.reduce((a, p) => a + p[key], 0);
  const sumTc = ['DONE', 'Fail', 'Suggest', 'Pending'].reduce((o, k) => { o[k] = parts.reduce((a, p) => a + p.testcase[k], 0); return o; }, {});
  return {
    weeks: parts.map(p => p.week),
    ticketThucHien: sum('ticketThucHien'),
    prProd: sum('prProd'), prAiTest: sum('prAiTest'), prQcTest: sum('prQcTest'),
    prChuaTest: sum('prChuaTest'), prChuaXacDinh: sum('prChuaXacDinh'),
    aiTestingCoverage: {
      tested: parts.reduce((a, p) => a + p.aiTestingCoverage.tested, 0),
      total: parts.reduce((a, p) => a + p.aiTestingCoverage.total, 0),
    },
    testcase: sumTc,
    flagLenProdChuaTestXong: sum('flagLenProdChuaTestXong'),
    perWeek: parts.map(p => ({ week: p.week, ticketThucHien: p.ticketThucHien, prProd: p.prProd, testcase: p.testcase, score: p.score.total, grade: p.score.grade })),
    score: (() => { const ws = parts.map(p => p.score); const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null; const total = avg(ws.map(w => w.total).filter(v => v != null)); return { total, grade: total == null ? '—' : GRADE(total), weeksMeasured: ws.filter(w => w.total != null).length, criteria: SCORE_RUBRIC.map(c => { const pts = ws.map(w => w.criteria.find(x => x.key === c.key).points).filter(v => v != null); return { ...c, points: avg(pts), detail: pts.length ? `TB ${pts.length} tuần` : 'chưa đo được' }; }) }; })(),
  };
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { o[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
  }
  return o;
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  const opt = parseArgs(rest);
  const meta = opt.meta ? readJSON(opt.meta, null) : null;
  if (cmd === 'data') {
    console.log(JSON.stringify(computeWeek(opt.week, meta), null, 1));
  } else if (cmd === 'month') {
    const weeks = String(opt.weeks || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!weeks.length) throw new Error('Cần --weeks 44,45,46,47');
    console.log(JSON.stringify(computeMonth(weeks, meta), null, 1));
  } else if (cmd === 'rubric') {
    console.log(JSON.stringify(SCORE_RUBRIC, null, 1));
  } else if (cmd === 'inject') {
    // ghi điểm tuần (và tháng nếu có --weeks) vào khối <script id="aiScoreData"> của file dashboard
    const html = opt.html || path.join(HERE, 'Dashboard_QC_Tuan_Live.html');
    const data = { week: computeWeek(opt.week, meta).score, weekNo: (readJSON(stateFile(opt.week)) || {}).week, month: null, weeks: null, at: new Date().toISOString() };
    if (opt.weeks) { const ws = String(opt.weeks).split(',').map(x => x.trim()).filter(Boolean); const m = computeMonth(ws, meta); data.month = m.score; data.weeks = m.perWeek.map(p => ({ week: p.week, score: p.score, grade: p.grade })); }
    let h = fs.readFileSync(html, 'utf8');
    const re = /(<script type="application\/json" id="aiScoreData">)[\s\S]*?(<\/script>)/;
    if (!re.test(h)) throw new Error('File ' + html + ' chưa có khối aiScoreData — chép panel "Điểm AI Testing" từ Dashboard_QC_Tuan_Mockup.html');
    h = h.replace(re, (m0, a, b) => a + JSON.stringify(data).replace(/</g, '\\u003c') + b);
    fs.writeFileSync(html, h, 'utf8');
    console.log('✓ Đã ghi điểm AI Testing: tuần ' + data.weekNo + ' = ' + data.week.total + ' (' + data.week.grade + ')' + (data.month ? ' · tháng ' + data.month.total + ' (' + data.month.grade + ')' : '') + ' → ' + html);
  } else {
    console.log('Dùng: data [--week <NN>] [--meta <file.json>] | month --weeks 44,45,46,47 [--meta <file.json>] | inject [--week NN] [--weeks 44,45,46,47] [--html file] | rubric');
  }
}

main();

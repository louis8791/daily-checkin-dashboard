const START_DATE = '2026-08-18';
const END_DATE = '2026-10-12';
const DEMO_AS_OF = '2026-09-01';

const ROSTER_KEY = 'daily-checkin-roster-v1';
const DATA_KEY = 'daily-checkin-data-v1';

function loadRoster() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((name) => typeof name === 'string' && name.trim()).slice(0, 10)
      .map((name, index) => ({ id: `m${String(index + 1).padStart(2, '0')}`, name: name.trim() }));
  } catch { return []; }
}

let members = loadRoster();

function loadSavedData() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); } catch { return {}; }
}

function persistData() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ROSTER_KEY, JSON.stringify(members.map((member) => member.name)));
  localStorage.setItem(DATA_KEY, JSON.stringify({ records: state.records, importedDays: state.importedDays, asOf: state.asOf, rawInputs: state.rawInputs }));
}

function parseDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const date = typeof value === 'string' ? parseDate(value) : new Date(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function getWeekIndex(value) {
  const start = parseDate(START_DATE);
  const target = parseDate(value);
  const diff = Math.floor((target - start) / 86400000);
  return diff >= 0 && diff < 56 ? Math.floor(diff / 7) : -1;
}

function getWeekDates(weekIndex) {
  if (weekIndex < 0 || weekIndex > 7) return [];
  return Array.from({ length: 7 }, (_, day) => addDays(START_DATE, weekIndex * 7 + day));
}

function getTotalDaysThrough(value) {
  const start = parseDate(START_DATE);
  const end = parseDate(END_DATE);
  const target = parseDate(value);
  if (target < start) return 0;
  return Math.min(56, Math.floor((Math.min(target, end) - start) / 86400000) + 1);
}

function inferRelayDate(text) {
  const source = String(text || '');
  const candidates = [];
  const full = source.match(/(20\d{2})\s*[\/\.\-年]\s*(\d{1,2})\s*[\/\.\-月]\s*(\d{1,2})\s*日?/u);
  if (full) candidates.push(`${full[1]}-${String(full[2]).padStart(2, '0')}-${String(full[3]).padStart(2, '0')}`);
  const chinese = source.match(/(?:^|[^\d])(\d{1,2})\s*月\s*(\d{1,2})\s*日?/u);
  if (chinese) candidates.push(`2026-${String(chinese[1]).padStart(2, '0')}-${String(chinese[2]).padStart(2, '0')}`);
  const short = source.match(/(?:^|[^\d])(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})(?:[^\d]|$)/u);
  if (short) candidates.push(`2026-${String(short[1]).padStart(2, '0')}-${String(short[2]).padStart(2, '0')}`);
  const date = candidates.find((candidate) => {
    const parsed = parseDate(candidate);
    return dateKey(parsed) === candidate && getWeekIndex(candidate) >= 0;
  });
  return date || null;
}

function normaliseName(value) {
  return String(value).replace(/[\[\]【】]/gu, '').replace(/\s+/gu, '').trim();
}

function displayName(value) {
  return String(value).replace(/[\[\]【】]/gu, '').replace(/\s+/gu, ' ').trim();
}

function numberedNames(text) {
  const source = String(text || '').trim().replace(/^\s*[\[]/u, '').replace(/[\]]\s*$/u, '');
  return source.split(/\r?\n/u)
    .map((line) => line.match(/^\s*\d+\s*[.．、)]\s*(.+?)\s*$/u))
    .filter(Boolean)
    .map((match) => displayName(match[1]))
    .filter(Boolean);
}

function parseRelay(text, roster = members) {
  const byName = new Map(roster.map((member) => [normaliseName(member.name), member]));
  const names = [];
  const ids = [];
  const duplicates = [];
  const newNames = [];
  const numbered = numberedNames(text);
  let nextId = roster.length;
  for (const name of numbered) {
    const key = normaliseName(name);
    const member = byName.get(key);
    if (member && ids.includes(member.id)) {
      duplicates.push(name);
    } else {
      const resolved = member || { id: `m${String(nextId += 1).padStart(2, '0')}`, name };
      if (!member) { byName.set(key, resolved); newNames.push(name); }
      ids.push(resolved.id);
      names.push(resolved.name);
    }
  }
  return { names, ids, duplicates, unknown: [], newNames, isEmpty: numbered.length === 0 };
}

function toSet(value) {
  return value instanceof Set ? value : new Set(value || []);
}

function calculateStats({ roster = members, records = {}, importedDays = [], asOf = null } = {}) {
  const effectiveAsOf = asOf || addDays(START_DATE, -1);
  const imported = new Set(importedDays);
  const elapsedDays = getTotalDaysThrough(effectiveAsOf);
  const weekStats = Array.from({ length: 8 }, (_, weekIndex) => {
    const dates = getWeekDates(weekIndex);
    const available = dates.filter((date) => date <= effectiveAsOf).length;
    return { weekIndex, dates, available, complete: available === 7, sourceMissing: dates.filter((date) => date <= effectiveAsOf && !imported.has(date)) };
  });
  const people = roster.map((member) => {
    const weekly = weekStats.map((week) => {
      const count = week.dates.reduce((sum, date) => sum + (toSet(records[date]).has(member.id) ? 1 : 0), 0);
      return { count, total: week.available, rate: week.available ? count / week.available : null };
    });
    const count = Object.entries(records).reduce((sum, [date, ids]) => {
      if (date <= effectiveAsOf && toSet(ids).has(member.id)) return sum + 1;
      return sum;
    }, 0);
    return { ...member, weekly, count, total: elapsedDays, rate: elapsedDays ? count / elapsedDays : null };
  });
  return { asOf, elapsedDays, weeks: weekStats, people, sourceMissing: weekStats.flatMap((week) => week.sourceMissing) };
}

function buildFixture() {
  const records = {};
  const importedDays = [];
  return { records, importedDays, asOf: null };
}

const saved = loadSavedData();
const demo = buildFixture();
const state = {
  ...demo,
  records: saved.records || demo.records,
  importedDays: saved.importedDays || demo.importedDays,
  asOf: saved.asOf || demo.asOf,
  rawInputs: saved.rawInputs || {},
  selectedWeek: 2,
  selectedPerson: 'm01',
  selectedDate: DEMO_AS_OF,
  preview: null,
  previewDate: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const formatDate = (value, withYear = false) => {
  const date = parseDate(value);
  return new Intl.DateTimeFormat('zh-TW', withYear ? { month: 'numeric', day: 'numeric', year: 'numeric' } : { month: 'numeric', day: 'numeric' }).format(date);
};
const pct = (value) => value == null ? '—' : `${Math.round(value * 100)}%`;
const toast = (message, type = 'info') => {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
  node.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2600);
};

function weekLabel(index) { return `第${index + 1}週`; }
function currentStats() { return calculateStats({ roster: members, records: state.records, importedDays: state.importedDays, asOf: state.asOf }); }

function renderHeader(stats) {
  $('#last-updated').textContent = stats.asOf ? `本機資料・截至 ${formatDate(stats.asOf, true)}` : '本機資料・尚未匯入';
  const asOf = $('#as-of-label');
  if (asOf) asOf.textContent = stats.asOf ? formatDate(stats.asOf, true) : '尚未匯入';
}

function renderMetrics(stats) {
  const done = stats.people.reduce((sum, person) => sum + person.count, 0);
  const possible = members.length * stats.elapsedDays;
  const activeToday = stats.people.filter((person) => toSet(state.records[stats.asOf]).has(person.id)).length;
  $('#overview-metrics').innerHTML = [
    ['今日已接龍', `${activeToday} 人`, '把今天的完成留在紀錄裡'],
    ['今日尚未接龍', `${members.length - activeToday} 人`, '明天也能重新開始'],
    ['團體累積次數', `${done} 次`, `共 ${stats.elapsedDays} 天`],
    ['團體達成率', pct(possible ? done / possible : null), '持續累積就很棒'],
  ].map(([label, value, note]) => `<article class="metric-card"><p>${label}</p><strong>${value}</strong><span>${note}</span></article>`).join('');
}

function renderOverviewTable(stats) {
  const rows = stats.people.map((person, index) => `<tr><td><span class="rank-badge">${index + 1}</span>${escapeHtml(person.name)}</td><td>${person.count}</td><td>${person.total}</td><td><strong>${pct(person.rate)}</strong></td></tr>`).join('');
  $('#overview-table-body').innerHTML = rows;
}

function renderWeeklyHighlight(stats) {
  const week = stats.weeks[state.selectedWeek];
  const complete = week.complete;
  const status = week.available === 0 ? '尚未開始' : complete ? '本週已完整' : `進行中・第 ${week.available} 天`;
  $('#weekly-highlight').innerHTML = `<div><span class="eyebrow">${weekLabel(state.selectedWeek)}</span><h3>${formatDate(week.dates[0])} – ${formatDate(week.dates[6])}</h3><p>${complete ? '每一天的累積都值得記下來。' : '今天也一起，照自己的節奏完成。'}</p></div><span class="status-pill ${complete ? 'is-done' : ''}">${status}</span>`;
}

function svgLineChart(person, stats, compact = false) {
  const width = compact ? 620 : 720;
  const height = compact ? 210 : 250;
  const max = 7;
  const points = person.weekly.map((week, index) => week.total ? { x: 42 + index * ((width - 82) / 7), y: height - 34 - (week.count / max) * (height - 70), count: week.count } : null);
  const path = points.filter(Boolean).map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const grid = [0, 2, 4, 6, 7].map((tick) => { const y = height - 34 - (tick / max) * (height - 70); return `<line x1="42" x2="${width - 28}" y1="${y}" y2="${y}" class="chart-grid"/><text x="30" y="${y + 4}" text-anchor="end">${tick}</text>`; }).join('');
  const labels = person.weekly.map((week, index) => `<text x="${42 + index * ((width - 82) / 7)}" y="${height - 9}" text-anchor="middle">${index + 1}</text>`).join('');
  const dots = points.filter(Boolean).map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" class="chart-dot"/><text x="${point.x}" y="${point.y - 11}" text-anchor="middle" class="chart-value">${point.count}</text>`).join('');
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(person.name)}各週完成次數折線圖">${grid}<path d="${path}" class="chart-line"/>${dots}${labels}</svg>`;
}

function renderLineChart(stats) {
  const person = stats.people.find((item) => item.id === state.selectedPerson) || stats.people[0];
  $('#overview-line-chart').innerHTML = person ? svgLineChart(person, stats) : '<div class="empty-state">先在每日紀錄貼上一份接龍原文。</div>';
  if (person) $('#overview-person').value = person.id;
}

function renderRanking(stats) {
  const sorted = [...stats.people].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
  const max = Math.max(1, sorted[0]?.count || 1);
  $('#overview-bar-chart').innerHTML = sorted.map((person, index) => `<div class="bar-row"><div class="bar-label"><span class="rank-badge">${index + 1}</span><span>${escapeHtml(person.name)}</span><strong>${person.count}</strong></div><div class="bar-track"><span style="width:${Math.round((person.count / max) * 100)}%"></span></div></div>`).join('');
}

function renderWeekly(stats) {
  const week = stats.weeks[state.selectedWeek];
  $('#weekly-week').value = String(state.selectedWeek);
  const completed = stats.people.reduce((sum, person) => sum + person.weekly[state.selectedWeek].count, 0);
  $('#weekly-metrics').innerHTML = `<div><span>團體完成次數</span><strong>${completed} 次</strong></div><div><span>目前總次數</span><strong>${week.available * members.length} 次</strong></div><div><span>團體達成率</span><strong>${pct(week.available ? completed / (week.available * members.length) : null)}</strong></div>`;
  const rows = stats.people.map((person) => { const item = person.weekly[state.selectedWeek]; return `<tr><td>${escapeHtml(person.name)}</td><td>${item.count}</td><td>${item.total}</td><td><strong>${pct(item.rate)}</strong></td></tr>`; }).join('');
  $('#weekly-table-title').textContent = weekLabel(state.selectedWeek);
  $('#weekly-table-note').textContent = week.available ? `截至 ${formatDate(week.dates[Math.max(0, week.available - 1)])}` : '尚未開始';
  $('#weekly-table-body').innerHTML = rows;
}

function renderPerson(stats) {
  const person = stats.people.find((item) => item.id === state.selectedPerson) || stats.people[0];
  if (!person) {
    $('#person-summary').innerHTML = '<div class="empty-state">先在每日紀錄貼上一份接龍原文。</div>';
    $('#people-line-chart').innerHTML = '<div class="empty-state">尚未有可顯示的個人資料。</div>';
    $('#person-calendar').innerHTML = '';
    return;
  }
  $('#people-person').value = person.id;
  $('#person-summary').innerHTML = `<div><span>累積完成</span><strong>${person.count} 次</strong></div><div><span>目前總次數</span><strong>${person.total} 次</strong></div><div><span>達成率</span><strong>${pct(person.rate)}</strong></div>`;
  $('#people-line-chart').innerHTML = svgLineChart(person);
  $('#person-chart-title').textContent = `${person.name}的每週節奏`;
  $('#person-calendar').innerHTML = stats.weeks.map((week, weekIndex) => `<section class="calendar-week"><div class="calendar-week-label">${weekLabel(weekIndex)}</div><div class="calendar-days">${week.dates.map((date) => { const complete = toSet(state.records[date]).has(person.id); const future = date > state.asOf; return `<div class="day-cell ${complete ? 'is-done' : ''} ${future ? 'is-future' : ''}" title="${formatDate(date, true)}"><span>${parseDate(date).getUTCDate()}</span><small>${complete ? '完成' : future ? '—' : '未接龍'}</small></div>`; }).join('')}</div></section>`).join('');
}

function renderDaily(stats) {
  const confirmed = toSet(state.records[state.selectedDate]);
  const rows = members.map((person) => `<tr><td>${escapeHtml(person.name)}</td><td>${confirmed.has(person.id) ? '<span class="state-dot is-done"></span>已接龍' : '<span class="state-dot"></span>尚未接龍'}</td></tr>`).join('');
  const recentRows = state.importedDays.slice(-7).reverse().map((date) => `<tr><td>${formatDate(date, true)}</td><td>${weekLabel(getWeekIndex(date))}</td><td class="numeric">${toSet(state.records[date]).size}</td><td><span class="status-pill is-done">已匯入</span></td><td>${formatDate(date)}</td></tr>`).join('');
  $('#recent-days-body').innerHTML = recentRows;
  $('#relay-input').value = state.rawInputs[state.selectedDate] || '';
  if (state.preview) renderPreview(state.preview);
  else $('#preview-content').innerHTML = '<div class="empty-icon" aria-hidden="true">⌁</div><strong>還沒有待確認內容</strong><p>貼上接龍後，這裡會列出已辨識與需要留意的項目。</p>';
  const helper = document.querySelector('.helper-text');
  if (helper) helper.textContent = stats.sourceMissing.includes(state.selectedDate) ? '這一天尚未匯入來源，尚不計入統計。' : '資料只在此瀏覽器處理。';
}

function renderPreview(result) {
  const missing = members.filter((member) => !result.ids.includes(member.id)).map((member) => member.name);
  const dateNote = state.previewDate ? `<p class="notice"><b>日期已辨識：</b>${formatDate(state.previewDate, true)}；系統會以這一天入帳。</p>` : '<p class="warning"><b>未找到日期：</b>請在原文中保留日期，系統不會自行猜測。</p>';
  const newNote = result.newNames.length ? `<p class="notice"><b>本次新辨識：</b>${result.newNames.map(escapeHtml).join('、')}（只留在本機）</p>` : '';
  $('#preview-content').innerHTML = `<div class="preview-summary"><strong>辨識到 ${result.names.length} 人</strong><span>重複 ${result.duplicates.length} 筆</span></div><div class="preview-lists">${dateNote}${newNote}<p><b>已辨識：</b>${result.names.length ? result.names.map(escapeHtml).join('、') : '—'}</p><p><b>既有成員本次未出現：</b>${missing.map(escapeHtml).join('、') || '—'}</p>${result.duplicates.length ? `<p class="notice"><b>重複姓名：</b>${result.duplicates.map(escapeHtml).join('、')}（只計一次）</p>` : ''}</div>`;
  $('#preview-status').textContent = result.isEmpty ? '找不到編號姓名' : state.previewDate ? '日期已判斷' : '原文需含日期';
  $('#apply-entry').disabled = result.isEmpty || !state.previewDate;
}

function renderRecentDays() { /* daily view renders the recent-days table */ }

function renderAll() {
  const stats = currentStats();
  const personOptions = members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`).join('');
  $('#overview-person').innerHTML = personOptions;
  $('#people-person').innerHTML = personOptions;
  renderHeader(stats); renderMetrics(stats); renderOverviewTable(stats); renderWeeklyHighlight(stats); renderLineChart(stats); renderRanking(stats); renderWeekly(stats); renderPerson(stats); renderDaily(stats); renderRecentDays();
}

function setView(view) {
  $$('.view-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `view-${view}`));
  $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const titles = { overview: ['總覽', '今天也一起，慢慢累積'], weekly: ['每週統計', '每週都看得見'], people: ['個人進度', '看見自己的節奏'], daily: ['每日匯入', '貼上今天的接龍'] };
  $('#page-title').textContent = titles[view][0]; $('#page-subtitle').textContent = titles[view][1];
  document.body.dataset.view = view;
}

function bindEvents() {
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#overview-week').addEventListener('change', (event) => { state.selectedWeek = Number(event.target.value); renderAll(); });
  $('#weekly-week').addEventListener('change', (event) => { state.selectedWeek = Number(event.target.value); renderAll(); });
  $('#overview-person').addEventListener('change', (event) => { state.selectedPerson = event.target.value; renderAll(); });
  $('#people-person').addEventListener('change', (event) => { state.selectedPerson = event.target.value; renderAll(); });
  $('#preview-entry').addEventListener('click', () => {
    state.previewDate = inferRelayDate($('#relay-input').value);
    if (state.previewDate) state.selectedDate = state.previewDate;
    state.preview = parseRelay($('#relay-input').value, members); renderPreview(state.preview);
  });
  $('#apply-entry').addEventListener('click', () => {
    if (!state.preview || !state.previewDate || state.preview.unknown.length || state.preview.isEmpty) return;
    const date = state.previewDate;
    state.selectedDate = date;
    state.records[date] = [...state.preview.ids];
    const known = new Set(members.map((member) => normaliseName(member.name)));
    state.preview.newNames.forEach((name) => { if (!known.has(normaliseName(name))) { members.push({ id: `m${String(members.length + 1).padStart(2, '0')}`, name }); known.add(normaliseName(name)); } });
    if (!state.importedDays.includes(date)) state.importedDays.push(date);
    state.importedDays.sort(); state.rawInputs[date] = $('#relay-input').value; state.asOf = !state.asOf || date > state.asOf ? date : state.asOf; state.preview = null; state.previewDate = null;
    persistData(); renderAll(); toast(`${formatDate(date, true)} 已更新，繼續累積！`, 'success');
  });
  $('#export-pdf').addEventListener('click', () => { window.print(); });
  $('#copy-summary').addEventListener('click', async () => {
    const stats = currentStats(); const asOf = stats.asOf ? `截至 ${formatDate(stats.asOf, true)}` : '尚未匯入資料'; const total = stats.people.reduce((sum, person) => sum + person.count, 0); const text = `打卡累積｜${asOf}\n團體完成 ${total} 次｜團體達成率 ${pct(members.length * stats.elapsedDays ? total / (members.length * stats.elapsedDays) : null)}`;
    try { await navigator.clipboard.writeText(text); toast('摘要已複製，可以貼到群組。', 'success'); } catch { toast('目前無法自動複製，請直接選取畫面文字。', 'info'); }
  });
}

if (typeof globalThis !== 'undefined') globalThis.CheckinCore = { parseDate, dateKey, addDays, getWeekIndex, getWeekDates, getTotalDaysThrough, inferRelayDate, parseRelay, calculateStats, buildFixture };

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const weekOptions = Array.from({ length: 8 }, (_, index) => `<option value="${index}">${weekLabel(index)}</option>`).join('');
    $('#overview-week').innerHTML = weekOptions; $('#weekly-week').innerHTML = weekOptions;
    const personOptions = members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`).join('');
    $('#overview-person').innerHTML = personOptions; $('#people-person').innerHTML = personOptions;
    bindEvents(); renderAll(); setView('overview');
  });
}

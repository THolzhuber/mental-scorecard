(() => {
'use strict';
const KEY = 'mentale-scorecard:v1';
const CATS = [
  { k: 'routine', label: 'Pre-Shot-Routine eingehalten', short: 'Routine' },
  { k: 'commit', label: '100% Commitment zum Schlag', short: 'Commit.' },
  { k: 'reaction', label: 'Positive Reaktion / Akzeptanz', short: 'Reakt.' },
  { k: 'focus', label: 'Fokus im Moment', short: 'Fokus' }
];
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- storage ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.rounds)) return d;
  } catch (e) { /* ignore */ }
  return { rounds: [], current: null };
}
let db = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage full/private */ } }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }); };
const newHole = () => ({ routine: false, commit: false, reaction: false, focus: false, strokes: null });
const getRound = id => db.rounds.find(r => r.id === id);

// ---------- scoring ----------
function played(r) { return r.holes.slice(0, r.playedCount ?? r.holeCount); }
function score(r) {
  const hs = played(r), n = hs.length;
  const per = {}; let hits = 0;
  CATS.forEach(c => { const h = hs.filter(x => x[c.k]).length; per[c.k] = n ? Math.round(h / n * 100) : 0; hits += h; });
  const pct = n ? Math.round(hits / (n * 4) * 100) : 0;
  const strokes = hs.reduce((a, h) => a + (h.strokes || 0), 0);
  const any = hs.some(h => h.strokes);
  return { pct, per, strokes, any, n };
}
const verdict = p => p >= 85 ? 'Mental stark' : p >= 65 ? 'Solide Runde' : p >= 40 ? 'Luft nach oben' : 'Daran arbeiten wir';

// ---------- state ----------
let view = { name: 'home' };
function go(v) { view = v; render(); window.scrollTo(0, 0); }

function render() {
  const fn = { home: home, setup: setup, play: play, summary: summary }[view.name];
  app.innerHTML = '<div class="view">' + fn() + '</div>';
}

// ---------- views ----------
function home() {
  const cur = db.current && getRound(db.current);
  const rounds = [...db.rounds].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const list = rounds.length ? rounds.map(r => {
    const s = score(r), inprog = r.id === db.current && !r.finished;
    return `<button class="card round" data-act="open" data-id="${r.id}">
      <div class="ring" style="--p:${s.pct}"><span>${s.pct}%</span></div>
      <div class="info"><div class="name">${esc(r.course)}${inprog ? '<span class="badge">läuft</span>' : ''}</div>
      <div class="meta">${fmtDate(r.date)} · ${r.holeCount} Löcher${s.any ? ' · ' + s.strokes + ' Schläge' : ''}</div></div>
      <span aria-hidden="true" style="color:var(--muted);font-size:22px">›</span></button>`;
  }).join('') : `<div class="card empty"><div class="flag">⛳</div><b>Noch keine Runden</b>Starte deine erste Runde und tracke, wie du mental spielst.</div>`;
  return `<header class="hero"><div class="eyebrow">Golf · Mindset</div><h1>Mentale Scorecard</h1><p>Nicht nur Schläge zählen – auch, wie du sie spielst.</p></header>
  <main class="content pull"><div class="section-title">Deine Runden</div>${list}</main>
  <div class="dock">${cur && !cur.finished ? `<div class="row"><button class="btn secondary" data-act="resume">Fortsetzen</button><button class="btn primary" data-act="new">Neue Runde</button></div>` : `<button class="btn primary" data-act="new">Neue Runde</button>`}</div>`;
}

let draft = { course: '', date: '', count: 18 };
function setup() {
  if (!draft.date) draft.date = today();
  return `<div class="topbar"><button class="link" data-act="home">‹ Zurück</button><div class="t">Neue Runde</div><span style="width:70px"></span></div>
  <main class="content"><form id="f" autocomplete="off">
  <label class="field"><span>Platz</span><input type="text" id="course" placeholder="z. B. GC Musterhausen" value="${esc(draft.course)}" maxlength="60" enterkeyhint="done"></label>
  <label class="field"><span>Datum</span><input type="date" id="date" value="${esc(draft.date)}"></label>
  <div class="lbl">Löcher</div>
  <div class="seg" role="group" aria-label="Anzahl Löcher"><button type="button" data-act="cnt" data-n="9" aria-pressed="${draft.count === 9}">9</button><button type="button" data-act="cnt" data-n="18" aria-pressed="${draft.count === 18}">18</button></div>
  </form></main>
  <div class="dock"><button class="btn primary" data-act="start">Runde starten</button></div>`;
}

function play() {
  const r = getRound(view.id); if (!r) return home();
  const i = view.hole, h = r.holes[i], last = i === r.holeCount - 1;
  const dots = r.holes.map((_, j) => `<i class="${j === i ? 'cur' : j < i ? 'done' : ''}"></i>`).join('');
  const checks = CATS.map(c => `<button class="card check" data-act="tog" data-k="${c.k}" aria-pressed="${h[c.k]}">
    <span class="box">✓</span><span class="txt">${c.label}</span><span class="yn">${h[c.k] ? 'Ja' : 'Nein'}</span></button>`).join('');
  return `<div class="topbar"><button class="link" data-act="finish">Beenden</button><div class="t">${esc(r.course)}</div><button class="link" data-act="home">Home</button></div>
  <div class="progress"><i style="width:${(i + 1) / r.holeCount * 100}%"></i></div>
  <div class="holehead"><div class="eyebrow">Loch</div><h2>${i + 1} <small>/ ${r.holeCount}</small></h2><div class="dots">${dots}</div></div>
  <main class="content" style="padding-top:18px">${checks}
  <div class="card stepper"><div class="txt">Schläge<small>optional</small></div><div class="ctl">
    <button data-act="stk" data-d="-1" aria-label="Schlag weniger">–</button><output>${h.strokes ?? '–'}</output><button data-act="stk" data-d="1" aria-label="Schlag mehr">+</button></div></div></main>
  <div class="dock"><div class="row"><button class="btn secondary back" data-act="prev" ${i === 0 ? 'disabled' : ''}>← Zurück</button>
  <button class="btn primary" data-act="next">${last ? 'Runde abschließen ✓' : 'Nächstes Loch →'}</button></div></div>`;
}

function summary() {
  const r = getRound(view.id); if (!r) return home();
  const s = score(r), hs = played(r);
  const cats = CATS.map(c => `<div class="card cat"><div class="h"><span>${c.label}</span><b>${s.per[c.k]}%</b></div><div class="bar"><i style="width:${s.per[c.k]}%"></i></div></div>`).join('');
  const rows = hs.map((h, i) => {
    const n = CATS.filter(c => h[c.k]).length;
    return `<tr><td>${i + 1}</td>${CATS.map(c => `<td class="${h[c.k] ? 'y' : 'n'}">${h[c.k] ? '✓' : '·'}</td>`).join('')}<td>${h.strokes ?? '–'}</td><td class="pct">${n * 25}%</td></tr>`;
  }).join('');
  return `<div class="topbar"><button class="link" data-act="home">‹ Home</button><div class="t">Zusammenfassung</div><span style="width:70px"></span></div>
  <main class="content">
  <div class="card score"><div class="eyebrow" style="color:var(--muted)">${esc(r.course)} · ${fmtDate(r.date)}</div>
    <div class="big" style="margin-top:14px">${s.pct}<sup>%</sup></div><div class="sub">Mental-Score · ${s.n} von ${r.holeCount} Löchern</div><div class="verdict">${verdict(s.pct)}</div></div>
  <div class="section-title">Kategorien</div>${cats}
  ${s.any ? `<div class="card stat"><span>Schläge gesamt</span><b>${s.strokes}</b></div>` : ''}
  <div class="section-title" style="margin-top:16px">Loch für Loch</div>
  <div class="card tblwrap"><table class="tbl"><thead><tr><th>Loch</th>${CATS.map(c => `<th>${c.short}</th>`).join('')}<th>Schl.</th><th>Mental</th></tr></thead><tbody>${rows}</tbody></table></div>
  </main>
  <div class="dock"><div class="row"><button class="btn danger back" data-act="askdel">Löschen</button><button class="btn primary" data-act="home">Fertig</button></div></div>`;
}

function modal(html) { const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>'; m.addEventListener('click', e => { if (e.target === m) m.remove(); }); document.body.appendChild(m); return m; }

// ---------- actions ----------
function finishRound(id, count) {
  const r = getRound(id); if (!r) return;
  r.finished = true; r.playedCount = count; if (db.current === id) db.current = null; save();
  go({ name: 'summary', id });
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, r = view.id && getRound(view.id);
  if (a === 'home') return go({ name: 'home' });
  if (a === 'new') { draft = { course: '', date: today(), count: 18 }; return go({ name: 'setup' }); }
  if (a === 'open') { const x = getRound(t.dataset.id); if (!x) return; return go(x.id === db.current && !x.finished ? { name: 'play', id: x.id, hole: x.cursor || 0 } : { name: 'summary', id: x.id }); }
  if (a === 'resume') { const x = getRound(db.current); if (x) go({ name: 'play', id: x.id, hole: x.cursor || 0 }); return; }
  if (a === 'cnt') { draft.course = document.getElementById('course').value; draft.date = document.getElementById('date').value || today(); draft.count = +t.dataset.n; return render(); }
  if (a === 'start') {
    const course = document.getElementById('course').value.trim() || 'Golfrunde';
    const date = document.getElementById('date').value || today();
    const n = draft.count;
    const round = { id: uid(), course, date, holeCount: n, holes: Array.from({ length: n }, newHole), cursor: 0, finished: false };
    db.rounds.push(round); db.current = round.id; save();
    return go({ name: 'play', id: round.id, hole: 0 });
  }
  if (a === 'tog') { r.holes[view.hole][t.dataset.k] ^= 1; r.holes[view.hole][t.dataset.k] = !!r.holes[view.hole][t.dataset.k]; save(); const y = window.scrollY; render(); window.scrollTo(0, y); if (navigator.vibrate) navigator.vibrate(8); return; }
  if (a === 'stk') { const h = r.holes[view.hole]; const v = (h.strokes ?? 0) + +t.dataset.d; h.strokes = v <= 0 ? null : Math.min(v, 20); save(); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'prev') { view.hole = Math.max(0, view.hole - 1); r.cursor = view.hole; save(); return go(view); }
  if (a === 'next') {
    if (view.hole >= r.holeCount - 1) return finishRound(r.id, r.holeCount);
    view.hole++; r.cursor = view.hole; save(); return go(view);
  }
  if (a === 'finish') {
    const m = modal(`<h3>Runde beenden?</h3><p>Die Auswertung zählt Loch 1 bis ${view.hole + 1}.</p>
      <button class="btn primary small" data-act="finishyes">Beenden &amp; auswerten</button><button class="btn secondary small" data-act="close">Weiterspielen</button>`);
    return;
  }
  if (a === 'finishyes') { document.querySelector('.modal')?.remove(); return finishRound(view.id, view.hole + 1); }
  if (a === 'askdel') { modal(`<h3>Runde löschen?</h3><p>Diese Runde wird endgültig von diesem Gerät entfernt.</p>
      <button class="btn danger small" data-act="delyes">Endgültig löschen</button><button class="btn secondary small" data-act="close">Abbrechen</button>`); return; }
  if (a === 'delyes') { db.rounds = db.rounds.filter(x => x.id !== view.id); if (db.current === view.id) db.current = null; save(); document.querySelector('.modal')?.remove(); return go({ name: 'home' }); }
  if (a === 'close') { document.querySelector('.modal')?.remove(); }
});
document.addEventListener('submit', e => e.preventDefault());

// initial view: resume running round
const cur = db.current && getRound(db.current);
if (cur && !cur.finished) view = { name: 'play', id: cur.id, hole: cur.cursor || 0 };
render();

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

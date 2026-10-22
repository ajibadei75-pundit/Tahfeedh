/* =========================================================================
   Noor Hifz — Madrasah module
   Roles: Super Admin (admin) · Madrasah Admin · Teacher · Student
   Depends on helpers defined in index.html (called at runtime, not load time):
   $, esc, api, tk, toast, burst, openModal, closeModal, sk, badge, animate,
   go, session, role, initials, ring, keyOf, ferr, busy, getSurahs
   ========================================================================= */

/* ------------------------------ helpers ------------------------------ */
const dParts = d => String(d).slice(0, 10).split('-').map(Number);
const dFmt = d => { if (!d) return '—'; const p = dParts(d); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const dShort = d => { const p = dParts(d); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
const daysSince = d => { if (!d) return null; const p = dParts(d); return Math.floor((Date.now() - new Date(p[0], p[1] - 1, p[2]).getTime()) / 864e5); };
const lastRead = d => { const n = daysSince(d); if (n === null) return '<span class="risk">Never</span>'; if (n === 0) return 'Today'; if (n === 1) return 'Yesterday'; return n > 14 ? `<span class="risk">${n} days ago</span>` : `${n} days ago`; };
const fmtCode = c => c ? String(c).replace(/^(.{3})(.*)$/, '$1-$2') : '';
const num = (n, d = 1) => { const v = +n || 0; return Number.isInteger(v) ? String(v) : v.toFixed(d).replace(/\.?0+$/, ''); };
const pctOf = (a, b) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;
const stars = (v, cls) => `<span class="stars ${cls || ''}" style="--v:${+v || 0}" role="img" aria-label="${v ? (+v).toFixed(1) : 'No'} out of 5 stars">★★★★★</span>`;
const genChip = g => g ? `<span class="gchip g-${g}">${g === 'male' ? 'Male' : 'Female'}</span>` : '';
const RLAB = ['', 'Needs work', 'Fair', 'Good', 'Very good', 'Excellent'];
const roleLabel = r => ({ admin: 'Super Admin', madrasah_admin: 'Madrasah Admin', teacher: 'Teacher', user: 'Student', scholar: 'Scholar' })[r] || r;
const ageOf = y => y ? new Date().getFullYear() - y : null;
function copyVal(t, label) { navigator.clipboard.writeText(t).then(() => toast((label || 'Code') + ' copied'), () => toast('Could not copy', true)); }
function csvDownload(rows, name) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
}
function printHTML(html) { $('#printarea').innerHTML = html; window.print(); }
function ui() { animate(); chartsIn(); }

/* ------------------------------ charts ------------------------------ */
function donut(slices, top, sub) {
  const C = 2 * Math.PI * 40, tot = slices.reduce((a, s) => a + s.v, 0);
  if (!tot) return '<div class="empty" style="padding:10px">No data yet</div>';
  let off = 0;
  const segs = slices.filter(s => s.v > 0).map(s => {
    const len = s.v / tot * C;
    const el = `<circle class="dseg" cx="50" cy="50" r="40" stroke="${s.color}" data-da="${len.toFixed(2)} ${(C - len).toFixed(2)}" style="stroke-dasharray:0 ${C.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"/>`;
    off += len; return el;
  }).join('');
  return `<svg class="donut" viewBox="0 0 100 100" role="img" aria-label="${slices.map(s => s.label + ' ' + s.v).join(', ')}"><circle cx="50" cy="50" r="40" stroke="var(--line-soft)"/>${segs}<text x="50" y="50" text-anchor="middle" font-size="17" font-weight="600">${top}</text><text x="50" y="62" text-anchor="middle" font-size="6.5" style="fill:var(--ink-soft)">${sub || ''}</text></svg>`;
}
function chartsIn() { document.querySelectorAll('.dseg').forEach(c => requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDasharray = c.dataset.da; }))); }
function hBars(items, fmtV) {
  const max = Math.max(1, ...items.map(i => i.v));
  return items.map(i => `<div style="margin-bottom:12px"><div class="row between meta"><span>${i.label}</span><b>${fmtV ? fmtV(i) : i.v}</b></div><div class="bar"><i data-w="${Math.round(i.v / max * 100)}%" ${i.color ? `style="background:${i.color}"` : ''}></i></div></div>`).join('');
}
function weeklyBars(weeks, stacked) {
  const W = 320, H = 120, pad = 10, bw = (W - pad * 2) / weeks.length;
  const max = Math.max(1, ...weeks.map(w => stacked ? (w.male || 0) + (w.female || 0) : (w.pages || 0)));
  let o = `<svg viewBox="0 0 ${W} ${H + 22}" width="100%" role="img" aria-label="Pages per week">`;
  weeks.forEach((w, i) => {
    const x = pad + i * bw + bw * .16, bwid = bw * .68, delay = i * 55;
    if (stacked) {
      const hm = (w.male || 0) / max * H, hf = (w.female || 0) / max * H;
      o += `<rect class="gr" style="animation-delay:${delay}ms" x="${x}" y="${H - hm}" width="${bwid}" height="${hm}" rx="3" fill="var(--gm)"><title>${dShort(w.week)}: boys ${num(w.male)} pages</title></rect>`;
      o += `<rect class="gr" style="animation-delay:${delay}ms" x="${x}" y="${H - hm - hf}" width="${bwid}" height="${hf}" rx="3" fill="var(--gf)"><title>${dShort(w.week)}: girls ${num(w.female)} pages</title></rect>`;
    } else {
      const h = (w.pages || 0) / max * H;
      o += `<rect class="gr" style="animation-delay:${delay}ms" x="${x}" y="${H - h}" width="${bwid}" height="${Math.max(h, w.pages ? 2 : 0)}" rx="3" fill="var(--gold)"><title>${dShort(w.week)}: ${num(w.pages)} pages</title></rect>`;
    }
    if (i % (weeks.length > 8 ? 2 : 1) === 0) o += `<text x="${x + bwid / 2}" y="${H + 14}" text-anchor="middle" font-size="8" style="fill:var(--ink-soft)">${dShort(w.week)}</text>`;
  });
  return o + '</svg>';
}
function ratingLine(rs) {
  if (rs.length < 2) return '<p class="hint">Your rating trend appears after two sessions.</p>';
  const W = 300, H = 70, step = W / (rs.length - 1), pts = rs.map((r, i) => [i * step, H - (r.r - 1) / 4 * H * .84 - 5]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="Your ratings over time"><path d="${path}" pathLength="1" class="drawline" fill="none" stroke="var(--gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="var(--gold)"><title>${rs[i].r} stars · ${dFmt(rs[i].d)}</title></circle>`).join('')}</svg>`;
}
function heatmap(heat) {
  const map = {}; heat.forEach(h => map[String(h.d).slice(0, 10)] = +h.pages);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - 12 * 7);
  let cells = '';
  for (let i = 0; i < 13 * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = keyOf(d), p = map[k] || 0, l = p <= 0 ? 0 : p <= 1 ? 1 : p <= 2 ? 2 : p <= 4 ? 3 : 4;
    cells += `<i data-l="${l}" ${d > today ? 'style="visibility:hidden"' : ''} title="${dFmt(k)}: ${p ? num(p) + ' pages' : 'no session'}"></i>`;
  }
  return `<div class="heat" role="img" aria-label="Recitation activity, last 13 weeks">${cells}</div>`;
}

/* ====================================================================
   SUPER ADMIN — madrasahs
   ==================================================================== */
let MADS = null, SCOPE = null;
async function ensureMads() { if (role() === 'admin' && !MADS) { try { MADS = await api('sa_list_madrasahs', { p_token: tk() }); } catch (e) { MADS = []; } } }
const scopeArg = () => role() === 'admin' ? { p_madrasah_id: SCOPE } : {};
function scopeBar(fn) {
  if (role() !== 'admin') return '';
  return `<div class="scopebar noprint"><label style="margin:0" for="scopeSel">Madrasah</label><select id="scopeSel" onchange="SCOPE=this.value||null;${fn}()"><option value="">All madrasahs</option>${(MADS || []).map(m => `<option value="${m.id}" ${SCOPE === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>`;
}
function codeRow(label, code, id, which) {
  return `<div class="coderow"><span class="meta" style="min-width:68px">${label}</span><span class="codepill">${esc(code)}</span><button class="btn sm ghost" onclick="copyVal('${code}','${label} code')">Copy</button><button class="btn sm ghost" onclick="regenPrompt('${id}','${which}')">New code</button></div>`;
}
async function viewMadrasahs() {
  $('#main').innerHTML = `<div class="panel st"><div class="row between"><div><h2>Madrasahs</h2><p class="hint">Give a madrasah access to organise its Tahfidh classes. Each gets three join codes — share the matching one with its admin, teachers and students.</p></div><button class="btn" onclick="madModal()">New madrasah</button></div></div><div id="ml">${sk(2)}</div>`;
  ui();
  try { MADS = await api('sa_list_madrasahs', { p_token: tk() }); renderMads(); } catch (e) { $('#ml').innerHTML = `<div class="panel empty">${esc(e.message)}</div>`; }
}
function renderMads() {
  $('#ml').innerHTML = MADS.length ? MADS.map(m => `<div class="card"><div class="row between"><div><h3 style="font-size:17px">${esc(m.name)}</h3><div class="meta">${esc([m.city, m.country].filter(Boolean).join(', ') || 'No location set')} · created ${dFmt(m.created_at)}</div></div><span class="badge ${m.active ? 'b-approved' : 'b-rejected'}">${m.active ? 'Active' : 'Deactivated'}</span></div>
    <div class="grid g4" style="margin:14px 0"><div class="stat"><b>${m.students}</b><span>Students</span></div><div class="stat"><b>${m.teachers}</b><span>Teachers</span></div><div class="stat"><b>${num(m.pages)}</b><span>Pages logged</span></div><div class="stat"><b>${m.sessions}</b><span>Sessions</span></div></div>
    <div style="margin-bottom:12px">${codeRow('Admin', m.admin_code, m.id, 'admin')}${codeRow('Teacher', m.teacher_code, m.id, 'teacher')}${codeRow('Student', m.student_code, m.id, 'student')}</div>
    <div class="row"><button class="btn sm" onclick="SCOPE='${m.id}';go('analytics')">Analytics</button><button class="btn sm ghost" onclick="SCOPE='${m.id}';go('members')">Members</button><button class="btn sm ghost" onclick="madModal('${m.id}')">Edit</button><button class="btn sm ${m.active ? 'danger' : ''}" onclick="toggleMad('${m.id}',${!m.active})">${m.active ? 'Deactivate' : 'Reactivate'}</button></div></div>`).join('')
    : `<div class="panel empty">No madrasahs yet.<br><button class="btn sm" style="margin-top:10px" onclick="madModal()">Create the first madrasah</button></div>`;
  ui();
}
function madModal(id) {
  const m = id ? MADS.find(x => x.id === id) : null;
  openModal(`<h3>${m ? 'Edit madrasah' : 'New madrasah'}</h3><div class="field"><label>Name</label><input id="mmN" value="${esc(m ? m.name : '')}" placeholder="e.g. Al-Noor Tahfidh Centre"></div>
    <div class="grid g2"><div class="field"><label>City</label><input id="mmC" value="${esc(m ? m.city : '')}"></div><div class="field"><label>Country</label><input id="mmK" value="${esc(m ? m.country : '')}"></div></div>
    <div class="ferr" id="mmE" role="alert"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveMad('${id || ''}')">${m ? 'Save changes' : 'Create madrasah'}</button></div>`);
  animate();
}
async function saveMad(id) {
  const n = $('#mmN').value.trim(); if (n.length < 2) { ferr('mmE', 'Enter the madrasah name'); return; }
  try {
    if (id) { const m = MADS.find(x => x.id === id); await api('sa_update_madrasah', { p_token: tk(), p_id: id, p_name: n, p_city: $('#mmC').value, p_country: $('#mmK').value, p_active: m.active }); toast('Madrasah updated'); }
    else { await api('sa_create_madrasah', { p_token: tk(), p_name: n, p_city: $('#mmC').value, p_country: $('#mmK').value }); burst(); toast('Madrasah created — share its codes'); }
    closeModal(); viewMadrasahs();
  } catch (e) { ferr('mmE', e.message); }
}
function toggleMad(id, active) {
  const m = MADS.find(x => x.id === id);
  if (active) { doToggleMad(id, true); return; }
  openModal(`<h3>Deactivate ${esc(m.name)}?</h3><p class="hint">Its admins, teachers and students will be unable to sign in until you reactivate it. All their data is kept.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="doToggleMad('${id}',false)">Deactivate</button></div>`);
}
async function doToggleMad(id, active) {
  const m = MADS.find(x => x.id === id);
  try { await api('sa_update_madrasah', { p_token: tk(), p_id: id, p_name: m.name, p_city: m.city, p_country: m.country, p_active: active }); closeModal(); toast(active ? 'Madrasah reactivated' : 'Madrasah deactivated'); viewMadrasahs(); } catch (e) { toast(e.message, true); }
}
function regenPrompt(id, which) {
  openModal(`<h3>Generate a new ${which} code?</h3><p class="hint">The old code stops working immediately. People who already have accounts are not affected.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="doRegen('${id}','${which}')">Generate</button></div>`);
}
async function doRegen(id, which) {
  try { await api('regen_code', { p_token: tk(), p_madrasah_id: id, p_which: which }); closeModal(); toast('New code generated'); role() === 'admin' ? viewMadrasahs() : viewMDash(); } catch (e) { toast(e.message, true); }
}

/* ====================================================================
   ANALYTICS — Super Admin (all or one madrasah) + Madrasah Admin
   ==================================================================== */
let AN = null;
function insights(a) {
  const out = [], bg = a.by_gender || {}, m = bg.male, f = bg.female;
  if (m && f && m.students && f.students) {
    const pm = m.pages / m.students, pf = f.pages / f.students;
    if (pm > 0 && pf > 0) {
      const diff = Math.round(Math.abs(pf - pm) / Math.min(pf, pm) * 100);
      out.push(['', diff >= 10 ? `${pf > pm ? 'Girls' : 'Boys'} are memorising ${diff}% more pages per student than ${pf > pm ? 'boys' : 'girls'} (${num(Math.max(pm, pf))} vs ${num(Math.min(pm, pf))}).` : 'Boys and girls are progressing at a similar pace.']);
    }
  }
  if (a.students) { const act = Math.round(a.active_30d / a.students * 100); out.push([act >= 70 ? '' : '', `${act}% of students recited for a teacher in the last 30 days.`]); }
  if (a.at_risk_count) out.push(['', `${a.at_risk_count} student${a.at_risk_count === 1 ? ' has' : 's have'} not recited in 14+ days — see the follow-up list below.`]);
  if (a.sessions) out.push([a.avg_rating >= 4 ? '' : '', `Average teacher rating is ${num(a.avg_rating, 2)} / 5 across ${a.sessions} sessions.`]);
  const w = a.weekly || [];
  if (w.length >= 2) { const l = w[w.length - 1].pages, p = w[w.length - 2].pages; if (p > 0) { const ch = Math.round((l - p) / p * 100); out.push([ch >= 0 ? '' : '', `This week so far: ${Math.abs(ch)}% ${ch >= 0 ? 'above' : 'below'} last week's pages.`]); } }
  return out.length ? out : [['ℹ', 'Insights appear once teachers start logging sessions.']];
}
async function viewAnalytics() {
  $('#main').innerHTML = `<div id="anTop"></div><div id="anBody">${sk(3)}</div>`;
  await ensureMads();
  $('#anTop').innerHTML = `<div class="panel st"><div class="row between"><div><h2>Analytics</h2><p class="hint">Gender, age, progress, ratings and teacher activity — live from teacher-logged sessions.</p></div><div class="row noprint"><button class="btn sm ghost" onclick="exportStudents()">Students CSV</button><button class="btn sm ghost" onclick="exportSessions()">Sessions CSV</button><button class="btn sm ghost" onclick="printAnalytics()">Print</button></div></div>${scopeBar('viewAnalytics')}</div>`;
  ui();
  try { AN = await api('ma_analytics', { p_token: tk(), ...scopeArg() }); renderAnalytics(); } catch (e) { $('#anBody').innerHTML = `<div class="panel empty">${esc(e.message)}</div>`; }
}
function renderAnalytics() {
  const a = AN, bg = a.by_gender || {}, z = { students: 0, pages: 0, avg_rating: 0, sessions: 0, active_30d: 0 };
  const m = bg.male || z, f = bg.female || z, totG = m.students + f.students;
  const per = g => g.students ? g.pages / g.students : 0;
  const tg = a.teachers_by_gender || {};
  const kpi = (v, l, extra) => `<div class="stat"><b ${typeof v === 'number' ? `data-count="${Math.round(v)}"` : ''}>${typeof v === 'number' ? 0 : v}</b><span>${l}</span>${extra || ''}</div>`;
  const hi = (x, y) => x > y ? 'style="font-weight:700;color:var(--heading)"' : '';
  const ages = (a.by_age || []).map(g => ({ label: `${g.group}`, v: g.students, sub: g.avg_rating }));
  const rt = a.ratings || {}, bk = a.buckets || {};
  const B = [['100', 'Target reached'], ['75-99', '75–99%'], ['50-74', '50–74%'], ['25-49', '25–49%'], ['0-24', 'Under 25%']];
  $('#anBody').innerHTML = `
  <div class="grid g4 st">${kpi(a.students, 'Students')}${kpi(a.teachers, 'Teachers', `<div class="meta">${tg.male || 0} male · ${tg.female || 0} female</div>`)}${kpi(Math.round(a.pages), 'Pages memorised')}${kpi(a.sessions, 'Sessions logged')}</div>
  <div class="grid g4 st" style="margin-top:14px"><div class="stat"><b>${num(a.avg_rating, 2)}</b><span>Average rating</span><div>${stars(a.avg_rating)}</div></div>${kpi(a.students ? Math.round(a.active_30d / a.students * 100) : 0, 'Active (30 days) %')}${kpi(a.at_risk_count, 'Need follow-up')}${kpi(a.madrasahs, a.scope === 'All madrasahs' ? 'Madrasahs' : 'Madrasah')}</div>
  <div class="panel st" style="margin-top:16px"><h2>What stands out</h2>${insights(a).map(i => `<div class="insight"><span>${i[1]}</span></div>`).join('')}</div>
  <div class="grid g2">
   <div class="panel st"><h2>Students by gender</h2><div class="row" style="gap:22px;margin-top:10px">${donut([{ label: 'Male', v: m.students, color: 'var(--gm)' }, { label: 'Female', v: f.students, color: 'var(--gf)' }], totG, 'students')}
     <div class="legend"><span><i style="background:var(--gm)"></i>Male — <b>${m.students}</b> (${totG ? Math.round(m.students / totG * 100) : 0}%)</span><span><i style="background:var(--gf)"></i>Female — <b>${f.students}</b> (${totG ? Math.round(f.students / totG * 100) : 0}%)</span></div></div></div>
   <div class="panel st"><h2>Gender comparison</h2><div class="tblwrap"><table class="tbl" style="margin-top:8px"><tr><th></th><th>Male</th><th>Female</th></tr>
     <tr><td>Students</td><td ${hi(m.students, f.students)}>${m.students}</td><td ${hi(f.students, m.students)}>${f.students}</td></tr>
     <tr><td>Active (30d)</td><td ${hi(m.active_30d, f.active_30d)}>${m.active_30d}</td><td ${hi(f.active_30d, m.active_30d)}>${f.active_30d}</td></tr>
     <tr><td>Pages memorised</td><td ${hi(m.pages, f.pages)}>${num(m.pages)}</td><td ${hi(f.pages, m.pages)}>${num(f.pages)}</td></tr>
     <tr><td>Pages / student</td><td ${hi(per(m), per(f))}>${num(per(m))}</td><td ${hi(per(f), per(m))}>${num(per(f))}</td></tr>
     <tr><td>Avg rating</td><td ${hi(m.avg_rating, f.avg_rating)}>${m.avg_rating ? stars(m.avg_rating) + ' ' + num(m.avg_rating, 2) : '—'}</td><td ${hi(f.avg_rating, m.avg_rating)}>${f.avg_rating ? stars(f.avg_rating) + ' ' + num(f.avg_rating, 2) : '—'}</td></tr></table></div></div>
  </div>
  <div class="panel st"><div class="row between"><h2>Pages per week by gender</h2><div class="legend" style="flex-direction:row;gap:14px"><span><i style="background:var(--gm)"></i>Male</span><span><i style="background:var(--gf)"></i>Female</span></div></div><div style="margin-top:12px">${weeklyBars(a.weekly || [], true)}</div></div>
  <div class="grid g2">
   <div class="panel st"><h2>Age groups</h2><div style="margin-top:12px">${ages.length ? hBars(ages, i => `${i.v} students${i.sub ? ' · ★ ' + num(i.sub, 1) : ''}`) : '<p class="hint">No data yet</p>'}</div></div>
   <div class="panel st"><h2>Rating distribution</h2><div style="margin-top:12px">${[5, 4, 3, 2, 1].map(r => ({ label: `${'★'.repeat(r)} ${RLAB[r]}`, v: +(rt[r] || 0) })).length ? hBars([5, 4, 3, 2, 1].map(r => ({ label: `${r} ★ · ${RLAB[r]}`, v: +(rt[r] || 0) }))) : ''}</div></div>
  </div>
  <div class="grid g2">
   <div class="panel st"><h2>Progress toward targets</h2><div style="margin-top:12px">${hBars(B.map(([k, l]) => ({ label: l, v: +(bk[k] || 0) })), i => `${i.v} students`)}</div></div>
   <div class="panel st"><h2>Classes</h2><div style="margin-top:12px">${(a.classes || []).length ? hBars((a.classes || []).map(c => ({ label: esc(c.class_name), v: +c.pages })), i => `${num(i.v)} pages`) : '<p class="hint">Add class names to students to compare classes.</p>'}</div></div>
  </div>
  <div class="grid g2">
   <div class="panel st"><h2>Top students</h2>${(a.top || []).length ? (a.top || []).map((s, i) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>${i + 1}. ${esc(s.name)}</b> ${genChip(s.gender)}<div class="meta">${esc(s.class_name || 'No class')}</div></div><div style="text-align:right"><b>${num(s.pages)} pages</b><div>${stars(s.avg_rating)}</div></div></div>`).join('') : '<p class="hint">Nobody has been logged yet.</p>'}</div>
   <div class="panel st"><h2>Needs follow-up</h2>${(a.at_risk || []).length ? (a.at_risk || []).map(s => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>${esc(s.name)}</b> ${genChip(s.gender)}<div class="meta">${esc(s.class_name || 'No class')} · code ${fmtCode(s.code)}</div></div><div class="meta" style="text-align:right">Last read<br>${lastRead(s.last_session)}</div></div>`).join('') : '<p class="hint">Everyone has recited in the last 14 days </p>'}</div>
  </div>
  <div class="panel st"><h2>Teacher activity</h2><div class="tblwrap">${(a.teachers_activity || []).length ? `<table class="tbl"><tr><th>Teacher</th><th>Sessions</th><th>Students</th><th>Pages</th><th>Avg rating given</th><th>Last session</th></tr>${a.teachers_activity.map(t => `<tr><td><b>${esc(t.name)}</b> ${genChip(t.gender)}</td><td>${t.sessions}</td><td>${t.students}</td><td>${num(t.pages)}</td><td>${t.avg_rating ? stars(t.avg_rating) + ' ' + num(t.avg_rating, 2) : '—'}</td><td class="meta">${t.last_session ? dFmt(t.last_session) : '—'}</td></tr>`).join('')}</table>` : '<p class="hint">No teachers yet.</p>'}</div></div>
  ${(a.madrasah_compare || []).length ? `<div class="panel st"><h2>Madrasah comparison</h2><div class="tblwrap"><table class="tbl"><tr><th>Madrasah</th><th>Students</th><th>Teachers</th><th>Pages</th><th>Avg rating</th></tr>${a.madrasah_compare.map(c => `<tr><td><b>${esc(c.name)}</b> ${c.active ? '' : '<span class="badge b-rejected">Off</span>'}</td><td>${c.students}</td><td>${c.teachers}</td><td>${num(c.pages)}</td><td>${c.avg_rating ? stars(c.avg_rating) + ' ' + num(c.avg_rating, 2) : '—'}</td></tr>`).join('')}</table></div></div>` : ''}`;
  ui();
}
function printAnalytics() { printHTML(`<div class="report"><h1>Noor Hifz — Analytics</h1><p>${esc(AN.scope)} · ${new Date().toLocaleDateString()}</p>${$('#anBody').innerHTML}</div>`); }
async function exportStudents() {
  try {
    const d = await api('madrasah_members', { p_token: tk(), ...scopeArg() });
    csvDownload([['Madrasah', 'Name', 'Username', 'Student code', 'Gender', 'Birth year', 'Class', 'Target pages', 'Pages memorised', 'Progress %', 'Sessions', 'Avg rating', 'Last session', 'Plan']]
      .concat(d.students.map(s => [s.madrasah, s.name, s.username, s.code, s.gender, s.birth_year, s.class_name, s.target_pages, s.pages, pctOf(s.pages, s.target_pages || 604), s.sessions, s.avg_rating, s.last_session, s.plan_text])), `students-${keyOf(new Date())}.csv`);
    toast('Students exported');
  } catch (e) { toast(e.message, true); }
}
async function exportSessions() {
  try {
    const d = await api('ma_list_sessions', { p_token: tk(), p_limit: 5000, ...scopeArg() });
    csvDownload([['Date', 'Madrasah', 'Student', 'Code', 'Gender', 'Teacher', 'Pages', 'Portion', 'Rating', 'Comment']]
      .concat(d.map(s => [s.session_date, s.madrasah, s.student, s.code, s.gender, s.teacher, s.pages, s.portion, s.rating, s.comment])), `sessions-${keyOf(new Date())}.csv`);
    toast('Sessions exported');
  } catch (e) { toast(e.message, true); }
}

/* ====================================================================
   MEMBERS (Super Admin + Madrasah Admin)
   ==================================================================== */
let MEM = null, memTab = 'students', memClass = 'all', memGender = 'all';
async function viewMembers() {
  $('#main').innerHTML = `<div id="memTop"></div><div class="panel" id="memBody">${sk(3)}</div>`;
  await ensureMads();
  $('#memTop').innerHTML = `<div class="panel st"><div class="row between"><div><h2>Members</h2><p class="hint">Students and teachers, with live progress. Tap a student's code to copy it.</p></div><button class="btn sm ghost noprint" onclick="exportStudents()">Export CSV</button></div>${scopeBar('viewMembers')}<input id="memQ" style="margin-top:14px" placeholder="Search by name, username or code…" oninput="renderMembers()" aria-label="Search members"></div>`;
  ui();
  try { MEM = await api('madrasah_members', { p_token: tk(), ...scopeArg() }); renderMembers(); } catch (e) { $('#memBody').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function renderMembers() {
  const q = (($('#memQ') || {}).value || '').toLowerCase(), all = role() === 'admin' && !SCOPE;
  const classes = [...new Set(MEM.students.map(s => s.class_name).filter(Boolean))].sort();
  let body = `<div class="chips"><button class="${memTab === 'students' ? 'on' : ''}" onclick="memTab='students';renderMembers()">Students (${MEM.students.length})</button><button class="${memTab === 'teachers' ? 'on' : ''}" onclick="memTab='teachers';renderMembers()">Teachers (${MEM.teachers.length})</button></div>`;
  if (memTab === 'students') {
    body += `<div class="row" style="margin-bottom:14px"><div class="chips" style="margin:0">${[['all', 'All'], ['male', 'Male'], ['female', 'Female']].map(g => `<button class="${memGender === g[0] ? 'on' : ''}" onclick="memGender='${g[0]}';renderMembers()">${g[1]}</button>`).join('')}</div>${classes.length ? `<select aria-label="Filter by class" style="width:auto" onchange="memClass=this.value;renderMembers()"><option value="all">All classes</option>${classes.map(c => `<option ${memClass === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}</div>`;
    const l = MEM.students.filter(s => (s.name + s.username + s.code).toLowerCase().includes(q)).filter(s => memGender === 'all' || s.gender === memGender).filter(s => memClass === 'all' || s.class_name === memClass);
    body += `<div class="tblwrap"><table class="tbl"><tr><th>Student</th>${all ? '<th>Madrasah</th>' : ''}<th>Class</th><th>Progress</th><th>Rating</th><th>Sessions</th><th>Last read</th><th></th></tr>${l.length ? l.map(s => `<tr style="${s.suspended ? 'opacity:.55' : ''}"><td><b>${esc(s.name)}</b> ${genChip(s.gender)}<div class="meta">@${esc(s.username)} · <button class="linkbtn" style="padding:0" onclick="copyVal('${s.code}','Student code')">${fmtCode(s.code)}</button>${ageOf(s.birth_year) ? ' · ' + ageOf(s.birth_year) + ' yrs' : ''}</div></td>${all ? `<td class="meta">${esc(s.madrasah)}</td>` : ''}<td class="meta">${esc(s.class_name || '—')}</td>
      <td style="min-width:130px"><div class="meta">${num(s.pages)} / ${num(s.target_pages || 604)} pages</div><div class="bar mini"><i data-w="${pctOf(s.pages, s.target_pages || 604)}%"></i></div></td><td>${s.avg_rating ? stars(s.avg_rating) : '<span class="meta">—</span>'}</td><td>${s.sessions}</td><td>${lastRead(s.last_session)}</td>
      <td><div class="row"><button class="btn sm ghost" onclick="editStudent('${s.id}')">Edit</button>${s.suspended ? `<button class="btn sm ghost" onclick="setSusp('${s.id}',false)">Reinstate</button>` : `<button class="btn sm danger" onclick="suspPrompt('${s.id}')">Suspend</button>`}</div></td></tr>`).join('') : `<tr><td colspan="8"><div class="empty">No students match.</div></td></tr>`}</table></div>`;
  } else {
    const l = MEM.teachers.filter(t => (t.name + t.username).toLowerCase().includes(q));
    body += `<div class="tblwrap"><table class="tbl"><tr><th>Name</th>${all ? '<th>Madrasah</th>' : ''}<th>Role</th><th>Status</th><th>Sessions</th><th>Students</th><th>Avg rating given</th><th>Last session</th><th></th></tr>${l.length ? l.map(t => `<tr style="${t.suspended ? 'opacity:.55' : ''}"><td><span class="dot ${t.online ? 'on' : ''}"></span><b>${esc(t.name)}</b> ${genChip(t.gender)}<div class="meta">@${esc(t.username)}</div></td>${all ? `<td class="meta">${esc(t.madrasah)}</td>` : ''}<td class="meta">${roleLabel(t.role)}</td><td>${t.role === 'teacher' ? badge(t.status || 'pending') : '<span class="meta">—</span>'}</td><td>${t.sessions}</td><td>${t.students}</td><td>${t.avg_rating ? stars(t.avg_rating) : '—'}</td><td class="meta">${t.last_session ? dFmt(t.last_session) : '—'}</td>
      <td>${t.role === 'teacher' ? `<div class="row">${t.status !== 'approved' ? `<button class="btn sm" onclick="setTStatus('${t.id}','approved')">Approve</button>` : `<button class="btn sm ghost" onclick="setTStatus('${t.id}','rejected')">Revoke</button>`}${t.suspended ? `<button class="btn sm ghost" onclick="setSusp('${t.id}',false)">Reinstate</button>` : `<button class="btn sm danger" onclick="suspPrompt('${t.id}')">Suspend</button>`}</div>` : ''}</td></tr>`).join('') : `<tr><td colspan="9"><div class="empty">No teachers yet. Share the teacher code.</div></td></tr>`}</table></div>`;
  }
  $('#memBody').innerHTML = body; ui();
}
function editStudent(id) {
  const s = MEM.students.find(x => x.id === id);
  openModal(`<h3>Edit ${esc(s.name)}</h3><div class="field"><label>Class / halaqa</label><input id="esC" value="${esc(s.class_name || '')}" placeholder="e.g. Class A"></div><div class="field"><label>Target pages</label><input id="esT" type="number" min="1" max="604" value="${s.target_pages || 604}"></div><div class="field"><label>Plan (what they are memorising)</label><textarea id="esP">${esc(s.plan_text || '')}</textarea></div><div class="ferr" id="esE" role="alert"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveStudent('${id}')">Save</button></div>`);
  animate();
}
async function saveStudent(id) {
  try { await api('ma_update_student', { p_token: tk(), p_student_id: id, p_class_name: $('#esC').value, p_target_pages: +$('#esT').value || null, p_plan_text: $('#esP').value }); closeModal(); toast('Student updated'); refreshMembers(); } catch (e) { ferr('esE', e.message); }
}
function suspPrompt(id) {
  openModal(`<h3>Suspend this account?</h3><p class="hint">They are signed out everywhere and cannot sign in until reinstated.</p><div class="field"><label>Reason (optional)</label><input id="susR"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="setSusp('${id}',true)">Suspend</button></div>`); animate();
}
async function setSusp(id, on) {
  try { await api('ma_set_suspended', { p_token: tk(), p_user_id: id, p_suspended: on, p_reason: $('#susR') ? $('#susR').value : null }); closeModal(); toast(on ? 'Account suspended' : 'Account reinstated'); refreshMembers(); } catch (e) { toast(e.message, true); }
}
async function refreshMembers() { try { MEM = await api('madrasah_members', { p_token: tk(), ...scopeArg() }); renderMembers(); } catch (e) { toast(e.message, true); } }

/* ====================================================================
   SESSIONS LOG (Super Admin + Madrasah Admin)
   ==================================================================== */
let SESS = [];
async function viewMSessions() {
  $('#main').innerHTML = `<div id="seTop"></div><div class="panel" id="seBody">${sk(3)}</div>`;
  await ensureMads();
  $('#seTop').innerHTML = `<div class="panel st"><div class="row between"><div><h2>Sessions</h2><p class="hint">Every recitation logged by teachers. Remove a mistaken entry if needed.</p></div><button class="btn sm ghost noprint" onclick="exportSessions()">Export CSV</button></div>${scopeBar('viewMSessions')}<input id="seQ" style="margin-top:14px" placeholder="Search student, teacher, portion…" oninput="renderMSessions()" aria-label="Search sessions"></div>`;
  ui();
  try { SESS = await api('ma_list_sessions', { p_token: tk(), p_limit: 400, ...scopeArg() }); renderMSessions(); } catch (e) { $('#seBody').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function renderMSessions() {
  const q = (($('#seQ') || {}).value || '').toLowerCase(), l = SESS.filter(s => (s.student + (s.teacher || '') + (s.portion || '') + (s.comment || '')).toLowerCase().includes(q));
  $('#seBody').innerHTML = l.length ? `<div class="tblwrap"><table class="tbl"><tr><th>Date</th><th>Student</th><th>Teacher</th><th>Pages</th><th>Portion</th><th>Rating</th><th>Comment</th><th></th></tr>${l.map(s => `<tr><td class="meta">${dFmt(s.session_date)}</td><td><b>${esc(s.student)}</b> ${genChip(s.gender)}</td><td class="meta">${esc(s.teacher || '—')}</td><td>${num(s.pages)}</td><td class="meta">${esc(s.portion || '—')}</td><td>${stars(s.rating)}</td><td class="meta" style="max-width:240px">${esc(s.comment || '')}</td><td><button class="btn sm ghost" onclick="delSessAdmin('${s.id}')" aria-label="Delete session"></button></td></tr>`).join('')}</table></div>` : '<div class="empty">No sessions logged yet.</div>';
  ui();
}
function delSessAdmin(id) {
  openModal(`<h3>Delete this session?</h3><p class="hint">The pages and feedback are removed from the student's record. This cannot be undone.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="doDelSessAdmin('${id}')">Delete</button></div>`);
}
async function doDelSessAdmin(id) {
  try { await api('ma_delete_session', { p_token: tk(), p_session_id: id }); closeModal(); toast('Session deleted'); SESS = SESS.filter(s => s.id !== id); renderMSessions(); } catch (e) { toast(e.message, true); }
}

/* ====================================================================
   MADRASAH ADMIN — dashboard
   ==================================================================== */
async function viewMDash() {
  $('#main').innerHTML = `<div id="mdTop">${sk(1)}</div><div id="mdBody">${sk(2)}</div>`;
  try {
    const [mad, a, ses] = await Promise.all([api('my_madrasah', { p_token: tk() }), api('ma_analytics', { p_token: tk() }), api('ma_list_sessions', { p_token: tk(), p_limit: 8 })]);
    $('#mdTop').innerHTML = `<div class="panel st"><div class="row between"><div><h2 style="font-size:22px">${esc(mad.name)}</h2><p class="hint">${esc([mad.city, mad.country].filter(Boolean).join(', ') || 'Madrasah admin dashboard')}</p></div><div class="row noprint"><button class="btn sm" onclick="go('analytics')">Full analytics</button><button class="btn sm ghost" onclick="go('members')">Members</button></div></div>
      <div style="margin-top:14px"><p class="hint" style="margin:0 0 4px">Share these codes so people can create their accounts:</p>${codeRow('Student', mad.student_code, mad.id, 'student')}${codeRow('Teacher', mad.teacher_code, mad.id, 'teacher')}</div></div>
      <div class="grid g4 st"><div class="stat"><b data-count="${a.students}">0</b><span>Students</span></div><div class="stat"><b data-count="${a.teachers}">0</b><span>Teachers</span></div><div class="stat"><b data-count="${Math.round(a.pages)}">0</b><span>Pages memorised</span></div><div class="stat"><b>${num(a.avg_rating, 2)}</b><span>Avg rating</span><div>${stars(a.avg_rating)}</div></div></div>`;
    $('#mdBody').innerHTML = `<div class="grid g2" style="margin-top:16px"><div class="panel st"><h2>Pages per week</h2><div style="margin-top:12px">${weeklyBars(a.weekly || [], true)}</div></div>
      <div class="panel st"><h2>Needs follow-up (${a.at_risk_count})</h2>${(a.at_risk || []).slice(0, 5).map(s => `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)"><div><b>${esc(s.name)}</b><div class="meta">${esc(s.class_name || 'No class')}</div></div><div class="meta">${lastRead(s.last_session)}</div></div>`).join('') || '<p class="hint">Everyone is on track </p>'}</div></div>
      <div class="panel st"><div class="row between"><h2>Latest sessions</h2><button class="btn sm ghost" onclick="go('msessions')">View all</button></div>${ses.length ? ses.map(s => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>${esc(s.student)}</b> <span class="meta">read ${num(s.pages)} pages${s.portion ? ' · ' + esc(s.portion) : ''}</span><div class="meta">with ${esc(s.teacher || '—')} · ${dFmt(s.session_date)}</div></div>${stars(s.rating)}</div>`).join('') : '<p class="hint">No sessions yet — teachers can start logging with their code.</p>'}</div>`;
    ui();
  } catch (e) { $('#mdBody').innerHTML = `<div class="panel empty">${esc(e.message)}</div>`; }
}

/* ====================================================================
   TEACHER — log a session, roster, my sessions (+ offline queue)
   ==================================================================== */
const QUICK = ['Excellent tajweed', 'Smooth and confident', 'Revise this portion again', 'Work on makharij', 'Watch the madd lengths', 'Needs more fluency', 'MashaAllah, keep going'];
let TS = null, TR = 0, PRECODE = null;
const rosterKey = () => 'nh_roster_' + (session ? session.id : '');
const cachedRoster = () => { try { return JSON.parse(localStorage.getItem(rosterKey()) || '[]'); } catch (e) { return []; } };
async function refreshRoster() {
  try { const d = await api('madrasah_members', { p_token: tk() }); localStorage.setItem(rosterKey(), JSON.stringify(d.students.map(s => ({ id: s.id, name: s.name, code: s.code, gender: s.gender, class_name: s.class_name, plan_text: s.plan_text, target_pages: s.target_pages, pages: s.pages, sessions: s.sessions, avg_rating: s.avg_rating })))); return d.students; } catch (e) { return null; }
}
const getQueue = () => { try { return JSON.parse(localStorage.getItem('nh_queue') || '[]'); } catch (e) { return []; } };
const setQueue = q => localStorage.setItem('nh_queue', JSON.stringify(q));
async function flushQueue() {
  if (!session || !['teacher', 'madrasah_admin', 'scholar'].includes(session.role) || !navigator.onLine) return;
  let q = getQueue(); if (!q.length) return; let ok = 0;
  while (q.length) {
    const it = q[0];
    try { await api('teacher_log_session', { p_token: tk(), ...it.p }); q.shift(); ok++; setQueue(q); }
    catch (e) { if (!navigator.onLine || /went wrong/.test(e.message)) break; q.shift(); setQueue(q); toast(`Could not sync ${it.student}: ${e.message}`, true); }
  }
  if (ok) { toast(`Synced ${ok} offline session${ok === 1 ? '' : 's'} `); if (typeof view !== 'undefined' && view === 'tdash') refreshTeacherSide(); }
}
window.addEventListener('online', flushQueue);

function viewTeacher() {
  if (['teacher', 'scholar'].includes(session.role) && session.scholar_status !== 'approved') { $('#main').innerHTML = pendingPanel(); return; }
  const today = keyOf(new Date()), min = (() => { const d = new Date(); d.setDate(d.getDate() - 60); return keyOf(d); })();
  $('#main').innerHTML = `<div class="grid g2" style="align-items:start">
  <div><div class="panel st"><h2>Record a session</h2><p class="hint">Enter the student’s unique code, then record what they recited, in person or online.</p>
    <div id="tqueue"></div>
    <div class="field" style="margin-top:14px"><label for="tcode">Student code</label><input id="tcode" class="codeinput" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="7K3-Q9X" oninput="onCode(this)"><div class="ferr" id="tcE" role="alert"></div></div>
    <div id="tstu"></div>
    <form id="tform" class="reveal" onsubmit="saveSession(event)" novalidate>
      <div class="field"><label id="modeL">How did the student recite?</label><div class="seg" role="radiogroup" aria-labelledby="modeL"><label class="segopt"><input type="radio" name="tmode" value="in_person" checked><span>In person</span></label><label class="segopt"><input type="radio" name="tmode" value="online"><span>Online</span></label></div></div>
      <div class="field"><label for="tpages">Pages memorised</label><div class="stepper"><button type="button" onclick="stepPages(-.5)" aria-label="Less">−</button><input id="tpages" type="number" min="0.25" max="604" step="0.25" inputmode="decimal" value="1"><button type="button" onclick="stepPages(.5)" aria-label="More"></button></div>
        <div class="qchips">${[.5, 1, 2, 3, 5].map(n => `<button type="button" onclick="$('#tpages').value=${n}">${n}</button>`).join('')}</div></div>
      <div class="field"><label for="tportion">What was read</label><input id="tportion" list="surahList" placeholder="e.g. Surah An-Naba, ayah 1–20"><datalist id="surahList"></datalist></div>
      <div class="field"><label for="tdate">Date</label><input id="tdate" type="date" min="${min}" max="${today}" value="${today}"></div>
      <div class="field"><label id="rateLbl">Rating</label><div class="starinput" role="radiogroup" aria-labelledby="rateLbl">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}: ${RLAB[n]}" data-n="${n}" onclick="setRate(${n})" onmouseenter="hoverRate(${n})" onmouseleave="hoverRate(0)">★</button>`).join('')}<span class="ratelab" id="ratelab"></span></div><div class="ferr" id="trE" role="alert"></div></div>
      <div class="field"><label for="tcomment">Comment (shown on the student's dashboard)</label><textarea id="tcomment" maxlength="1000" placeholder="What went well? What should they revise?"></textarea><div class="qchips">${QUICK.map(q => `<button type="button" onclick="addQuick(this)">${q}</button>`).join('')}</div></div>
      <button class="btn" id="tsave" style="width:100%">Save session</button>
    </form></div></div>
  <div><div class="panel st" id="tstats">${sk(1)}</div><div class="panel st"><h2>Recent logs</h2><div id="trecent">${sk(2)}</div></div></div></div>`;
  ui(); renderQueueBar(); refreshTeacherSide(); if (session.role !== 'scholar') refreshRoster();
  getSurahs().then(l => { const dl = $('#surahList'); if (dl) dl.innerHTML = l.map(s => `<option value="Surah ${esc(s.englishName)}">`).join(''); }).catch(() => { });
  if (PRECODE) { $('#tcode').value = PRECODE; PRECODE = null; onCode($('#tcode')); }
  $('#tcode').focus();
}
function renderQueueBar() { const q = getQueue(), el = $('#tqueue'); if (el) el.innerHTML = q.length ? `<div class="okcard" style="border-color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,transparent)"><b>${q.length} session${q.length === 1 ? '' : 's'} waiting to sync</b><div class="meta">${navigator.onLine ? 'Syncing…' : 'They will upload automatically when you are back online.'}</div></div>` : ''; }
function onCode(inp) {
  inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); ferr('tcE', '');
  const c = inp.value.replace(/-/g, '');
  if (c.length === 6) lookupStudent(c); else { TS = null; $('#tstu').innerHTML = ''; $('#tform').classList.remove('open'); }
}
async function lookupStudent(code) {
  try { TS = await api('teacher_lookup_student', { p_token: tk(), p_code: code }); }
  catch (e) {
    const c = cachedRoster().find(s => s.code === code);
    if (c && !navigator.onLine) TS = { ...c, recent: [], offline: true };
    else { TS = null; $('#tstu').innerHTML = ''; $('#tform').classList.remove('open'); ferr('tcE', e.message); return; }
  }
  const t = TS, tg = t.target_pages || 604;
  $('#tstu').innerHTML = `<div class="stu"><div class="row between"><div class="row"><div class="avatar" style="width:42px;height:42px">${esc(initials(t.name))}</div><div><b style="font-size:16px">${esc(t.name)}</b> ${genChip(t.gender)}<div class="meta">${esc(t.class_name || 'No class')}${ageOf(t.birth_year) ? ' · ' + ageOf(t.birth_year) + ' yrs' : ''}${t.offline ? ' · offline copy' : ''}</div></div></div>${t.avg_rating ? stars(t.avg_rating) : ''}</div>
    ${t.plan_text ? `<p class="hint" style="margin:10px 0 6px">Plan: ${esc(t.plan_text)}</p>` : ''}<div class="meta">${num(t.pages)} / ${num(tg)} pages</div><div class="bar mini"><i data-w="${pctOf(t.pages, tg)}%"></i></div>
    ${(t.recent || []).length ? `<div class="meta" style="margin-top:10px"><b>Last sessions</b></div>${t.recent.map(r => `<div class="meta">• ${dFmt(r.session_date)} — ${num(r.pages)} pages${r.portion ? ', ' + esc(r.portion) : ''} · ${r.rating}★</div>`).join('')}` : ''}</div>`;
  $('#tform').classList.add('open'); ui(); $('#tpages').focus();
}
function stepPages(d) { const i = $('#tpages'); i.value = Math.max(.25, Math.min(604, (+i.value || 0) + d)); }
function setRate(n) { TR = n; hoverRate(0); }
function hoverRate(n) { const v = n || TR; document.querySelectorAll('.starinput button').forEach(b => { const on = +b.dataset.n <= v; b.classList.toggle('on', on); b.setAttribute('aria-checked', +b.dataset.n === TR); }); const l = $('#ratelab'); if (l) l.textContent = RLAB[v] || ''; }
function addQuick(b) { const t = $('#tcomment'); t.value = (t.value ? t.value.replace(/\s*$/, '') + '. ' : '') + b.textContent; }
async function saveSession(ev) {
  ev.preventDefault(); ferr('trE', '');
  if (!TS) return; const pages = +$('#tpages').value;
  if (!(pages > 0)) { toast('Enter the pages memorised', true); return; }
  if (!TR) { ferr('trE', 'Choose a rating from 1 to 5 stars'); return; }
  const p = { p_code: TS.code, p_pages: pages, p_portion: $('#tportion').value, p_rating: TR, p_comment: $('#tcomment').value, p_date: $('#tdate').value || null, p_mode: (document.querySelector('input[name=tmode]:checked') || { value: 'in_person' }).value };
  const btn = $('#tsave'), name = TS.name, total = (TS.pages || 0) + pages, tg = TS.target_pages || 604;
  if (!navigator.onLine) { setQueue(getQueue().concat([{ p, student: name }])); savedUI(name, pages, null, true); return; }
  busy(btn, true);
  try { const r = await api('teacher_log_session', { p_token: tk(), ...p }); burst(); savedUI(name, pages, r); refreshTeacherSide(); refreshRoster(); }
  catch (e) { busy(btn, false, 'Save session'); if (!navigator.onLine) { setQueue(getQueue().concat([{ p, student: name }])); savedUI(name, pages, null, true); } else toast(e.message, true); }
}
function savedUI(name, pages, r, offline) {
  $('#tform').classList.remove('open'); $('#tstu').innerHTML = '';
  $('#tstu').innerHTML = `<div class="okcard"><b>${offline ? 'Saved offline' : 'Saved'} for ${esc(name)} — +${num(pages)} pages</b><div class="meta">${offline ? 'It will sync automatically when you are back online.' : `Total memorised: ${num(r.total_pages)} / ${num(r.target_pages || 604)} pages. The student can see this now.`}</div><button class="btn sm" style="margin-top:10px" onclick="resetLog()">Log another student</button></div>`;
  TS = null; TR = 0; $('#tcode').value = ''; $('#tcomment').value = ''; $('#tportion').value = ''; $('#tpages').value = 1; hoverRate(0); renderQueueBar(); busy($('#tsave'), false, 'Save session');
}
function resetLog() { $('#tstu').innerHTML = ''; $('#tcode').value = ''; $('#tcode').focus(); }
async function refreshTeacherSide() {
  try {
    const d = await api('teacher_my_sessions', { p_token: tk(), p_limit: 6 }), s = d.stats;
    const st = $('#tstats'); if (!st) return;
    st.innerHTML = `<h2>Your activity</h2><div class="grid g2" style="margin-top:12px"><div class="stat"><b data-count="${s.today_sessions}">0</b><span>Sessions today</span></div><div class="stat"><b>${num(s.today_pages)}</b><span>Pages today</span></div><div class="stat"><b>${num(s.week_pages)}</b><span>Pages this week</span></div><div class="stat"><b data-count="${s.students}">0</b><span>Students taught</span></div></div>`;
    $('#trecent').innerHTML = d.sessions.length ? d.sessions.map(x => sessRow(x, true)).join('') : '<p class="hint">No sessions yet — your logs appear here.</p>';
    ui();
  } catch (e) { const r = $('#trecent'); if (r) r.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
}
const sessRow = (x, del) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>${esc(x.student)}</b> <span class="meta">${num(x.pages)} pages${x.portion ? ' · ' + esc(x.portion) : ''}</span><div class="meta">${dFmt(x.session_date)} · ${x.mode === 'online' ? 'Online' : 'In person'} · code ${fmtCode(x.code)}</div>${x.comment ? `<div class="meta" style="font-style:italic">“${esc(x.comment)}”</div>` : ''}</div><div style="text-align:right">${stars(x.rating)}${del && x.editable ? `<div><button class="linkbtn" onclick="delMine('${x.id}')">Undo</button></div>` : ''}</div></div>`;
function delMine(id) { openModal(`<h3>Remove this log?</h3><p class="hint">The pages and feedback will be removed from the student's record. You can only undo entries made in the last 48 hours.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="doDelMine('${id}')">Remove</button></div>`); }
async function doDelMine(id) { try { await api('teacher_delete_session', { p_token: tk(), p_session_id: id }); closeModal(); toast('Log removed'); if (view === 'tdash') refreshTeacherSide(); else viewTSessions(); } catch (e) { toast(e.message, true); } }

let ROS = [], rosSort = 'name';
async function viewRoster() {
  $('#main').innerHTML = `<div class="panel st"><h2>Students</h2><p class="hint">Everyone in your madrasah. Tap “Log” to record a recitation.</p><div class="row" style="margin-top:14px"><input id="rq" style="flex:1;min-width:200px" placeholder="Search name or code…" oninput="renderRoster()" aria-label="Search students"><select id="rs" style="width:auto" onchange="rosSort=this.value;renderRoster()" aria-label="Sort"><option value="name">Sort: name</option><option value="last">Sort: longest since last read</option><option value="progress">Sort: lowest progress</option></select></div></div><div id="rl">${sk(3)}</div>`;
  ui();
  const d = await refreshRoster();
  if (d) { ROS = d; } else { ROS = cachedRoster().map(s => ({ ...s, last_session: null })); toast('Showing saved list (offline)'); }
  renderRoster();
}
function renderRoster() {
  const q = (($('#rq') || {}).value || '').toLowerCase();
  let l = ROS.filter(s => (s.name + s.code + (s.class_name || '')).toLowerCase().includes(q));
  if (rosSort === 'last') l.sort((a, b) => (a.last_session || '0') < (b.last_session || '0') ? -1 : 1);
  if (rosSort === 'progress') l.sort((a, b) => pctOf(a.pages, a.target_pages || 604) - pctOf(b.pages, b.target_pages || 604));
  $('#rl').innerHTML = l.length ? `<div class="grid g2">${l.map(s => `<div class="card"><div class="row between"><div class="row"><div class="avatar">${esc(initials(s.name))}</div><div><b>${esc(s.name)}</b> ${genChip(s.gender)}<div class="meta">${esc(s.class_name || 'No class')} · <span class="codepill">${fmtCode(s.code)}</span></div></div></div>${s.avg_rating ? stars(s.avg_rating) : ''}</div>
    <div class="meta" style="margin-top:10px">${num(s.pages)} / ${num(s.target_pages || 604)} pages${s.last_session !== undefined ? ' · last read: ' : ''}${s.last_session !== undefined ? lastRead(s.last_session) : ''}</div><div class="bar mini"><i data-w="${pctOf(s.pages, s.target_pages || 604)}%"></i></div>
    <div class="row" style="margin-top:12px"><button class="btn sm" onclick="PRECODE='${s.code}';go('tdash')">Log session</button><button class="btn sm ghost" onclick="copyVal('${s.code}','Student code')">Copy code</button></div></div>`).join('')}</div>` : '<div class="panel empty">No students match. Share your madrasah’s student code so they can join.</div>';
  ui();
}
async function viewTSessions() {
  $('#main').innerHTML = `<div class="panel st"><div class="row between"><div><h2>My sessions</h2><p class="hint">Everything you have logged. Mistakes can be undone within 48 hours.</p></div><button class="btn sm ghost" onclick="exportMine()">CSV</button></div></div><div class="panel" id="tsl">${sk(3)}</div>`;
  ui();
  try { const d = await api('teacher_my_sessions', { p_token: tk(), p_limit: 500 }); window._mine = d.sessions; $('#tsl').innerHTML = d.sessions.length ? d.sessions.map(x => sessRow(x, true)).join('') : '<div class="empty">No sessions logged yet.</div>'; ui(); }
  catch (e) { $('#tsl').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function exportMine() { csvDownload([['Date', 'Student', 'Code', 'Pages', 'Portion', 'Rating', 'Comment']].concat((window._mine || []).map(s => [s.session_date, s.student, s.code, s.pages, s.portion, s.rating, s.comment])), `my-sessions-${keyOf(new Date())}.csv`); }

/* ====================================================================
   STUDENT — progress dashboard (everything teachers logged)
   ==================================================================== */
let SD = null, fbAll = false;
function weekStreak(weekly) { let n = 0, i = weekly.length - 1; if (i >= 0 && !(weekly[i].pages > 0)) i--; for (; i >= 0 && weekly[i].pages > 0; i--) n++; return n; }
async function viewProgress() {
  $('#main').innerHTML = `<div id="pgTop">${sk(2)}</div><div id="pgBody">${sk(3)}</div>`;
  try { SD = await api('student_dashboard', { p_token: tk() }); } catch (e) { $('#main').innerHTML = `<div class="panel empty">${esc(e.message)}</div>`; return; }
  renderProgress(); announceFeedback();
}
function renderProgress() {
  const d = SD, s = session, pct = pctOf(d.pages, d.target), h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const last8 = (d.weekly || []).slice(-8), ppw = last8.reduce((a, w) => a + (+w.pages || 0), 0) / 8, remaining = Math.max(0, d.target - d.pages);
  const eta = remaining <= 0 ? null : ppw > 0 ? new Date(Date.now() + remaining / ppw * 7 * 864e5) : undefined;
  const top = d.class_size > 1 ? Math.round((d.ahead + 1) / d.class_size * 100) : null, streak = weekStreak(d.weekly || []);
  $('#pgTop').innerHTML = `<div class="panel st"><div class="row between"><div><h2 style="font-size:22px">${g}, ${esc(s.display_name)}</h2><p class="hint">${esc(s.madrasah_name || '')}${s.class_name ? ' · ' + esc(s.class_name) : ''}</p></div>
    <div class="codecard" style="padding:10px 14px"><div><div class="meta">Your student code</div><div class="code-big" style="font-size:24px">${fmtCode(s.student_code)}</div></div><button class="btn sm ghost" onclick="copyVal('${s.student_code}','Student code')">Copy</button></div></div>
    <p class="hint">Give this code to your scholar after you recite. Your progress is recorded by your scholar only.</p></div>
    <div class="panel st"><div class="row" style="gap:26px">${ring(pct, 'of target', 150)}<div style="flex:1;min-width:230px"><div class="grid g3"><div class="stat"><b data-count="${Math.round(d.pages)}">0</b><span>pages memorised</span></div><div class="stat"><b>${d.avg_rating ? num(d.avg_rating, 1) : '—'}</b><span>avg rating</span><div>${stars(d.avg_rating)}</div></div><div class="stat"><b data-count="${d.sessions}">0</b><span>sessions</span></div></div>
      <div class="grid g3" style="margin-top:12px"><div class="stat"><b>${num(d.week_pages)}</b><span>pages this week</span></div><div class="stat"><b>${streak}</b><span>week streak</span></div><div class="stat"><b>${top ? 'Top ' + top + '%' : '—'}</b><span>in your madrasah</span></div></div></div></div></div>`;
  $('#pgBody').innerHTML = `
   <div class="panel st" id="onlineBox"><h2>Available now</h2><p class="hint">Checking…</p></div>
   <div class="panel st"><div class="row between"><h2>My plan</h2><button class="btn sm ghost noprint" onclick="planModal()">Edit plan</button></div><p style="margin:8px 0 4px"><b>${esc(s.plan_text || 'No plan set yet')}</b></p><p class="hint">Target: ${num(d.target)} pages · ${num(remaining)} to go${remaining <= 0 ? ' — masha’Allah, target reached! ' : eta ? `. At your recent pace (${num(ppw)} pages/week) you could finish around <b>${eta.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>.` : eta === undefined ? '. Recite for a teacher to get a finish-date estimate.' : ''}</p></div>
   <div class="panel st"><h2>Memorized by juz</h2><p class="hint">Approximate. Filled as your scholar records your sessions.</p><div style="margin-top:12px">${juzGrid(d.pages)}</div></div>
   <div class="grid g2"><div class="panel st"><h2>Pages per week</h2><div style="margin-top:12px">${weeklyBars(d.weekly || [], false)}</div></div><div class="panel st"><h2>Rating trend</h2><div style="margin-top:14px">${ratingLine(d.ratings || [])}</div><p class="hint">Your last ${(d.ratings || []).length} ratings</p></div></div>
   <div class="panel st"><h2>Activity</h2><p class="hint">Last 13 weeks — darker means more pages.</p><div style="margin-top:10px">${heatmap(d.heat || [])}</div></div>
   <div class="panel st"><div class="row between"><h2>Teacher feedback</h2><button class="btn sm ghost noprint" onclick="printReport()">Print report</button></div><div class="tl" style="margin-top:14px">${(d.recent || []).length ? (d.recent || []).slice(0, fbAll ? 30 : 5).map((r, i) => `<div class="tli" style="--i:${i}"><div class="row between"><div><b>${esc(r.teacher || 'Teacher')}</b> <span class="meta">· ${dFmt(r.session_date)}</span></div>${stars(r.rating, 'lg')}</div><div class="meta">${num(r.pages)} pages${r.portion ? ' · ' + esc(r.portion) : ''} · ${r.mode === 'online' ? 'Online' : 'In person'} · ${RLAB[r.rating]}</div>${r.comment ? `<div class="quote">“${esc(r.comment)}”</div>` : ''}</div>`).join('') : '<p class="hint">No feedback yet. After you recite for a teacher and share your code, their rating and comments appear here.</p>'}</div>${(d.recent || []).length > 5 ? `<button class="btn sm ghost" onclick="fbAll=!fbAll;renderProgress()">${fbAll ? 'Show fewer' : 'Show older feedback'}</button>` : ''}</div>`;
  ui(); loadOnline();
}
function announceFeedback() {
  const r = SD.recent && SD.recent[0]; if (!r) return;
  const key = 'nh_seen_' + session.id, seen = localStorage.getItem(key);
  if (seen !== r.id && (daysSince(r.session_date) ?? 99) <= 7) { toast(`New feedback from ${r.teacher || 'your teacher'}: ${'★'.repeat(r.rating)}`); if (r.rating === 5) burst(); }
  localStorage.setItem(key, r.id);
}
function planModal() {
  openModal(`<h3>What are you memorising?</h3><div class="field"><label for="plT">My plan</label><textarea id="plT" placeholder="e.g. Juz 30, then Surah Yasin">${esc(session.plan_text || '')}</textarea></div><div class="field"><label for="plP">Target pages</label><input id="plP" type="number" min="1" max="604" value="${session.target_pages || 20}"><div class="qchips">${[['Juz 30', 20], ['5 Juz', 100], ['10 Juz', 200], ['Whole Qur’an', 604]].map(p => `<button type="button" onclick="$('#plP').value=${p[1]}">${p[0]} · ${p[1]}</button>`).join('')}</div></div><div class="ferr" id="plE" role="alert"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="savePlanM()">Save plan</button></div>`); animate();
}
async function savePlanM() {
  try { const u = await api('student_update_plan', { p_token: tk(), p_plan_text: $('#plT').value, p_target_pages: +$('#plP').value || 604 }); session = { ...session, ...u, token: tk() }; localStorage.setItem('nh_session', JSON.stringify(session)); closeModal(); toast('Plan updated'); viewProgress(); } catch (e) { ferr('plE', e.message); }
}
function printReport() {
  const d = SD, s = session;
  printHTML(`<div class="report"><h1>Noor Hifz — Progress report</h1><p><b>${esc(s.display_name)}</b> · code ${fmtCode(s.student_code)} · ${esc(s.madrasah_name || '')}${s.class_name ? ' · ' + esc(s.class_name) : ''}<br>Printed ${new Date().toLocaleDateString()}</p>
    <p>Plan: ${esc(s.plan_text || '—')}<br>Pages memorised: <b>${num(d.pages)}</b> of ${num(d.target)} (${pctOf(d.pages, d.target)}%) · Sessions: ${d.sessions} · Average rating: ${d.avg_rating ? num(d.avg_rating, 2) + ' / 5' : '—'}</p>
    <table><tr><th>Date</th><th>Teacher</th><th>Pages</th><th>Portion</th><th>Rating</th><th>Comment</th></tr>${(d.recent || []).map(r => `<tr><td>${dFmt(r.session_date)}</td><td>${esc(r.teacher || '')}</td><td>${num(r.pages)}</td><td>${esc(r.portion || '')}</td><td>${r.rating}/5</td><td>${esc(r.comment || '')}</td></tr>`).join('')}</table></div>`);
}

/* ====================================================================
   SIGN-UP WITH A MADRASAH CODE  +  PROFILE EXTRAS
   ==================================================================== */
let PEEK = null, peekT = null;
function madPeek(inp) {
  inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); clearTimeout(peekT); PEEK = null; $('#madFields').innerHTML = ''; ferr('suCE', '');
  const box = $('#peekBox');
  if (inp.value.length < 8) { box.innerHTML = inp.value ? '<span class="hint">Enter the full 8-character code</span>' : ''; return; }
  box.innerHTML = '<span class="hint">Checking…</span>';
  peekT = setTimeout(async () => {
    try {
      const r = await api('madrasah_peek', { p_code: inp.value }); if (inp.value.length < 8) return;
      PEEK = r.valid ? r : null;
      box.innerHTML = r.valid ? `<div class="okline"><b>${esc(r.madrasah)}</b>${r.city ? ' · ' + esc(r.city) : ''} — joining as <b>${{ student: 'a Student', teacher: 'a Teacher', admin: 'a Madrasah Admin' }[r.kind]}</b></div>` : '<div class="ferr show">That code is not recognised or is no longer active.</div>';
      $('#madFields').innerHTML = r.valid ? madFieldsFor(r.kind) : ''; animate();
    } catch (e) { box.innerHTML = '<div class="ferr show">Could not check the code — are you online?</div>'; }
  }, 250);
}
function madFieldsFor(kind) {
  if (kind === 'admin') return '<p class="hint">Madrasah admins manage members, codes and analytics.</p>';
  const gender = `<div class="field"><label id="genL">Gender</label><div class="seg" role="radiogroup" aria-labelledby="genL"><label class="segopt"><input type="radio" name="gen" value="male"><span>Male</span></label><label class="segopt"><input type="radio" name="gen" value="female"><span>Female</span></label></div></div><div class="field"><label>Year of birth (optional)</label><input id="suY" type="number" min="1930" max="${new Date().getFullYear()}" inputmode="numeric" placeholder="e.g. 2011"></div>`;
  if (kind === 'teacher') return gender;
  return gender + `<div class="field"><label>Class / halaqa (optional)</label><input id="suCl" placeholder="e.g. Class A"></div><div class="field"><label>What do you plan to memorise?</label><textarea id="suPl" placeholder="e.g. Juz 30, then Surah Al-Baqarah"></textarea></div><div class="field"><label>Target pages</label><input id="suTp" type="number" min="1" max="604" value="20"><div class="qchips">${[['Juz 30', 20], ['5 Juz', 100], ['Whole Qur’an', 604]].map(p => `<button type="button" onclick="$('#suTp').value=${p[1]}">${p[0]} · ${p[1]}</button>`).join('')}</div></div>`;
}
function madSignupPayload() {
  if (!PEEK) throw new Error('Enter a valid madrasah code');
  const p = { p_join_code: $('#suC').value };
  if (PEEK.kind !== 'admin') {
    const g = document.querySelector('input[name=gen]:checked'); if (!g) throw new Error('Please choose your gender');
    p.p_gender = g.value; const y = +($('#suY') || {}).value; if (y) p.p_birth_year = y;
  }
  if (PEEK.kind === 'student') {
    const plan = $('#suPl').value.trim(); if (plan.length < 2) throw new Error('Tell us what you plan to memorise');
    p.p_plan_text = plan; p.p_target_pages = +$('#suTp').value || 604; p.p_class_name = $('#suCl').value.trim();
  }
  return p;
}
function showCodeModal() {
  openModal(`<div style="text-align:center"><h3>Welcome, ${esc(session.display_name)}!</h3><p class="hint">This is your personal student code. Give it to any teacher after you recite — they use it to record your pages, rating and feedback.</p><div class="code-big" style="margin:18px 0">${fmtCode(session.student_code)}</div><div class="row" style="justify-content:center"><button class="btn" onclick="copyVal('${session.student_code}','Student code')">Copy code</button><button class="btn ghost" onclick="closeModal();go('progress')">Go to my dashboard</button></div><p class="hint" style="margin-top:12px">You can always find it on your dashboard.</p></div>`);
}
function profileExtra() {
  let h = '';
  if (session.role === 'user' && session.student_code) h += `<div class="panel st"><h2>Student code</h2><div class="codecard" style="margin-top:12px"><div><div class="meta">Give this code to your scholar after you recite</div><div class="code-big">${fmtCode(session.student_code)}</div></div><button class="btn sm" onclick="copyVal('${session.student_code}','Student code')">Copy</button></div></div>`;
  if (session.madrasah_id) h += `<div class="panel st"><h2>Madrasah</h2><p style="margin:8px 0 0"><b>${esc(session.madrasah_name || '')}</b> · ${roleLabel(session.role)}${session.class_name ? ' · ' + esc(session.class_name) : ''}</p></div>`;
  if (session.gender) h += `<div class="panel st"><h2>Gender</h2><p style="margin:8px 0 0">${session.gender === 'male' ? 'Male' : 'Female'}</p><p class="hint">Used to match you with scholars of the same gender. Ask an administrator if it needs to be corrected.</p></div>`;
  return h + reminderPanel();
}

/* ---------- availability: who is online ---------- */
const ago = ts => { const m = Math.max(1, Math.round((Date.now() - new Date(ts)) / 6e4)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
async function loadOnline() {
  const b = $('#onlineBox'); if (!b) return;
  try {
    const l = await api('online_staff', { p_token: tk() });
    b.innerHTML = `<h2>Available now</h2>${l.length ? l.map(x => `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)"><span><span class="dot ${x.online ? 'on' : ''}"></span><b>${esc(x.name)}</b> <span class="meta">${x.kind === 'scholar' ? 'Scholar' : 'Teacher'}</span></span><span class="meta">${x.online ? 'Online now' : x.last_seen ? 'Seen ' + ago(x.last_seen) : 'Offline'}</span></div>`).join('') : '<p class="hint">No scholars or teachers are available to you yet.</p>'}`;
  } catch (e) { b.innerHTML = ''; }
}
const pendingPanel = () => `<div class="panel st"><h2>Awaiting approval</h2><p class="hint" style="margin-top:8px">${session.role === 'teacher' ? 'Your madrasah admin must approve your account before you can record sessions.' : 'An administrator is reviewing your application. You can record sessions once you are approved.'}</p><button class="btn sm" style="margin-top:12px" onclick="recheckStatus()">Check again</button></div>`;
async function recheckStatus() { try { const u = await api('app_whoami', { p_token: tk() }); session = { ...session, ...u, token: tk() }; localStorage.setItem('nh_session', JSON.stringify(session)); go('tdash'); } catch (e) { toast(e.message, true); } }
async function setTStatus(id, st) { try { await api('ma_set_teacher_status', { p_token: tk(), p_user_id: id, p_status: st }); toast(st === 'approved' ? 'Teacher approved' : 'Approval removed'); refreshMembers(); } catch (e) { toast(e.message, true); } }

/* ---------- gender (required once, then locked) ---------- */
function ensureGender() {
  if (!session || session.gender || !['user', 'scholar', 'teacher'].includes(session.role) || $('#genderLock')) return;
  const d = document.createElement('div'); d.id = 'genderLock'; d.className = 'lockscreen'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="lockbox"><h2>One more step</h2><p class="hint" style="margin:8px 0 16px">To keep sessions appropriate, students are matched only with scholars and teachers of the same gender. Please choose yours. It cannot be changed afterwards.</p><div class="seg"><label class="segopt"><input type="radio" name="lg" value="male"><span>Male</span></label><label class="segopt"><input type="radio" name="lg" value="female"><span>Female</span></label></div><div class="ferr" id="lgE" role="alert"></div><button class="btn" style="width:100%;margin-top:14px" onclick="saveGender()">Continue</button></div>`;
  document.body.appendChild(d);
}
async function saveGender() {
  const g = document.querySelector('input[name=lg]:checked'); if (!g) { ferr('lgE', 'Please choose one'); return; }
  try { const u = await api('set_my_gender', { p_token: tk(), p_gender: g.value }); session = { ...session, ...u, token: tk() }; localStorage.setItem('nh_session', JSON.stringify(session)); $('#genderLock').remove(); toast('Saved'); go(view); } catch (e) { ferr('lgE', e.message); }
}

/* ---------- reminders: any time you choose ---------- */
const RM_DEF = { on: false, time: '05:30', days: [0, 1, 2, 3, 4, 5, 6], msg: '' };
const rmd = () => { try { return Object.assign({}, RM_DEF, JSON.parse(localStorage.getItem('nh_remind') || '{}')); } catch (e) { return { ...RM_DEF }; } };
const rmdSave = r => { localStorage.setItem('nh_remind', JSON.stringify(r)); scheduleReminder(); };
let rmdTimer = null;
function nextReminder(r) {
  const [h, m] = r.time.split(':').map(Number), now = new Date();
  for (let i = 0; i < 8; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0, 0); if (d > now && r.days.includes(d.getDay())) return d; }
  return null;
}
async function scheduleReminder() {
  clearTimeout(rmdTimer); const r = rmd();
  if (!r.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const when = nextReminder(r); if (!when) return;
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  const title = 'Noor Hifz', opts = { body: r.msg || 'Time for your memorization session.', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'nh-reminder' };
  if (reg && 'showTrigger' in Notification.prototype && window.TimestampTrigger) { try { reg.showNotification(title, { ...opts, showTrigger: new TimestampTrigger(when.getTime()) }); } catch (e) { } }
  rmdTimer = setTimeout(() => { (reg ? reg.showNotification(title, opts) : Promise.resolve(new Notification(title, opts))).catch(() => { }); scheduleReminder(); }, Math.min(when - Date.now(), 2147483000));
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleReminder(); });
const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function reminderPanel() {
  const r = rmd(), nx = r.on ? nextReminder(r) : null;
  return `<div class="panel st" id="rmdPanel"><h2>Reminders</h2><p class="hint">Choose any time of day and the days you want to be reminded.</p>
    <div class="row" style="margin-top:12px"><label class="switch"><input type="checkbox" id="rmOn" ${r.on ? 'checked' : ''} onchange="rmdToggle(this.checked)" aria-label="Reminders on"><span class="slider"></span></label><b>${r.on ? 'On' : 'Off'}</b>${nx ? `<span class="meta">Next: ${nx.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>` : ''}</div>
    <div class="grid g2" style="margin-top:12px"><div class="field"><label for="rmTime">Time</label><input id="rmTime" type="time" value="${r.time}" onchange="rmdSet('time',this.value)"></div><div class="field"><label for="rmMsg">Message (optional)</label><input id="rmMsg" value="${esc(r.msg)}" maxlength="80" placeholder="Time for your memorization session." onchange="rmdSet('msg',this.value)"></div></div>
    <div class="chips" role="group" aria-label="Days">${DAYN.map((d, i) => `<button class="${r.days.includes(i) ? 'on' : ''}" onclick="rmdDay(${i})">${d}</button>`).join('')}</div>
    <div class="row"><button class="btn sm ghost" onclick="rmdTest()">Send a test</button></div>
    <p class="hint" style="margin-top:10px">Reminders appear at your chosen time while Noor Hifz is installed or open in the background. Fully closed browsers cannot be reached without a push service.</p></div>`;
}
async function rmdToggle(on) {
  const r = rmd(); if (on) { if (!('Notification' in window)) { toast('This browser does not support notifications', true); $('#rmOn').checked = false; return; } const p = await Notification.requestPermission(); if (p !== 'granted') { toast('Allow notifications for this site to use reminders', true); $('#rmOn').checked = false; return; } }
  r.on = on; rmdSave(r); const el = $('#rmdPanel'); if (el) el.outerHTML = reminderPanel(); animate();
}
function rmdSet(k, v) { const r = rmd(); r[k] = v; rmdSave(r); const el = $('#rmdPanel'); if (el) el.outerHTML = reminderPanel(); }
function rmdDay(i) { const r = rmd(); r.days = r.days.includes(i) ? r.days.filter(x => x !== i) : r.days.concat([i]).sort(); if (!r.days.length) r.days = [i]; rmdSave(r); const el = $('#rmdPanel'); if (el) el.outerHTML = reminderPanel(); }
async function rmdTest() {
  if (!('Notification' in window) || Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') { toast('Allow notifications first', true); return; } }
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null, r = rmd();
  (reg ? reg.showNotification('Noor Hifz', { body: r.msg || 'Time for your memorization session.', icon: '/icons/icon-192.png' }) : Promise.resolve(new Notification('Noor Hifz', { body: r.msg || 'Time for your memorization session.' }))).catch(() => toast('Could not show the notification', true));
}

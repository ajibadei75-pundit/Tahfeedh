/* Noor Hifz — Qur'an reader (Al Quran Cloud API)
   Reciters and translations are fetched live from the API (so the list stays current);
   the built-in lists below are the offline/fallback set. */
const QAPI = 'https://api.alquran.cloud/v1';
const RECITERS_FB = [['ar.alafasy', 'Mishary Rashid Alafasy'], ['ar.abdulbasitmurattal', 'Abdul Basit (Murattal)'], ['ar.husary', 'Mahmoud Khalil Al-Husary'], ['ar.minshawi', 'Mohamed Siddiq Al-Minshawi'], ['ar.abdurrahmaansudais', 'Abdurrahman As-Sudais'], ['ar.saoodshuraym', 'Saud Ash-Shuraim'], ['ar.mahermuaiqly', 'Maher Al-Muaiqly'], ['ar.hudhaify', 'Ali Al-Hudhaify'], ['ar.muhammadayyoub', 'Muhammad Ayyoub'], ['ar.ahmedajamy', 'Ahmed Al-Ajamy'], ['ar.shaatree', 'Abu Bakr Ash-Shaatree'], ['ar.husarymujawwad', 'Al-Husary (Mujawwad)'], ['ar.minshawimujawwad', 'Al-Minshawi (Mujawwad)']];
const TRANS_FB = [['en.sahih', 'EN — Saheeh International'], ['en.yusufali', 'EN — Yusuf Ali'], ['fr.hamidullah', 'FR — Hamidullah'], ['ur.jalandhry', 'UR — Jalandhry'], ['ha.gumi', 'HA — Gumi'], ['id.indonesian', 'ID — Indonesian'], ['tr.diyanet', 'TR — Diyanet'], ['es.cortes', 'ES — Cortes']];
const AR_DIG = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const qBare = x => x.replace(/\u0671/g, 'ا').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
const BISM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const QDEF = { reciter: 'ar.alafasy', trans: 'en.sahih', size: 30, mode: 'mushaf', speed: 1, repeat: 1 };
let QP = (() => { try { return Object.assign({}, QDEF, JSON.parse(localStorage.getItem('nh_qprefs') || '{}')); } catch (e) { return { ...QDEF }; } })();
const qSave = () => localStorage.setItem('nh_qprefs', JSON.stringify(QP));
let Q = { kind: 'surah', n: 1, ayahs: [], meta: null, sel: 0 }, QS = null, QED = null, QI = -1, QLeft = 1;
const audio = new Audio();

async function getSurahs() {
  if (QS) return QS;
  try { QS = (await (await fetch(QAPI + '/surah')).json()).data; localStorage.setItem('nh_qs', JSON.stringify(QS)); }
  catch (e) { try { QS = JSON.parse(localStorage.getItem('nh_qs') || 'null'); } catch (x) { } if (!QS) throw e; }
  return QS;
}
async function qEditions() {
  if (QED) return QED;
  try { const c = JSON.parse(localStorage.getItem('nh_qed') || 'null'); if (c && Date.now() - c.t < 6048e5) return (QED = c); } catch (e) { }
  try {
    const [a, t] = await Promise.all([fetch(QAPI + '/edition/format/audio').then(r => r.json()), fetch(QAPI + '/edition/type/translation').then(r => r.json())]);
    const pri = RECITERS_FB.map(r => r[0]), tp = TRANS_FB.map(r => r[0]);
    const rec = a.data.filter(e => e.language === 'ar' && e.type === 'versebyverse').map(e => [e.identifier, e.englishName || e.name]).sort((x, y) => (pri.indexOf(x[0]) + 1 || 99) - (pri.indexOf(y[0]) + 1 || 99));
    const tr = t.data.map(e => [e.identifier, `${e.language.toUpperCase()} — ${e.englishName || e.name}`]).sort((x, y) => (tp.indexOf(x[0]) + 1 || 99) - (tp.indexOf(y[0]) + 1 || 99) || (x[1] < y[1] ? -1 : 1));
    QED = { t: Date.now(), rec: rec.length ? rec : RECITERS_FB, tr: tr.length ? tr : TRANS_FB };
    localStorage.setItem('nh_qed', JSON.stringify(QED)); return QED;
  } catch (e) { return (QED = { rec: RECITERS_FB, tr: TRANS_FB }); }
}
const recName = () => ((QED ? QED.rec : RECITERS_FB).find(r => r[0] === QP.reciter) || [0, 'Reciter'])[1];

async function viewQuran() {
  const ed = await qEditions().catch(() => ({ rec: RECITERS_FB, tr: TRANS_FB }));
  const last = (() => { try { return JSON.parse(localStorage.getItem('nh_qlast') || 'null'); } catch (e) { return null; } })();
  const start = prefill && prefill.surah ? { kind: 'surah', n: prefill.surah } : last || { kind: 'surah', n: 1 };
  const opt = (arr, cur) => arr.map(r => `<option value="${esc(r[0])}" ${r[0] === cur ? 'selected' : ''}>${esc(r[1])}</option>`).join('');
  $('#main').innerHTML = `<div class="panel st qctl">
    <div class="row between"><h2 style="margin:0">Qur’an</h2><button class="btn sm ghost" onclick="qShowBm()">⭐ Bookmarks</button></div>
    <div class="row" style="margin-top:12px"><div class="chips" style="margin:0" role="group" aria-label="Navigate by">${[['surah', 'Surah'], ['juz', 'Juz'], ['page', 'Page']].map(k => `<button class="qk ${start.kind === k[0] ? 'on' : ''}" data-k="${k[0]}" onclick="qKind('${k[0]}')">${k[1]}</button>`).join('')}</div>
      <div class="chips" style="margin:0" role="group" aria-label="Reading mode">${[['mushaf', 'Mushaf'], ['verse', 'Verse by verse']].map(k => `<button class="qm ${QP.mode === k[0] ? 'on' : ''}" onclick="qMode('${k[0]}')">${k[1]}</button>`).join('')}</div></div>
    <div class="row qnav"><button class="btn sm ghost" onclick="qMove(-1)" aria-label="Previous">‹</button><span id="qnumwrap" style="flex:1;min-width:0"></span><button class="btn sm ghost" onclick="qMove(1)" aria-label="Next">›</button></div>
    <div class="row"><select id="qrec" aria-label="Reciter" onchange="QP.reciter=this.value;qSave();qLoad(Q.kind,Q.n)">${opt(ed.rec, QP.reciter)}</select>
      <select id="qtr" aria-label="Translation" onchange="QP.trans=this.value;qSave();qLoad(Q.kind,Q.n)"><option value="none" ${QP.trans === 'none' ? 'selected' : ''}>No translation</option>${opt(ed.tr, QP.trans)}</select></div>
    <div class="row"><div class="chips" style="margin:0" role="group" aria-label="Text size"><button onclick="qSize(-3)" aria-label="Smaller text">A−</button><button onclick="qSize(3)" aria-label="Larger text">A+</button></div>
      <label class="row" style="margin:0 0 0 auto;gap:8px"><span class="switch"><input type="checkbox" id="qtest" onchange="$('#qbody').classList.toggle('testmode',this.checked)"><span class="slider"></span></span><span>Test myself</span></label></div></div>
    <div id="qbody">${sk(4)}</div><div class="qpad"></div>
    <div class="qplayer" id="qplayer" role="group" aria-label="Audio player"><button class="play" onclick="qStep(-1)" aria-label="Previous ayah">⏮</button><button class="play big" id="qpp" onclick="qToggle()" aria-label="Play">▶</button><button class="play" onclick="qStep(1)" aria-label="Next ayah">⏭</button>
      <div class="qinfo"><b id="qnow">Tap ▶ to listen</b><small id="qrn">${esc(recName())}</small></div>
      <select id="qsp" aria-label="Speed" onchange="QP.speed=+this.value;audio.playbackRate=QP.speed;qSave()">${[.75, 1, 1.25, 1.5].map(s => `<option value="${s}" ${QP.speed === s ? 'selected' : ''}>${s}×</option>`).join('')}</select>
      <select id="qrp" aria-label="Repeat each ayah" onchange="QP.repeat=+this.value;qSave()">${[1, 3, 5].map(s => `<option value="${s}" ${QP.repeat === s ? 'selected' : ''}>${s === 1 ? 'No repeat' : '↻ ×' + s}</option>`).join('')}</select></div>`;
  animate(); prefill = null; qKind(start.kind, start.n);
}
async function qKind(k, n) {
  document.querySelectorAll('.qk').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const w = $('#qnumwrap'), cur = n || (k === Q.kind ? Q.n : 1);
  if (k === 'surah') { let l = []; try { l = await getSurahs(); } catch (e) { } w.innerHTML = `<select id="qnum" aria-label="Surah" onchange="qLoad('surah',this.value)">${l.map(s => `<option value="${s.number}" ${s.number == cur ? 'selected' : ''}>${s.number}. ${esc(s.englishName)} — ${esc(s.name)}</option>`).join('')}</select>`; }
  else if (k === 'juz') w.innerHTML = `<select id="qnum" aria-label="Juz" onchange="qLoad('juz',this.value)">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}" ${i + 1 == cur ? 'selected' : ''}>Juz ${i + 1}</option>`).join('')}</select>`;
  else w.innerHTML = `<input id="qnum" type="number" min="1" max="604" value="${cur}" inputmode="numeric" aria-label="Page number (1–604)" onchange="qLoad('page',Math.min(604,Math.max(1,+this.value||1)))">`;
  qLoad(k, cur);
}
function qMove(d) { const max = Q.kind === 'surah' ? 114 : Q.kind === 'juz' ? 30 : 604, n = Math.min(max, Math.max(1, Q.n + d)); if (n === Q.n) return; const el = $('#qnum'); if (el) el.value = n; qLoad(Q.kind, n); }
function qMode(m) { QP.mode = m; qSave(); document.querySelectorAll('.qm').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase().startsWith(m === 'verse' ? 'verse' : 'mushaf'))); if (Q.ayahs.length) qRender(); }
function qSize(d) { QP.size = Math.min(54, Math.max(20, QP.size + d)); qSave(); if (Q.ayahs.length) qRender(); }

async function qLoad(kind, n) {
  Q.kind = kind; Q.n = +n; qStop(); $('#qbody').innerHTML = sk(4);
  const eds = ['quran-uthmani']; if (QP.trans !== 'none') eds.push(QP.trans); eds.push(QP.reciter);
  try {
    // Surah supports several editions in one request; Juz and Page take one edition per request, so fetch them in parallel.
    let d;
    if (kind === 'surah') {
      const j = await (await fetch(`${QAPI}/surah/${n}/editions/${eds.join(',')}`)).json();
      if (j.code !== 200) throw new Error(typeof j.data === 'string' ? j.data : 'Not found');
      d = j.data;
    } else {
      const rs = await Promise.all(eds.map(e => fetch(`${QAPI}/${kind}/${n}/${e}`).then(r => r.json())));
      const bad = rs.find(r => r.code !== 200); if (bad) throw new Error(typeof bad.data === 'string' ? bad.data : 'Not found');
      d = rs.map(r => r.data);
    }
    const tx = d[0], tr = QP.trans !== 'none' ? d[1] : null, au = d[d.length - 1];
    Q.meta = kind === 'surah' ? { en: tx.englishName, tt: tx.englishNameTranslation, count: tx.numberOfAyahs, type: tx.revelationType } : null;
    Q.ayahs = tx.ayahs.map((a, i) => {
      const s = a.surah ? a.surah.number : tx.number; let t = a.text;
      if (a.numberInSurah === 1 && s !== 1 && s !== 9 && qBare(t).startsWith('بسم الله الرحمن الرحيم')) t = t.split(' ').slice(4).join(' ');   // Bismillah is shown as its own line — only stripped when really present
      return { s, sn: a.surah ? a.surah.englishName : tx.englishName, sa: a.surah ? a.surah.name : tx.name, n: a.numberInSurah, g: a.number, text: t, tr: tr ? tr.ayahs[i].text : '', audio: au.ayahs[i] && au.ayahs[i].audio, page: a.page, juz: a.juz };
    });
    Q.sel = 0; localStorage.setItem('nh_qlast', JSON.stringify({ kind, n: Q.n })); qRender();
  } catch (e) {
    $('#qbody').innerHTML = `<div class="panel empty"><span class="big">📖</span>${esc(e.message && !/fetch/i.test(e.message) ? e.message : 'Could not reach the Qur’an service. Check your connection — surahs you have opened before still work offline.')}<br><button class="btn sm" style="margin-top:10px" onclick="qLoad(Q.kind,Q.n)">Try again</button></div>`;
  }
}
function qRender() {
  const mush = QP.mode === 'mushaf', sz = QP.size; let h = '', buf = '';
  const flush = () => { if (buf) { h += `<div class="mushaf" style="font-size:${sz}px" lang="ar" dir="rtl">${buf}</div>`; buf = ''; } };
  Q.ayahs.forEach((a, i) => {
    if (a.n === 1) { flush(); h += `<header class="sbanner"><div class="sb-ar" lang="ar">${esc(a.sa)}</div><div class="sb-en">${a.s}. ${esc(a.sn)}${Q.meta && Q.meta.tt ? ' — ' + esc(Q.meta.tt) : ''}</div>${Q.meta ? `<div class="meta">${Q.meta.count} ayahs · ${esc(Q.meta.type)}</div>` : ''}</header>${a.s !== 1 && a.s !== 9 ? `<div class="bism" lang="ar" style="font-size:${Math.round(sz * .85)}px">${BISM}</div>` : ''}`; }
    if (mush) buf += `<span class="ay" id="ay${i}" onclick="qTap(${i})" onkeydown="if(event.key==='Enter')qTap(${i})" tabindex="0" role="button" aria-label="Ayah ${a.n}">${esc(a.text)}</span><span class="aend" aria-hidden="true">﴿${AR_DIG(a.n)}﴾</span> `;
    else { flush(); h += `<article class="vcard" id="ay${i}"><div class="vhead"><span class="num">${a.n}</span><div class="row" style="gap:6px"><button class="play" onclick="qPlay(${i})" aria-label="Play ayah ${a.n}">▶</button><button class="play" onclick="qTap(${i})" aria-label="More for ayah ${a.n}">⋯</button></div></div><div class="ar vtext" style="font-size:${sz}px" lang="ar" dir="rtl" onclick="this.parentNode.classList.toggle('revealed')">${esc(a.text)}</div>${a.tr ? `<div class="tr">${esc(a.tr)}</div>` : ''}</article>`; }
  });
  flush();
  const last = Q.ayahs[Q.ayahs.length - 1];
  $('#qbody').innerHTML = h + (last ? `<p class="hint" style="text-align:center;margin-top:14px">Page ${Q.ayahs[0].page}–${last.page} · Juz ${Q.ayahs[0].juz} · tap any ayah for its translation, bookmark and playback</p><div class="row" style="justify-content:center;margin-top:8px"><button class="btn sm ghost" onclick="qCertify()">🎓 Get this recitation certified</button></div>` : '');
  if (QI >= 0) qMark(QI);
}
function qTap(i) {
  const a = Q.ayahs[i], el = $('#ay' + i);
  if ($('#qbody').classList.contains('testmode') && el && !el.classList.contains('revealed')) { el.classList.add('revealed'); return; }
  Q.sel = i; const bm = qBm().some(x => x.s === a.s && x.n === a.n);
  openModal(`<h3>${esc(a.sn)} · ayah ${a.n}</h3><p class="ar" lang="ar" dir="rtl" style="font-size:26px;line-height:2.1;margin:6px 0">${esc(a.text)}</p>${a.tr ? `<p class="tr" style="margin:0 0 12px">${esc(a.tr)}</p>` : ''}<div class="row"><button class="btn sm" onclick="closeModal();qPlay(${i},true)">▶ Play from here</button><button class="btn sm ghost" onclick="qToggleBm(${i})">${bm ? '★ Remove bookmark' : '☆ Bookmark'}</button><button class="btn sm ghost" onclick="copyVal('${a.text.replace(/'/g, '')} ﴿${a.n}﴾ — ${a.sn} ${a.s}:${a.n}','Ayah')">Copy</button></div>`);
}
const qBm = () => { try { return JSON.parse(localStorage.getItem('nh_qbm') || '[]'); } catch (e) { return []; } };
function qToggleBm(i) {
  const a = Q.ayahs[i], b = qBm(), k = b.findIndex(x => x.s === a.s && x.n === a.n);
  if (k >= 0) b.splice(k, 1); else b.unshift({ s: a.s, n: a.n, sn: a.sn });
  localStorage.setItem('nh_qbm', JSON.stringify(b.slice(0, 100))); closeModal(); toast(k >= 0 ? 'Bookmark removed' : 'Bookmarked ⭐');
}
function qShowBm() {
  const b = qBm();
  openModal(`<h3>Bookmarks</h3>${b.length ? b.map(x => `<button class="btn ghost" style="width:100%;justify-content:space-between;margin-bottom:8px" onclick="closeModal();qKind('surah',${x.s})"><span>${esc(x.sn)}</span><span class="meta">ayah ${x.n}</span></button>`).join('') : '<p class="hint">No bookmarks yet — tap an ayah, then “Bookmark”.</p>'}`);
}
function qCertify() { if (!session) { goAuth('signup'); return; } if (session.role !== 'user') { toast('Only student accounts can request certification'); return; } prefill = { surah: Q.ayahs[0].s }; go('scholars'); }

/* ---------- player ---------- */
audio.onended = () => { if (QLeft > 1) { QLeft--; audio.currentTime = 0; audio.play(); return; } if (QI + 1 < Q.ayahs.length) qPlay(QI + 1, true); else qStop(); };
audio.onplay = audio.onpause = () => { const b = $('#qpp'); if (b) { b.textContent = audio.paused ? '▶' : '⏸'; b.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause'); } };
function qMark(i) { document.querySelectorAll('.ay.playing,.vcard.playing').forEach(e => e.classList.remove('playing')); const el = $('#ay' + i); if (el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
function qPlay(i) {
  const a = Q.ayahs[i]; if (!a) return; if (!a.audio) { toast('No audio for this ayah', true); return; }
  QI = i; QLeft = QP.repeat; audio.src = a.audio; audio.playbackRate = QP.speed; audio.play().catch(() => toast('Audio could not play — check your connection', true));
  qMark(i); const n = $('#qnow'); if (n) n.textContent = `${a.sn} · ayah ${a.n}`;
  if ('mediaSession' in navigator && window.MediaMetadata) { navigator.mediaSession.metadata = new MediaMetadata({ title: `${a.sn} · ayah ${a.n}`, artist: recName(), album: 'Noor Hifz', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] }); navigator.mediaSession.setActionHandler('previoustrack', () => qStep(-1)); navigator.mediaSession.setActionHandler('nexttrack', () => qStep(1)); navigator.mediaSession.setActionHandler('play', () => audio.play()); navigator.mediaSession.setActionHandler('pause', () => audio.pause()); }
}
function qToggle() { if (QI < 0) { qPlay(Q.sel || 0); return; } audio.paused ? audio.play() : audio.pause(); }
function qStep(d) { const i = (QI < 0 ? Q.sel || 0 : QI) + d; if (i >= 0 && i < Q.ayahs.length) qPlay(i); }
function qStop() { audio.pause(); QI = -1; document.querySelectorAll('.ay.playing,.vcard.playing').forEach(e => e.classList.remove('playing')); const n = $('#qnow'); if (n) n.textContent = 'Tap ▶ to listen'; }
function stopAudio() { qStop(); }

/* Noor Hifz — Memorize & test.
   Practice happens on the student's device only. It is never recorded as progress:
   only a scholar or teacher can record what a student has memorized. */
const pAudio = new Audio();
let PR = { s: 1, from: 1, to: 5, all: [], rng: [], i: 0, mode: 'learn', level: 0, reps: 3, res: {}, quiz: null, scope: 'range', type: 'next' }, pTok = 0;
const pStats = () => { try { return JSON.parse(localStorage.getItem('nh_pstats') || '{}'); } catch (e) { return {}; } };
const pWords = t => t.split(/\s+/).filter(Boolean);
const pShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pFirst = w => { const m = w.match(/^[\u0621-\u064A\u0671][\u064B-\u065F\u0670\u06D6-\u06ED]*/); return (m ? m[0] : w.slice(0, 1)) + '…'; };
function pStop() { pTok++; pAudio.pause(); }

async function viewPractice() {
  let list = []; try { list = await getSurahs(); } catch (e) { }
  const last = (() => { try { return JSON.parse(localStorage.getItem('nh_qlast') || 'null'); } catch (e) { return null; } })();
  if (last && last.kind === 'surah' && !PR.all.length) PR.s = +last.n;
  $('#main').innerHTML = `<div class="panel st"><h2>Memorize and test</h2><p class="hint">Prepare here before you recite to your scholar. Practice results stay on this device. Only your scholar records your progress.</p>
    <div class="row" style="margin-top:12px"><select id="ps" aria-label="Surah" style="flex:2 1 200px" onchange="pLoad(+this.value)">${list.map(s => `<option value="${s.number}" ${s.number === PR.s ? 'selected' : ''}>${s.number}. ${esc(s.englishName)}</option>`).join('')}</select>
      <div class="row" style="gap:6px;flex:1 1 200px"><input id="pf" type="number" min="1" style="width:76px" aria-label="From ayah" placeholder="From"><span class="meta">to</span><input id="pt" type="number" min="1" style="width:76px" aria-label="To ayah" placeholder="To"><button class="btn sm" onclick="pApply()">Set range</button></div></div>
    <div class="row"><span class="meta">Section size</span><div class="chips" style="margin:0">${[1, 3, 5, 10].map(n => `<button onclick="pChunk(${n})">${n} ayah${n > 1 ? 's' : ''}</button>`).join('')}<button onclick="pNextChunk()">Next section</button></div></div></div>
    <div class="chips st" role="tablist" aria-label="Practice mode">${[['learn', 'Learn'], ['recite', 'Recite'], ['quiz', 'Quiz']].map(m => `<button class="pm ${PR.mode === m[0] ? 'on' : ''}" onclick="pMode('${m[0]}')">${m[1]}</button>`).join('')}</div>
    <div id="pbody">${sk(2)}</div>`;
  animate(); pLoad(PR.s);
}
async function pLoad(s) {
  pStop(); PR.s = s; $('#pbody').innerHTML = sk(2);
  try { PR.all = (await qFetch('surah', s, { trans: 'none' })).ayahs; } catch (e) { $('#pbody').innerHTML = `<div class="panel empty">${esc(e.message && !/fetch/i.test(e.message) ? e.message : 'Could not load this surah. Check your connection and try again.')}<br><button class="btn sm" style="margin-top:10px" onclick="pLoad(${s})">Try again</button></div>`; return; }
  PR.from = 1; PR.to = Math.min(5, PR.all.length); pRange();
}
function pRange() { PR.rng = PR.all.filter(a => a.n >= PR.from && a.n <= PR.to); PR.i = 0; PR.res = {}; PR.quiz = null; $('#pf').value = PR.from; $('#pt').value = PR.to; pDraw(); }
function pApply() { const n = PR.all.length, f = Math.max(1, Math.min(n, +$('#pf').value || 1)), t = Math.max(f, Math.min(n, +$('#pt').value || f)); PR.from = f; PR.to = t; pRange(); }
function pChunk(k) { PR.to = Math.min(PR.all.length, PR.from + k - 1); pRange(); }
function pNextChunk() { const size = PR.to - PR.from + 1; if (PR.to >= PR.all.length) { toast('You are at the end of this surah'); return; } PR.from = PR.to + 1; PR.to = Math.min(PR.all.length, PR.from + size - 1); pRange(); }
function pMode(m) { pStop(); PR.mode = m; document.querySelectorAll('.pm').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase() === m)); pDraw(); }
function pDraw() { if (!PR.rng.length) { $('#pbody').innerHTML = '<div class="panel empty">Choose a range of ayahs.</div>'; return; } ({ learn: pLearn, recite: pRecite, quiz: pQuiz })[PR.mode](); animate(); }

/* ---- audio ---- */
function pPlay(list, times) {   // play a list of ayahs in order, the whole list `times` times
  pStop(); const my = pTok; let k = 0, round = 1; pAudio.playbackRate = QP.speed;
  const next = () => {
    if (my !== pTok) return; if (k >= list.length) { if (round < times) { round++; k = 0; } else return; }
    const a = list[k++]; if (!a.audio) { toast('No audio for this ayah', true); return; }
    pAudio.src = a.audio; pAudio.playbackRate = QP.speed; pAudio.onended = next; pAudio.play().catch(() => toast('Audio could not play — check your connection', true));
  };
  next();
}

/* ---- Learn: listen, read along, then hide ---- */
function pLearn() {
  const a = PR.rng[PR.i], n = PR.rng.length, w = pWords(a.text), shown = PR.level === 0 ? a.text : PR.level === 1 ? w[0] + ' …' : PR.level === 2 ? w.map(pFirst).join(' ') : '';
  $('#pbody').innerHTML = `<div class="panel st"><div class="row between"><b>Ayah ${a.n}</b><span class="meta">${PR.i + 1} of ${n} · ${esc(a.sn)}</span></div>
    <div class="pcard vtext" lang="ar" dir="rtl" style="font-size:${QP.size + 2}px;line-height:${QP.lh}">${shown ? esc(shown) : '<span class="meta" style="font-family:Inter">Hidden — recite it, then reveal to check</span>'}</div>
    <div class="row" style="margin-top:12px"><span class="meta">Show</span><div class="chips" style="margin:0">${['Full text', 'First word', 'First letters', 'Hidden'].map((t, i) => `<button class="${PR.level === i ? 'on' : ''}" onclick="PR.level=${i};pLearn()">${t}</button>`).join('')}</div></div>
    <div class="row" style="margin-top:12px"><button class="btn" onclick="pPlay([PR.rng[PR.i]],PR.reps)">Listen ×${PR.reps}</button><button class="btn ghost" onclick="pPlay(PR.rng,2)">Listen to the whole section</button><select aria-label="Repeats" style="width:auto" onchange="PR.reps=+this.value;pLearn()">${[1, 3, 5, 10].map(r => `<option value="${r}" ${PR.reps === r ? 'selected' : ''}>Repeat ${r}</option>`).join('')}</select></div>
    <div class="row between" style="margin-top:14px"><button class="btn ghost" ${PR.i ? '' : 'disabled'} onclick="PR.i--;pLearn()">Previous ayah</button><button class="btn" ${PR.i < n - 1 ? '' : 'disabled'} onclick="PR.i++;pLearn()">Next ayah</button></div></div>
    <div class="panel st"><h2>A reliable method</h2><ol class="steps2"><li>Listen to the ayah several times while reading.</li><li>Read it aloud with the audio, then without it.</li><li>Hide the text and recite from memory.</li><li>Reveal to check, then join it to the previous ayah.</li></ol></div>`;
}

/* ---- Recite: hide, recall, then reveal and self-check ---- */
function pRecite() {
  const n = PR.rng.length; if (PR.i >= n) return pReciteDone();
  const a = PR.rng[PR.i], w = pWords(a.text), hint = PR.level === 3 ? '' : PR.level === 1 ? w[0] + ' …' : w.map(pFirst).join(' '), rev = PR.shown;
  $('#pbody').innerHTML = `<div class="panel st"><div class="row between"><b>Ayah ${a.n}</b><span class="meta">${PR.i + 1} of ${n}</span></div>
    <div class="pcard vtext" lang="ar" dir="rtl" style="font-size:${QP.size + 2}px;line-height:${QP.lh}">${rev ? esc(a.text) : hint ? esc(hint) : '<span class="meta" style="font-family:Inter">Recite this ayah from memory</span>'}</div>
    <div class="row" style="margin-top:12px"><span class="meta">Hint</span><div class="chips" style="margin:0">${[[3, 'None'], [1, 'First word'], [2, 'First letters']].map(h => `<button class="${PR.level === h[0] ? 'on' : ''}" onclick="PR.level=${h[0]};pRecite()">${h[1]}</button>`).join('')}</div></div>
    ${rev ? `<div class="row" style="margin-top:14px"><button class="btn" onclick="pGrade(true)">I recited it correctly</button><button class="btn ghost" onclick="pGrade(false)">I need more practice</button></div>` : `<div class="row" style="margin-top:14px"><button class="btn" onclick="PR.shown=true;pRecite()">Reveal to check</button><button class="btn ghost" onclick="pPlay([PR.rng[PR.i]],1)">Listen</button></div>`}</div>`;
}
function pGrade(ok) { PR.res[PR.rng[PR.i].n] = ok; PR.shown = false; PR.i++; pRecite(); }
function pReciteDone() {
  const total = PR.rng.length, ok = PR.rng.filter(a => PR.res[a.n]).length, weak = PR.rng.filter(a => !PR.res[a.n]);
  pSaveStat(ok, total);
  $('#pbody').innerHTML = `<div class="panel st"><h2>Section complete</h2><div class="grid g3" style="margin-top:12px"><div class="stat"><b>${ok} / ${total}</b><span>Recited correctly</span></div><div class="stat"><b>${total ? Math.round(ok / total * 100) : 0}%</b><span>Accuracy</span></div></div>
    ${weak.length ? `<p class="hint" style="margin-top:12px">Practice again: ayah ${weak.map(a => a.n).join(', ')}.</p>` : '<p class="hint" style="margin-top:12px">Well done. Recite this section to your scholar to have it recorded.</p>'}
    <div class="row" style="margin-top:12px"><button class="btn" onclick="PR.i=0;PR.res={};pRecite()">Recite again</button>${weak.length ? `<button class="btn ghost" onclick="PR.rng=PR.rng.filter(a=>!PR.res[a.n]);PR.i=0;PR.res={};pRecite()">Only the ones I missed</button>` : ''}<button class="btn ghost" onclick="pNextChunk()">Next section</button></div></div>`;
}

/* ---- Quiz ---- */
function pQuiz() {
  const best = (pStats()[PR.s] || {}).best, q = PR.quiz;
  if (!q) {
    $('#pbody').innerHTML = `<div class="panel st"><h2>Quiz</h2><p class="hint">Ten questions drawn from ${PR.scope === 'range' ? 'your selected range' : 'the whole surah'}.${best !== undefined ? ` Your best score on this surah: ${best}/10.` : ''}</p>
      <div class="field" style="margin-top:12px"><label>Question type</label><div class="chips" style="margin:0">${[['next', 'Which ayah comes next'], ['gap', 'Fill the missing words'], ['order', 'Put the words in order']].map(t => `<button class="${PR.type === t[0] ? 'on' : ''}" onclick="PR.type='${t[0]}';pQuiz()">${t[1]}</button>`).join('')}</div></div>
      <div class="field"><label>Questions from</label><div class="chips" style="margin:0">${[['range', 'Selected range'], ['all', 'Whole surah']].map(t => `<button class="${PR.scope === t[0] ? 'on' : ''}" onclick="PR.scope='${t[0]}';pQuiz()">${t[1]}</button>`).join('')}</div></div>
      <button class="btn" onclick="pStartQuiz()">Start quiz</button></div>`; return;
  }
  if (q.idx >= q.qs.length) { pSaveStat(q.score, q.qs.length, true); $('#pbody').innerHTML = `<div class="panel st"><h2>Quiz complete</h2><div class="grid g3" style="margin-top:12px"><div class="stat"><b>${q.score} / ${q.qs.length}</b><span>Score</span></div></div><p class="hint" style="margin-top:12px">${q.score === q.qs.length ? 'A perfect score.' : q.score >= q.qs.length * .7 ? 'Good work. A little more revision and it will be solid.' : 'Keep practising this section in Learn mode, then try again.'}</p><div class="row" style="margin-top:12px"><button class="btn" onclick="pStartQuiz()">Try again</button><button class="btn ghost" onclick="PR.quiz=null;pQuiz()">Change quiz</button></div></div>`; return; }
  const c = q.qs[q.idx];
  $('#pbody').innerHTML = `<div class="panel st"><div class="row between"><b>Question ${q.idx + 1} of ${q.qs.length}</b><span class="meta">Score ${q.score}</span></div>${c.html()}</div>`;
}
function pStartQuiz() {
  const pool = PR.scope === 'range' ? PR.rng : PR.all, type = PR.type; let qs = [];
  const mk = () => type === 'next' ? pMkNext(pool) : type === 'gap' ? pMkGap(pool) : pMkOrder(pool);
  for (let i = 0; i < 10; i++) { const q = mk(); if (q) qs.push(q); }
  if (!qs.length) { toast(type === 'next' ? 'This needs at least two ayahs in range' : 'This range has no ayah long enough for this question', true); return; }
  PR.quiz = { qs, idx: 0, score: 0 }; pQuiz();
}
function pAnswer(ok) { const q = PR.quiz; if (ok) q.score++; q.qs[q.idx].done = true; q.qs[q.idx].ok = ok; }
function pNextQ() { PR.quiz.idx++; pQuiz(); }
const pFeedback = c => c.done ? `<div class="${c.ok ? 'okline' : 'ferr show'}" style="margin-top:12px">${c.ok ? 'Correct.' : 'Not quite.'}</div><button class="btn" style="margin-top:10px" onclick="pNextQ()">${PR.quiz.idx + 1 < PR.quiz.qs.length ? 'Next question' : 'See result'}</button>` : '';

function pMkNext(pool) {
  const cand = pool.filter(a => PR.all.find(b => b.n === a.n + 1)); if (!cand.length) return null;
  const a = pool[Math.floor(Math.random() * pool.length)], k = cand[Math.floor(Math.random() * cand.length)], right = PR.all.find(b => b.n === k.n + 1);
  const others = pShuffle(PR.all.filter(b => b.n !== right.n && b.n !== k.n)).slice(0, 3), opts = pShuffle([right, ...others]);
  const c = { picked: -1, done: false, ok: false, html: () => `<p class="hint">Which ayah comes after this one?</p><div class="pcard vtext" lang="ar" dir="rtl" style="font-size:${QP.size}px;line-height:${QP.lh}">${esc(k.text)}</div><div class="grid" style="margin-top:12px;gap:8px">${opts.map((o, i) => `<button class="popt vtext ${c.done ? (o.n === right.n ? 'right' : i === c.picked ? 'wrong' : '') : ''}" lang="ar" dir="rtl" style="font-size:${QP.size - 4}px;line-height:${QP.lh - .3}" ${c.done ? 'disabled' : ''} onclick="pPickNext(${i})">${esc(o.text)}</button>`).join('')}</div>${pFeedback(c)}` };
  c.pick = i => { c.picked = i; pAnswer(opts[i].n === right.n); }; return c;
}
function pPickNext(i) { PR.quiz.qs[PR.quiz.idx].pick(i); pQuiz(); }

function pMkGap(pool) {
  const ok = pool.filter(a => pWords(a.text).length >= 4); if (!ok.length) return null;
  const a = ok[Math.floor(Math.random() * ok.length)], w = pWords(a.text), nb = w.length > 8 ? 3 : w.length > 5 ? 2 : 1;
  const idxs = pShuffle(w.map((_, i) => i)).slice(0, nb).sort((x, y) => x - y), miss = idxs.map(i => w[i]);
  const dist = pShuffle(PR.all.flatMap(b => b.n === a.n ? [] : pWords(b.text)).filter(x => !miss.includes(x))).slice(0, 2);
  const bank = pShuffle([...miss, ...dist].map((t, id) => ({ t, id })));
  const c = { fill: [], done: false, ok: false, html: () => `<p class="hint">Tap the words to fill the gaps, in reading order.</p><div class="pcard vtext" lang="ar" dir="rtl" style="font-size:${QP.size}px;line-height:${QP.lh + .2}">${w.map((x, i) => { const g = idxs.indexOf(i); if (g < 0) return esc(x); const f = c.fill[g]; return `<span class="blank ${c.done ? (f && f.t === miss[g] ? 'right' : 'wrong') : ''}" ${!c.done && f ? `onclick="pGapRemove(${g})"` : ''}>${f ? esc(f.t) : '&nbsp;&nbsp;&nbsp;&nbsp;'}</span>`; }).join(' ')}</div><div class="row" style="margin-top:12px;gap:8px;justify-content:center" dir="rtl">${bank.map(b => `<button class="wbtn" lang="ar" ${c.done || c.fill.some(f => f && f.id === b.id) ? 'disabled' : ''} onclick="pGapAdd(${b.id})">${esc(b.t)}</button>`).join('')}</div>${pFeedback(c)}` };
  c.add = id => { const g = idxs.findIndex((_, k) => !c.fill[k]); if (g < 0) return; c.fill[g] = bank.find(b => b.id === id); if (c.fill.filter(Boolean).length === idxs.length) pAnswer(idxs.every((_, k) => c.fill[k].t === miss[k])); };
  c.remove = g => { c.fill[g] = undefined; }; return c;
}
const pGapAdd = id => { PR.quiz.qs[PR.quiz.idx].add(id); pQuiz(); };
const pGapRemove = g => { PR.quiz.qs[PR.quiz.idx].remove(g); pQuiz(); };

function pMkOrder(pool) {
  const ok = pool.filter(a => { const n = pWords(a.text).length; return n >= 4 && n <= 12; }); if (!ok.length) return null;
  const a = ok[Math.floor(Math.random() * ok.length)], w = pWords(a.text), bank = pShuffle(w.map((t, id) => ({ t, id })));
  const c = { seq: [], done: false, ok: false, html: () => `<p class="hint">Tap the words in the correct order.</p><div class="pcard vtext" lang="ar" dir="rtl" style="min-height:80px;font-size:${QP.size}px;line-height:${QP.lh}">${c.seq.map((b, k) => `<span class="blank ${c.done ? (b.t === w[k] ? 'right' : 'wrong') : ''}" ${c.done ? '' : `onclick="pOrdRemove(${k})"`}>${esc(b.t)}</span>`).join(' ') || '<span class="meta" style="font-family:Inter">Your answer appears here</span>'}</div><div class="row" style="margin-top:12px;gap:8px;justify-content:center" dir="rtl">${bank.map(b => `<button class="wbtn" lang="ar" ${c.done || c.seq.some(s => s.id === b.id) ? 'disabled' : ''} onclick="pOrdAdd(${b.id})">${esc(b.t)}</button>`).join('')}</div>${pFeedback(c)}` };
  c.add = id => { c.seq.push(bank.find(b => b.id === id)); if (c.seq.length === w.length) pAnswer(c.seq.every((b, k) => b.t === w[k])); };
  c.remove = k => { c.seq.splice(k, 1); }; return c;
}
const pOrdAdd = id => { PR.quiz.qs[PR.quiz.idx].add(id); pQuiz(); };
const pOrdRemove = k => { PR.quiz.qs[PR.quiz.idx].remove(k); pQuiz(); };

function pSaveStat(ok, total, quiz) {
  const st = pStats(), cur = st[PR.s] || { rounds: 0 }; cur.rounds++; cur.last = Date.now();
  if (quiz) cur.best = Math.max(cur.best || 0, ok); st[PR.s] = cur; localStorage.setItem('nh_pstats', JSON.stringify(st));
}

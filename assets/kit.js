/* BC Teen Pathways kit. Everything a reader does here stays in this browser (localStorage key "btp.v1"). Nothing is uploaded. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add('js');
  var root = document.documentElement, ROOT = root.dataset.root || '', PAGE = root.dataset.page || location.pathname;
  var DAY = 864e5, KEY = 'btp.v1', S;
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { S = {}; }
  ['cards', 'done', 'quiz', 'wrong', 'notes', 'journal'].forEach(function (k) { S[k] = S[k] || {}; });
  var toastT = 0, toastEl = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { return; }
    if (Date.now() - toastT < 5000 || !document.body) return; toastT = Date.now();
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = '💾 ' + T('Saved in this browser only', '已保存在本机浏览器');
    toastEl.classList.add('on'); setTimeout(function () { toastEl.classList.remove('on'); }, 1600);
  }
  function mode() { return root.dataset.lang === 'zh' ? 'zh' : (root.dataset.lang === 'both' ? 'both' : 'en'); }
  function lang() { return mode() === 'zh' ? 'zh' : 'en'; }
  function T(en, zh) { var m = mode(); return m === 'zh' ? zh : (m === 'both' && zh && zh !== en ? en + ' · ' + zh : en); }
  function L(o) { if (o == null) return ''; if (typeof o === 'string') return o; return T(o.en || '', o.zh || o.en || ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dark() { return root.dataset.mode === 'dark' || (root.dataset.mode !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function cssv(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return +d; }
  function json(id) { var el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { console.error('KIT-ERROR bad json ' + id); return null; } }
  var hooks = [];
  function relang() { hooks.forEach(function (f) { try { f(); } catch (e) { console.error('KIT-ERROR hook ' + e.message); } }); }

  /* ---------- language + mode ---------- */
  function paintToggles() {
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === mode())); });
    $$('[data-set-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(dark())); b.textContent = dark() ? '☾' : '☀'; b.title = T('Light / dark', '浅色 / 深色'); });
  }
  $$('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.lang = b.dataset.setLang; root.lang = b.dataset.setLang === 'zh' ? 'zh-Hans' : 'en'; setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
      try { localStorage.setItem('btp.lang', b.dataset.setLang); localStorage.setItem('teen:lang', b.dataset.setLang); } catch (e) {}  /* teen:lang = one choice for the whole study-site family (bio11, chem11, precalc11 read it too) */
      paintToggles(); relang();
    });
  });
  $$('[data-set-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.mode = dark() ? 'light' : 'dark';
      try { localStorage.setItem('btp.mode', root.dataset.mode); } catch (e) {}
      paintToggles(); restyle();
    });
  });
  paintToggles();

  /* ---------- figure bookkeeping (the gate reads data-figs) ---------- */
  var pending = { mmd: 1, chart: 1, mol: 1 }, figErrors = 0;
  function settle(k) { pending[k] = 0; if (!pending.mmd && !pending.chart && !pending.mol) root.dataset.figs = figErrors ? 'error' : 'done'; }

  /* ---------- Mermaid ---------- */
  var MMD_N = 0;
  function mmdInit() {
    var d = dark();
    window.mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: cssv('--font') || 'sans-serif',
      themeVariables: {
        darkMode: d, background: cssv('--surface'), primaryColor: cssv('--a-soft'), primaryTextColor: cssv('--ink'), primaryBorderColor: cssv('--a'),
        secondaryColor: cssv('--surface-2'), tertiaryColor: cssv('--surface'), lineColor: cssv('--ink-3'), textColor: cssv('--ink'),
        mainBkg: cssv('--a-soft'), nodeBorder: cssv('--a'), clusterBkg: cssv('--surface-2'), clusterBorder: cssv('--line'),
        titleColor: cssv('--ink'), edgeLabelBackground: cssv('--surface'), fontSize: '15px',
        cScale0: cssv('--a'), cScale1: cssv('--a-2'), cScale2: cssv('--a-soft'), cScaleLabel0: '#fff', cScaleLabel1: '#fff',
        cScale3: cssv('--surface-2'), cScale4: cssv('--a-soft'), cScale5: cssv('--surface-2'), cScale6: cssv('--a-soft'), cScale7: cssv('--surface-2')
      },
      flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
      mindmap: { useMaxWidth: true, padding: 10 }, timeline: { useMaxWidth: true }
    });
  }
  function renderOne(code) {
    code = code.replace(/var\(--([a-z0-9_-]+)\)/g, function (_, n) { return cssv('--' + n) || '#888888'; });  // semantic tokens in diagrams (follow light/dark)
    var id = 'mmd' + (++MMD_N), tries = 0;
    function attempt() {
      tries++;
      return Promise.resolve().then(function () { return window.mermaid.render(id + 't' + tries, code); }).then(function (r) {
        if (/d="[^"]*NaN/.test(r.svg) && tries < 3) return attempt();
        if (/d="[^"]*NaN/.test(r.svg)) r.svg = r.svg.replace(/<path[^>]*d="[^"]*NaN[^"]*"[^>]*>(<\/path>)?/g, '');
        if (/Syntax error/i.test(r.svg)) throw new Error('syntax error');
        return r.svg;
      });
    }
    return attempt().catch(function (e) { var bad = document.getElementById('d' + id + 't' + tries); if (bad) bad.remove(); throw e; });
  }
  // phones: a wide diagram scaled to 360 px is unreadable, so keep it at >= 70% of natural size and let it scroll sideways inside its card
  function fitWide(out) {
    var svg = out.querySelector('svg'); if (!svg) return;
    var vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/), nat = +vb[2] || 0, cw = out.clientWidth || out.parentNode.clientWidth;
    out.classList.remove('wide', 'fits');
    if (nat && cw && nat * 0.7 > cw) { svg.style.maxWidth = 'none'; svg.style.width = Math.round(nat * 0.7) + 'px'; out.classList.add('wide'); }
    else out.classList.add('fits');
    var hint = out.nextElementSibling && out.nextElementSibling.classList.contains('scroll-hint') ? out.nextElementSibling : null;
    if (!hint) { hint = document.createElement('div'); hint.className = 'scroll-hint ' + ((out.className.match(/l-(en|zh)/) || [''])[0]); out.parentNode.insertBefore(hint, out.nextSibling); }
    hint.textContent = T('← swipe to see the whole diagram →', '← 左右滑动看完整图 →');
    hint.classList.toggle('on', out.classList.contains('wide'));
  }
  function renderMermaid() {
    var srcs = $$('pre.mmd');
    if (!srcs.length) { settle('mmd'); return Promise.resolve(); }
    if (!window.mermaid) { console.error('MERMAID-ERROR library missing'); figErrors++; settle('mmd'); return Promise.resolve(); }
    pending.mmd = 1; mmdInit();
    var chain = Promise.resolve();
    srcs.forEach(function (pre) {
      chain = chain.then(function () {
        return renderOne(pre.textContent).then(function (svg) {
          var out = pre.previousElementSibling && pre.previousElementSibling.classList.contains('mmd-out') ? pre.previousElementSibling : null;
          if (!out) { out = document.createElement('div'); out.className = 'mmd-out ' + ((pre.className.match(/l-(en|zh)/) || [''])[0]); out.setAttribute('role', 'img'); pre.parentNode.insertBefore(out, pre); }
          out.innerHTML = svg; pre.hidden = true; fitWide(out);
        }).catch(function (e) { figErrors++; console.error('MERMAID-ERROR ' + (e && e.message ? e.message : e)); });
      });
    });
    return chain.then(function () { settle('mmd'); });
  }

  /* ---------- Chart.js ---------- */
  var charts = [];
  function renderCharts() {
    charts.forEach(function (c) { c.destroy(); }); charts = [];
    var cvs = $$('canvas[data-chart]');
    if (!cvs.length) { settle('chart'); return; }
    if (!window.Chart) { console.error('KIT-ERROR Chart.js missing'); figErrors++; settle('chart'); return; }
    var ink = cssv('--ink-2'), line = cssv('--line'), a = cssv('--a'), a2 = cssv('--a-2');
    Chart.defaults.color = ink; Chart.defaults.borderColor = line; Chart.defaults.font.family = cssv('--font');
    cvs.forEach(function (cv) {
      var d = json(cv.dataset.chart); if (!d) { figErrors++; return; }
      var palette = [a, a2, cssv('--warn'), cssv('--ok'), cssv('--bad'), cssv('--ink-3')];
      var ds = d.datasets.map(function (s, i) {
        var tc = s.tok ? (Array.isArray(s.tok) ? s.tok.map(function (x) { return cssv('--' + x); }) : cssv('--' + s.tok)) : null;  // semantic tokens
        return { label: L(s.label), data: s.data, backgroundColor: tc || (s.color === 'alt' ? a2 : (d.type === 'doughnut' ? palette : (i ? a2 : a))), borderColor: d.type === 'line' ? (tc || (i ? a2 : a)) : (d.type === 'doughnut' ? cssv('--surface') : 'transparent'), borderRadius: 6, borderWidth: d.type === 'line' ? 3 : 0, tension: .35, fill: false };
      });
      var horiz = d.indexAxis === 'y';
      var c = new Chart(cv, {
        type: d.type || 'bar',
        data: { labels: d.labels.map(L), datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: d.indexAxis || 'x', animation: { duration: 700 },
          plugins: { legend: { display: ds.length > 1 || d.type === 'doughnut', position: 'bottom' },
            tooltip: { callbacks: { label: function (x) { var v = horiz ? x.parsed.x : x.parsed.y; if (d.type === 'doughnut') v = x.parsed; return (x.dataset.label ? x.dataset.label + ': ' : '') + (d.unit === '$' ? '$' + Number(v).toLocaleString() : v + (d.unit ? ' ' + L(d.unit) : '')); } } } },
          scales: d.type === 'doughnut' ? {} : (function () {
            var val = { beginAtZero: true, grid: { color: line }, ticks: { callback: function (v) { return d.unit === '$' ? '$' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v) : v; } }, title: { display: !!d.axis, text: L(d.axis) } };
            var cat = { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } }, title: { display: !!d.xaxis, text: L(d.xaxis) } };
            return horiz ? { x: val, y: cat } : { x: cat, y: val };
          })()
        }
      });
      charts.push(c);
    });
    settle('chart');
  }
  hooks.push(renderCharts);

  /* ---------- 3D molecules (3Dmol.js) ---------- */
  var viewers = [];
  function renderMols() {
    var boxes = $$('.mol[data-mols]');
    if (!boxes.length) { settle('mol'); return; }
    if (!window.$3Dmol) { console.error('KIT-ERROR 3Dmol missing'); figErrors++; settle('mol'); return; }
    boxes.forEach(function (box) {
      var ids = box.dataset.mols.split(','), bar = box.parentNode.querySelector('.mol-bar'), note = box.parentNode.querySelector('.mol-note');
      var info = json(box.dataset.info) || {};
      var v;
      try { v = $3Dmol.createViewer(box, { backgroundAlpha: 0 }); } catch (e) { console.error('KIT-ERROR webgl ' + e.message); figErrors++; return; }
      viewers.push(v);
      function show(id) {
        var sdf = document.getElementById('sdf-' + id); if (!sdf) return;
        v.clear(); v.addModel(sdf.textContent, 'sdf');
        v.setStyle({}, { stick: { radius: 0.17, colorscheme: dark() ? 'Jmol' : 'Jmol' }, sphere: { scale: 0.27, colorscheme: 'Jmol' } });
        v.zoomTo(); v.render(); v.spin('y', 0.6);
        box.dataset.shown = id;
        if (bar) $$('button', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mol === id)); });
        if (note && info[id]) note.innerHTML = '<b>' + esc(L(info[id].name)) + '</b> — ' + esc(L(info[id].text));
      }
      if (bar) $$('button', bar).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.mol); }); });
      show(ids[0]);
      hooks.push(function () { show(box.dataset.shown); });
      box.addEventListener('pointerdown', function () { v.spin(false); });
      if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {  // don't trap page scrolling on phones: tap first to turn the model
        var tap = document.createElement('button'); tap.type = 'button'; tap.className = 'tap'; tap.innerHTML = '<span>' + esc(T('Tap to turn the model', '点一下再旋转模型')) + '</span>';
        box.appendChild(tap); tap.addEventListener('click', function () { tap.remove(); });
      }
    });
    settle('mol');
  }

  var styleHooks = [];
  function restyle() { renderMermaid(); renderCharts(); styleHooks.forEach(function (f) { try { f(); } catch (e) { console.error('KIT-ERROR style hook ' + e.message); } }); }

  /* ---------- KaTeX ---------- */
  function renderMath() {
    if (window.renderMathInElement) {
      try { renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
      catch (e) { console.error('KIT-ERROR katex ' + e.message); }
    }
  }

  /* ---------- page done + progress rings ---------- */
  function ringSVG(frac, size, stroke) {
    size = size || 64; stroke = stroke || 7; var r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><circle class="trk" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="val" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - Math.max(0, Math.min(1, frac)))) + '"/></svg>';
  }
  var MAP = window.BTP_MAP || { sections: [] };
  function sectionFrac(sec) { if (!sec.pages || !sec.pages.length) return 0; return sec.pages.filter(function (p) { return S.done[p]; }).length / sec.pages.length; }
  function paintRings() {
    $$('.ring[data-ring]').forEach(function (el) {
      var key = el.dataset.ring, frac, n = 0, tot = 0;  // zero shows a plain count, not "0%"  (review 1115)
      if (key === 'all') { MAP.sections.forEach(function (s) { if (s.pages) { tot += s.pages.length; n += s.pages.filter(function (p) { return S.done[p]; }).length; } }); frac = tot ? n / tot : 0; }
      else { var sec = MAP.sections.filter(function (s) { return s.id === key; })[0]; if (!sec) return; frac = sectionFrac(sec); n = Math.round(frac * sec.pages.length); tot = sec.pages.length; }
      el.style.setProperty('--ring', 'var(--' + (frac <= 0 ? 'm0' : frac < 0.34 ? 'm1' : frac < 0.67 ? 'm2' : 'm3') + ')');
      var size = +(el.dataset.size || 64);
      el.innerHTML = ringSVG(frac, size, size > 90 ? 11 : 7) + '<span class="lbl">' + (frac > 0 ? Math.round(frac * 100) + '%' : (size > 90 ? '<small style="font-size:.8rem;font-weight:600">' + n + ' / ' + tot + '</small>' : '·')) + '</span>';
      el.title = n + ' / ' + tot;
    });
  }
  $$('.donebox input[data-page]').forEach(function (cb) {
    cb.checked = !!S.done[cb.dataset.page];
    cb.addEventListener('change', function () { if (cb.checked) S.done[cb.dataset.page] = Date.now(); else delete S.done[cb.dataset.page]; save(); paintRings(); if (cb.checked) cheer(cb.closest('.donebox')); });
  });
  function cheer(el) { if (!el || !el.animate) return; el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 350 }); }

  /* ---------- spaced repetition (shared by flip cards and missed quiz questions) ---------- */
  var STEPS = [1, 3, 7, 14, 30];
  function schedule(rec, ok) {
    if (ok) { rec.n = (rec.n || 0) + 1; rec.due = today0() + STEPS[Math.min(rec.n, STEPS.length) - 1] * DAY; rec.last = 'got'; }
    else { rec.n = 0; rec.due = Date.now(); rec.last = 'again'; }
    return rec;
  }
  function due(rec) { return rec && rec.due <= Date.now(); }
  function whenText(rec) {
    if (!rec) return '';
    if (rec.last === 'again') return T('In your review queue', '已进复习队列');
    var d = Math.round((rec.due - today0()) / DAY);
    return d <= 0 ? T('Due today', '今天该复习') : T('Back in ' + d + (d === 1 ? ' day' : ' days'), d + ' 天后再出现');
  }

  /* ---------- flip cards ---------- */
  function wireCards() {
    $$('.fc[data-card]').forEach(function (fc) {
      if (fc.dataset.wired) return; fc.dataset.wired = '1';
      var flip = $('.flip', fc), id = fc.dataset.card;
      function toggle() { flip.classList.toggle('on'); }
      flip.addEventListener('click', toggle);
      flip.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      $$('.cbtn button', fc).forEach(function (b) {
        b.addEventListener('click', function () {
          var rec = schedule(S.cards[id] || {}, b.dataset.rate === 'got');
          rec.page = PAGE; rec.title = document.title.split(' | ')[0];
          rec.q = { en: ($('.front .l-en', fc) || {}).textContent || '', zh: ($('.front .l-zh', fc) || {}).textContent || '' };
          rec.a = { en: ($('.back .l-en', fc) || {}).textContent || '', zh: ($('.back .l-zh', fc) || {}).textContent || '' };
          S.cards[id] = rec; save(); paint(fc);
        });
      });
      paint(fc);
    });
    function paint(fc) {
      var rec = S.cards[fc.dataset.card];
      $$('.cbtn button', fc).forEach(function (b) { b.classList.toggle('sel', !!rec && rec.last === b.dataset.rate); });
      var w = $('.when', fc); if (w) w.textContent = whenText(rec);
    }
    hooks.push(function () { $$('.fc[data-card]').forEach(paint); });
  }

  /* ---------- quizzes: instant feedback, wrong-answer book, review queue ---------- */
  function wireQuizzes() {
    $$('.quiz[data-quiz]').forEach(function (box) {
      var qs = json(box.dataset.quiz); if (!qs) return;
      var qid = box.dataset.quizId || box.dataset.quiz;
      function draw() {
        var st = S.quiz[qid] || {};
        box.innerHTML = qs.map(function (q, i) {
          var picked = st[i];
          return '<div class="qz' + (picked != null ? ' answered' : '') + '" data-i="' + i + '"><div class="qn">' + (i + 1) + '. ' + esc(L(q.q)) + '</div><div class="opts">' +
            q.opts.map(function (o, j) {
              var cls = picked == null ? '' : (j === q.a ? 'right' : (j === picked ? 'wrong' : ''));
              return '<button type="button" data-j="' + j + '" class="' + cls + '"' + (picked != null ? ' disabled' : '') + '>' + esc(L(o)) + '</button>';
            }).join('') + '</div><div class="why">' + (picked == null ? '' : (picked === q.a ? '✅ ' : '💡 ')) + esc(L(q.why)) + '</div></div>';
        }).join('') + '<div class="row"><span class="score"></span><button type="button" class="btn sm" data-reset>' + esc(T('Try again', '重做一遍')) + '</button></div>';
        var done = Object.keys(st).length, right = Object.keys(st).filter(function (k) { return st[k] === qs[k].a; }).length;
        $('.score', box).textContent = done ? T(right + ' / ' + qs.length + ' right', '答对 ' + right + ' / ' + qs.length) + (done === qs.length && right === qs.length ? ' 🎉' : '') : T(qs.length + ' quick questions — no grades, just practice. Missed ones go to your review queue with the reason.', qs.length + ' 道小题——不打分，只是练习。答错的会带着原因进复习队列。');
        $$('.opts button', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var i = +b.closest('.qz').dataset.i, j = +b.dataset.j, q = qs[i];
            st[i] = j; S.quiz[qid] = st;
            var wid = qid + '#' + i;
            if (j !== q.a) { S.wrong[wid] = schedule({ q: q.q, right: q.opts[q.a], picked: q.opts[j], why: q.why, page: PAGE, title: document.title.split(' | ')[0], at: Date.now() }, false); }
            else if (S.wrong[wid]) { schedule(S.wrong[wid], true); }
            save(); draw();
          });
        });
        $('[data-reset]', box).addEventListener('click', function () { delete S.quiz[qid]; save(); draw(); });
      }
      draw(); hooks.push(draw);
    });
  }

  /* ---------- review page: due queue + wrong-answer book ---------- */
  function wireReview() {
    var q = $('#review-due'), wb = $('#wrongbook'); if (!q && !wb) return;
    function draw() {
      if (q) {
        var items = Object.keys(S.cards).filter(function (k) { return due(S.cards[k]); }).map(function (k) { return { k: k, kind: 'card', r: S.cards[k] }; })
          .concat(Object.keys(S.wrong).filter(function (k) { return due(S.wrong[k]); }).map(function (k) { return { k: k, kind: 'wrong', r: S.wrong[k] }; }));
        $('#review-count') && ($('#review-count').textContent = items.length);
        var all = items.length, cap = q.dataset.all ? 999 : 5; items = items.slice(0, cap);
        q.innerHTML = items.length ? items.map(function (it) {
          var v = it.kind === 'wrong' && it.r.variant;
          if (v) {   // review with a variant on the same idea, not the original question
            return '<div class="card sbar c-m1" data-k="' + esc(it.k) + '" data-kind="wrong" data-va="' + v.a + '"><div class="small muted">' + semChip('m', '1') + ' ' + esc(it.r.title || '') + (it.r.topic ? ' · ' + esc(it.r.topic) : '') + ' · ' + esc(T('a new question on the idea you missed', '针对你错过的概念的一道新题')) + '</div><p><b>' + esc(L(v.q)) + '</b></p>' +
              '<div class="opts rv-opts">' + v.opts.map(function (o, j) { return '<button type="button" class="btn sm" data-vj="' + j + '">' + 'ABCD'[j] + '. ' + esc(L(o)) + '</button>'; }).join('') + '</div><p class="small rv-why" hidden>' + esc(L(v.why)) + '</p>' +
              (it.r.href ? '<p class="small"><a href="' + ROOT + esc(it.r.href) + '">' + esc(T('Back to the original question →', '回到原题 →')) + '</a></p>' : '') + '</div>';
          }
          var front = it.kind === 'card' ? L(it.r.q) : L(it.r.q), back = it.kind === 'card' ? L(it.r.a) : (T('Answer: ', '答案：') + L(it.r.right) + ' — ' + L(it.r.why));
          return '<div class="card sbar ' + (it.kind === 'wrong' ? 'c-m1' : 'c-m2') + '" data-k="' + esc(it.k) + '" data-kind="' + it.kind + '"><div class="small muted">' + semChip('m', it.kind === 'wrong' ? '1' : '2') + ' ' + esc(it.r.title || '') + '</div><p><b>' + esc(front) + '</b></p>' +
            '<details><summary>' + esc(T('Show answer', '看答案')) + '</summary><p>' + esc(back) + '</p></details><div class="row"><button class="btn sm solid" data-ok>' + esc(T('I knew it', '我会了')) + '</button><button class="btn sm" data-no>' + esc(T('Not yet', '还不熟')) + '</button></div></div>';
        }).join('') + (all > items.length ? '<p><button class="btn sm" type="button" data-more>' + esc(T('Show the other ' + (all - items.length) + ' (optional)', '显示其余 ' + (all - items.length) + ' 项（可选）')) + '</button></p><p class="small muted">' + esc(T('Five a day is plenty. Nothing here is overdue — it simply waits for you.', '每天五项就很好。这里没有「过期」——它们只是在等你。')) + '</p>' : '') : '<p class="muted">' + esc(T('Nothing is due. That is a good place to be — come back tomorrow.', '今天没有要复习的。这样就很好，明天再来。')) + '</p>';
        var mb = $('[data-more]', q); if (mb) mb.addEventListener('click', function () { q.dataset.all = '1'; draw(); });
        $$('[data-vj]', q).forEach(function (b) {
          b.addEventListener('click', function () {
            var c = b.closest('[data-k]'), ok = +b.dataset.vj === +c.dataset.va;
            $$('[data-vj]', c).forEach(function (x) { x.disabled = true; x.classList.toggle('solid', +x.dataset.vj === +c.dataset.va); });
            var w = $('.rv-why', c); w.hidden = false; w.textContent = (ok ? '✅ ' : '💡 ') + w.textContent.replace(/^(✅|💡) /, '');
            schedule(S.wrong[c.dataset.k], ok); save(); setTimeout(draw, ok ? 1800 : 4000);
          });
        });
        $$('[data-ok],[data-no]', q).forEach(function (b) {
          b.addEventListener('click', function () {
            var c = b.closest('[data-k]'), store = c.dataset.kind === 'card' ? S.cards : S.wrong;
            schedule(store[c.dataset.k], b.hasAttribute('data-ok')); save(); draw();
          });
        });
      }
      if (wb) {
        var ks = Object.keys(S.wrong).sort(function (a, b) { return (S.wrong[b].at || 0) - (S.wrong[a].at || 0); });
        wb.innerHTML = ks.length ? '<div class="tbl stack"><table><thead><tr><th>' + esc(T('Question', '题目')) + '</th><th>' + esc(T('I picked', '我选了')) + '</th><th>' + esc(T('Right answer & why', '正确答案与原因')) + '</th><th></th></tr></thead><tbody>' +
          ks.map(function (k) { var w = S.wrong[k]; return '<tr><td data-h="' + esc(T('Question', '题目')) + '">' + esc(L(w.q)) + '<div class="small muted">' + esc(w.title || '') + '</div></td><td data-h="' + esc(T('I picked', '我选了')) + '">' + esc(L(w.picked)) + '</td><td data-h="' + esc(T('Right answer & why', '正确答案与原因')) + '"><b>' + esc(L(w.right)) + '</b><br>' + esc(L(w.why)) + '</td><td><button class="btn sm" data-del="' + esc(k) + '">' + esc(T('Remove', '移除')) + '</button></td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="muted">' + esc(T('Empty. Every question you miss on any page lands here automatically, with the reason.', '空的。任何一页答错的题都会自动来到这里，带上原因。')) + '</p>';
        $$('[data-del]', wb).forEach(function (b) { b.addEventListener('click', function () { delete S.wrong[b.dataset.del]; save(); draw(); }); });
      }
    }
    draw(); hooks.push(draw);
    var bx = $('#backup-export'), bi = $('#backup-import');
    if (bx) bx.addEventListener('click', function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'bc-teen-pathways', v: 1, at: new Date().toISOString(), state: S }, null, 1)], { type: 'application/json' })); a.download = 'pathways-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); });
    if (bi) bi.addEventListener('change', function () {
      var f = bi.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { var d = JSON.parse(r.result); if (d.app !== 'bc-teen-pathways' || !d.state) throw new Error('not a backup'); S = d.state; ['cards', 'done', 'quiz', 'wrong', 'notes', 'journal'].forEach(function (k) { S[k] = S[k] || {}; }); save(); alert(T('Backup restored.', '备份已恢复。')); location.reload(); } catch (e) { alert(T('That file is not a Pathways backup.', '这个文件不是本站的备份。')); } };
      r.readAsText(f);
    });
    var ex = $('#export-wrong');
    if (ex) ex.addEventListener('click', function () {
      var md = '# ' + T('Wrong-answer book', '错题本') + ' (' + today() + ')\n\n' + Object.keys(S.wrong).map(function (k, i) { var w = S.wrong[k]; return (i + 1) + '. **' + L(w.q) + '**\n   - ' + T('I picked', '我选了') + ': ' + L(w.picked) + '\n   - ' + T('Right', '正确') + ': ' + L(w.right) + '\n   - ' + L(w.why) + '\n'; }).join('\n');
      download('wrong-answer-book-' + today() + '.md', md);
    });
  }

  /* ---------- audio: in-page player + download, or "coming soon" ---------- */
  function wireAudio() {
    $$('.ap').forEach(function (ap) {
      var src = ap.dataset.src, slot = $('.slot', ap);
      if (!src) { ap.classList.add('soon'); slot.innerHTML = '<span class="tag soon">' + esc(T('Coming soon', '即将上线')) + '</span>'; hooks.push(function () { slot.innerHTML = '<span class="tag soon">' + esc(T('Coming soon', '即将上线')) + '</span>'; }); return; }
      slot.innerHTML = '<audio controls preload="none" src="' + esc(src) + '"></audio> <a class="btn sm" download href="' + esc(src) + '">' + esc(T('Download', '下载')) + '</a>';
      var au = $('audio', ap);
      au.addEventListener('play', function () { ap.classList.add('playing'); });
      au.addEventListener('pause', function () { ap.classList.remove('playing'); });
    });
  }

  /* ---------- notes, journal: autosave inputs, export Markdown, print one block to PDF ---------- */
  function download(name, text) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function wireNotes() {
    $$('[data-note]').forEach(function (form) {
      var nid = form.dataset.note, st = S.notes[nid] = S.notes[nid] || {};
      var msg = $('.saved', form), t;
      $$('[data-k]', form).forEach(function (el) {
        if (st[el.dataset.k] != null) { if (el.type === 'checkbox') el.checked = !!st[el.dataset.k]; else el.value = st[el.dataset.k]; }
        el.addEventListener('input', function () {
          st[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; st._at = Date.now(); save();
          if (msg) { msg.textContent = T('Saved in this browser', '已存在本机浏览器'); clearTimeout(t); t = setTimeout(function () { msg.textContent = ''; }, 1500); }
        });
      });
      $$('[data-export-md]', form).forEach(function (b) {
        b.addEventListener('click', function () {
          var title = (form.dataset.title && L(json(form.dataset.title))) || nid, md = '# ' + title + '\n\n_' + today() + '_\n\n';
          $$('[data-k]', form).forEach(function (el) {
            var lab = el.closest('.field') ? ($('.field > span .l-' + lang(), el.closest('.field')) || $('.field > span', el.closest('.field')) || {}).textContent : el.dataset.k;
            var v = el.type === 'checkbox' ? (el.checked ? '[x]' : '[ ]') : (el.value || '').trim();
            if (v) md += '## ' + (lab || el.dataset.k).trim() + '\n\n' + v + '\n\n';
          });
          download(nid + '-' + today() + '.md', md);
        });
      });
      $$('[data-print]', form).forEach(function (b) {
        b.addEventListener('click', function () {
          var clone = form.cloneNode(true); clone.classList.add('print-target');
          $$('textarea', clone).forEach(function (ta, i) { var d = document.createElement('div'); d.style.whiteSpace = 'pre-wrap'; d.style.border = '1px solid #999'; d.style.borderRadius = '8px'; d.style.padding = '8px'; d.style.minHeight = '60px'; d.textContent = $$('textarea', form)[i].value; ta.replaceWith(d); });
          $$('.no-print, button', clone).forEach(function (x) { x.remove(); });
          document.body.appendChild(clone); root.classList.add('print-note');
          window.print();
          setTimeout(function () { root.classList.remove('print-note'); clone.remove(); }, 300);
        });
      });
    });
    var mn = $('#mynotes');
    if (mn) { var drawMN = function () { var ks = Object.keys(S.notes).filter(function (k) { var o = S.notes[k]; return Object.keys(o).some(function (f) { return f !== '_at' && o[f]; }); });
      mn.innerHTML = ks.length ? ks.map(function (k) { return '<a href="#' + esc(k) + '">' + esc(k) + '</a>' + (S.notes[k]._at ? ' <span class="muted">(' + new Date(S.notes[k]._at).toLocaleDateString() + ')</span>' : ''); }).join(' · ') : esc(T('None yet — fill in any template below and it appears here.', '还没有——在下面任一模板里写点什么，就会出现在这里。')); };
      drawMN(); hooks.push(drawMN); document.addEventListener('input', function () { setTimeout(drawMN, 50); }); }
    // live diagram preview for mind-map / concept-map templates
    $$('textarea[data-live]').forEach(function (ta) {
      var out = document.getElementById(ta.dataset.live), tm;
      function go() {
        if (!window.mermaid || !out) return;
        var code = ta.dataset.kind === 'mindmap' ? outlineToMindmap(ta.value) : linksToGraph(ta.value);
        if (!code) { out.innerHTML = '<p class="muted small">' + esc(T('Type above and the diagram draws itself here.', '在上面输入，图会自己画在这里。')) + '</p>'; return; }
        mmdInit();
        renderOne(code).then(function (svg) { out.innerHTML = svg; }).catch(function () { out.innerHTML = '<p class="muted small">' + esc(T('Keep typing — the diagram waits for a complete line.', '继续写——图会等到一行写完再画。')) + '</p>'; });
      }
      ta.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(go, 600); });
      hooks.push(go); setTimeout(go, 50);
    });
  }
  function clean(s) { return s.replace(/[()[\]{}"<>`]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function outlineToMindmap(txt) {
    var lines = txt.split('\n').filter(function (l) { return l.trim(); }); if (!lines.length) return '';
    var out = ['mindmap'], first = true;
    lines.forEach(function (l) {
      var ind = (l.match(/^[\s\-*]*/)[0].replace(/\t/g, '  ').replace(/[-*]/g, ' ').length), t = clean(l.replace(/^[\s\-*]*/, ''));
      if (!t) return;
      if (first) { out.push('  root((' + t + '))'); first = false; return; }
      out.push(new Array(Math.floor(ind / 2) + 3).join('  ') + t);
    });
    return out.join('\n');
  }
  function linksToGraph(txt) {
    var out = ['flowchart TD'], ids = {}, n = 0;
    function id(t) { if (!ids[t]) ids[t] = 'n' + (++n); return ids[t]; }
    txt.split('\n').forEach(function (l) {
      var m = l.split(/\s*(?:->|→)\s*/); if (m.length < 2) return;
      var a = clean(m[0]), lab = m.length > 2 ? clean(m[1]) : '', b = clean(m[m.length - 1]);
      if (!a || !b) return;
      out.push('  ' + id(a) + '["' + a + '"] -->' + (lab ? '|' + lab + '|' : '') + ' ' + id(b) + '["' + b + '"]');
    });
    return out.length > 1 ? out.join('\n') : '';
  }

  /* ---------- semantic colour labels (blob "sem" from bin/palette.py; colours come from CSS so they follow light/dark) ---------- */
  var SEM = json('sem') || {};
  function semItem(f, k) { return ((SEM[f] || {}).items || {})[k] || { ico: '', name: { en: k, zh: k }, line: { en: '', zh: '' } }; }
  function semCls(f, k) { return 'c-' + (f === 'm' ? 'm' + k : f + '-' + k); }
  function semChip(f, k) { var it = semItem(f, k); return '<span class="schip ' + semCls(f, k) + '">' + esc(it.ico) + ' ' + esc(L(it.name)) + '</span>'; }
  window.BTP_SEM = { chip: semChip, cls: semCls, item: semItem };

  /* ---------- learning journal: one line, a colour mood (no colour is good or bad), what I did ---------- */
  var LEGACY_MOOD = { 1: 'low', 2: 'anxious', 3: 'calm', 4: 'calm', 5: 'energised' };   // old 1-5 thermometer entries keep a colour
  function feelOf(r) { return r ? (r.feel || LEGACY_MOOD[r.mood] || '') : ''; }
  function dkey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function moodOrder() { return ((SEM.mood || {}).order) || []; }
  function moodPicker(box, getRec, onPick) {   // buttons with dot + emoji + name; the line under says what the colour means
    var line = box.parentNode.querySelector('.moodline');
    function paint() {
      var cur = feelOf(getRec());
      box.innerHTML = (((SEM.mood || {}).pick) || moodOrder()).map(function (k) { var it = semItem('mood', k); return '<button type="button" class="' + semCls('mood', k) + '" data-feel="' + k + '" aria-pressed="' + (cur === k) + '"><span class="sdot"></span>' + esc(it.ico) + ' <span>' + esc(L(it.name)) + '</span></button>'; }).join('');
      $$('button', box).forEach(function (b) { b.addEventListener('click', function () { onPick(b.dataset.feel === cur ? '' : b.dataset.feel); paint(); }); });
      if (line) line.textContent = cur ? L(semItem('mood', cur).line) : L((SEM.mood || {}).note || { en: '', zh: '' });
    }
    paint(); hooks.push(paint); return paint;
  }
  function drawMoodView(box) {   // strip (14 days) · calendar dots (this month) · this week's colour band
    var J = S.journal, now = new Date(); now.setHours(12, 0, 0, 0);
    var parts = (box.dataset.moodview || 'strip,cal,week').split(','), out = '';
    if (parts.indexOf('strip') >= 0) {
      var cells = '', xs = '';
      for (var i = 13; i >= 0; i--) { var d = new Date(+now - i * DAY), k = dkey(d), f = feelOf(J[k]); cells += '<span class="d ' + (f ? semCls('mood', f) : 'none') + '" title="' + k + (f ? ' · ' + esc(L(semItem('mood', f).name)) : '') + '">' + (f ? semItem('mood', f).ico : '') + '</span>'; xs += '<span>' + (i % 2 ? '' : d.getDate()) + '</span>'; }
      out += '<h4 style="margin:.2em 0">' + esc(T('Last 14 days', '最近 14 天')) + '</h4><div class="moodstrip">' + cells + '</div><div class="moodstrip-x">' + xs + '</div>';
    }
    if (parts.indexOf('week') >= 0) {
      var cnt = {}, n = 0, st = new Date(+now - ((now.getDay() + 6) % 7) * DAY);
      for (var j = 0; j < 7; j++) { var f2 = feelOf(J[dkey(new Date(+st + j * DAY))]); if (f2) { cnt[f2] = (cnt[f2] || 0) + 1; n++; } }
      out += '<h4 style="margin:.8em 0 .2em">' + esc(T('This week, in colour', '这一周的颜色')) + '</h4>' + (n ? '<div class="wband" role="img" aria-label="' + esc(moodOrder().filter(function (k) { return cnt[k]; }).map(function (k) { return L(semItem('mood', k).name) + ' ' + cnt[k]; }).join(', ')) + '">' +
        moodOrder().filter(function (k) { return cnt[k]; }).map(function (k) { return '<span class="' + semCls('mood', k) + '" style="flex:' + cnt[k] + '">' + semItem('mood', k).ico + '</span>'; }).join('') + '</div><p class="small muted" style="margin:.3em 0 0">' +
        esc(moodOrder().filter(function (k) { return cnt[k]; }).map(function (k) { return L(semItem('mood', k).name) + ' × ' + cnt[k]; }).join(' · ')) + '</p>' : '<p class="small muted">' + esc(T('No colours yet this week. Pick one whenever you like — there is no right one.', '这周还没有颜色。想选的时候选一个就好——没有「正确」的颜色。')) + '</p>');
    }
    if (parts.indexOf('cal') >= 0) {
      var y = now.getFullYear(), m = now.getMonth(), first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      var heads = T('Mo Tu We Th Fr Sa Su', '一 二 三 四 五 六 日').split(' ');
      var g = heads.map(function (h) { return '<span class="h">' + h + '</span>'; }).join('') + new Array(lead + 1).join('<span></span>');
      for (var dd = 1; dd <= days; dd++) { var k3 = dkey(new Date(y, m, dd)), f3 = feelOf(J[k3]); g += '<span class="c ' + (f3 ? semCls('mood', f3) : 'none') + (k3 === dkey(now) ? ' today' : '') + '" title="' + k3 + (f3 ? ' · ' + esc(L(semItem('mood', f3).name)) : '') + '">' + dd + '<i></i></span>'; }
      out += '<h4 style="margin:.8em 0 .3em">' + esc(now.toLocaleDateString(lang() === 'zh' ? 'zh-CN' : 'en-CA', { year: 'numeric', month: 'long' })) + '</h4><div class="mcal">' + g + '</div>';
    }
    out += '<div class="slegend">' + moodOrder().map(function (k) { return semChip('mood', k); }).join('') + '<span class="note">' + esc(L((SEM.mood || {}).note || { en: '', zh: '' })) + '</span></div>';
    box.innerHTML = out;
  }
  function wireOptLang() {   // <option> cannot hold language spans: data-en / data-zh, swapped on language change (EN mode has no CJK)
    var os = $$('option[data-en]'); if (!os.length) return;
    function paint() { os.forEach(function (o) { o.textContent = T(o.dataset.en, o.dataset.zh); }); } paint(); hooks.push(paint);
  }
  function wireMoodViews() {
    var vs = $$('[data-moodview]'); if (!vs.length) return;
    function draw() { vs.forEach(drawMoodView); } draw(); hooks.push(draw); window.addEventListener('btp-mood', draw);
    $$('[data-moodpick]').forEach(function (box) {   // quick check-in on log pages: writes today's journal colour
      moodPicker(box, function () { return S.journal[today()]; }, function (f) { var r = S.journal[today()] = S.journal[today()] || { line: '', did: {}, more: '' }; r.feel = f; delete r.mood; save(); window.dispatchEvent(new Event('btp-mood')); });
    });
  }
  function wireJournal() {
    var box = $('#journal'); if (!box) return;
    var dateIn = $('#j-date'), cur, repaintPick;
    dateIn.value = today();
    function rec() { return S.journal[dateIn.value] = S.journal[dateIn.value] || { line: '', feel: '', did: {}, more: '' }; }
    function draw() {
      cur = rec();
      $('#j-line').value = cur.line || ''; $('#j-more').value = cur.more || '';
      $$('#j-did input').forEach(function (c) { c.checked = !!(cur.did || {})[c.value]; });
      if (repaintPick) repaintPick();
      drawHistory();
    }
    repaintPick = moodPicker($('#j-moods'), rec, function (f) { var r = rec(); r.feel = f; delete r.mood; save(); drawHistory(); window.dispatchEvent(new Event('btp-mood')); });
    $('#j-line').addEventListener('input', function (e) { rec().line = e.target.value; save(); drawHistory(); });
    $('#j-more').addEventListener('input', function (e) { rec().more = e.target.value; save(); });
    $$('#j-did input').forEach(function (c) { c.addEventListener('change', function () { var r = rec(); r.did = r.did || {}; r.did[c.value] = c.checked; save(); drawHistory(); }); });
    dateIn.addEventListener('change', draw);
    function drawHistory() {
      var ks = Object.keys(S.journal).filter(function (k) { var r = S.journal[k]; return r.line || feelOf(r) || r.more; }).sort().reverse();
      $('#j-history').innerHTML = ks.slice(0, 30).map(function (k) { var r = S.journal[k], f = feelOf(r); return '<li><b>' + k + '</b> ' + (f ? '<span class="sdot ' + semCls('mood', f) + '"></span>' + semItem('mood', f).ico + ' ' : '') + esc(r.line || '') + '</li>'; }).join('') || '<li class="muted">' + esc(T('Your entries will appear here.', '你写下的会出现在这里。')) + '</li>';
      var c = $('#j-chart');   // weekly colour band over six weeks (stacked; colours = mood tokens, legend = emoji + name)
      if (c && window.Chart) {
        var now = new Date(); now.setHours(12, 0, 0, 0); var mon = new Date(+now - ((now.getDay() + 6) % 7) * DAY), weeks = [];
        for (var w = 5; w >= 0; w--) weeks.push(new Date(+mon - w * 7 * DAY));
        var order = moodOrder();
        if (c._ch) c._ch.destroy();
        c._ch = new Chart(c, { type: 'bar', data: { labels: weeks.map(function (d) { return (d.getMonth() + 1) + '/' + d.getDate(); }),
          datasets: order.map(function (k) { var it = semItem('mood', k); return { label: it.ico + ' ' + L(it.name), backgroundColor: cssv('--mood-' + k), borderColor: cssv('--surface'), borderWidth: 2, borderRadius: 4,
            data: weeks.map(function (d0) { var n = 0; for (var j = 0; j < 7; j++) { if (feelOf(S.journal[dkey(new Date(+d0 + j * DAY))]) === k) n++; } return n; }) }; }) },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
            scales: { x: { stacked: true, min: 0, max: 7, ticks: { stepSize: 1 }, title: { display: true, text: T('days in the week', '这一周的天数') } }, y: { stacked: true, grid: { display: false }, title: { display: true, text: T('week starting', '周起始') } } } } });
      }
    }
    $('#j-export').addEventListener('click', function () {
      var ks = Object.keys(S.journal).sort();
      download('learning-journal-' + today() + '.md', '# ' + T('Learning journal', '学习日志') + '\n\n' + ks.map(function (k) {
        var r = S.journal[k], f = feelOf(r), it = f ? semItem('mood', f) : null, did = Object.keys(r.did || {}).filter(function (x) { return r.did[x]; });
        return '## ' + k + (it ? ' ' + it.ico + ' ' + it.name[lang()] : '') + '\n\n' + (r.line ? '> ' + r.line + '\n\n' : '') + (did.length ? did.map(function (x) { return '- [x] ' + x; }).join('\n') + '\n\n' : '') + (r.more ? r.more + '\n\n' : '');
      }).join(''));
    });
    $('#j-print').addEventListener('click', function () { window.print(); });
    draw(); hooks.push(draw); styleHooks.push(drawHistory);
  }

  /* ---------- hub: today's 15 minutes + rings ---------- */
  function wireToday() {
    var box = $('#today15'); if (!box) return;
    function draw() {
      var dueN = Object.keys(S.cards).filter(function (k) { return due(S.cards[k]); }).length + Object.keys(S.wrong).filter(function (k) { return due(S.wrong[k]); }).length;
      var next = null;
      MAP.sections.forEach(function (s) { (s.pages || []).forEach(function (p, i) { if (!next && !S.done[p]) next = { p: p, t: s.titles ? s.titles[i] : null, s: s }; }); });
      var steps = [];
      steps.push(dueN ? { m: 5, t: T('Review ' + dueN + ' item' + (dueN > 1 ? 's' : '') + ' in your queue', '复习队列里的 ' + dueN + ' 项'), h: 'review.html' } : { m: 5, t: T('Warm up: flip 3 cards on any page you have read', '热身：在读过的任何一页翻 3 张卡'), h: 'careers/index.html' });
      if (next) steps.push({ m: 7, t: T('Read one page: ', '读一页：') + L(next.t || { en: next.p, zh: next.p }), h: next.p });
      else steps.push({ m: 7, t: T('Pick a note template and try it on today\'s class', '挑一个笔记模板，用在今天的课上'), h: 'learn/notes.html' });
      steps.push({ m: 3, t: T('Write one line in your learning journal', '在学习日志里写一句'), h: 'learn/journal.html' });
      box.innerHTML = '<ol class="checks" style="padding-left:0;list-style:none">' + steps.map(function (s) { return '<li class="card nextstep" style="display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:8px"><span class="tag">' + s.m + ' min</span><a href="' + ROOT + s.h + '">' + esc(s.t) + '</a></li>'; }).join('') + '</ol>' +
        '<p class="small muted">' + esc(T('That is enough for today. Fifteen calm minutes beat a stressed hour.', '今天这样就够了。平静的 15 分钟胜过紧张的一小时。')) + '</p>';
    }
    draw(); hooks.push(draw);
  }

  /* ---------- pomodoro ---------- */
  function wireTimer() {
    $$('[data-timer]').forEach(function (box) {
      var disp = $('.timer', box), left = 25 * 60, run = null, mode = 'focus';
      function show() { disp.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); }
      $('[data-go]', box).addEventListener('click', function () {
        if (run) { clearInterval(run); run = null; return; }
        run = setInterval(function () { left--; if (left <= 0) { mode = mode === 'focus' ? 'rest' : 'focus'; left = (mode === 'focus' ? 25 : 5) * 60; } show(); }, 1000);
      });
      $('[data-reset]', box).addEventListener('click', function () { clearInterval(run); run = null; mode = 'focus'; left = 25 * 60; show(); });
      show();
    });
  }


  /* ---------- copy buttons (ask-AI prompts) ---------- */
  function wireCopy() {
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var box = b.closest('.ask, section, .card'), ps = $$('.prompt', box).filter(function (p) { return p.offsetParent !== null; });
        var txt = ps.map(function (p) { return p.textContent; }).join('\n\n');
        function ok() { b.classList.add('ok'); var o = b.innerHTML; b.textContent = T('Copied ✓', '已复制 ✓'); setTimeout(function () { b.classList.remove('ok'); b.innerHTML = o; }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { fallback(txt); ok(); }); else { fallback(txt); ok(); }
      });
    });
    function fallback(txt) { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  }

  /* ---------- knowledge graph: levels -> nodes (weight bar) with prerequisite edges; tap to trace ---------- */
  function wireKG() {
    $$('.kg[data-kg]').forEach(function (box) {
      var d = json(box.dataset.kg); if (!d) { figErrors++; return; }
      var byId = {}; d.nodes.forEach(function (n) { byId[n.id] = n; });
      var maxW = Math.max.apply(null, d.nodes.map(function (n) { return n.weight || 0; }).concat([1]));
      var up = {}, down = {};
      d.edges.forEach(function (e) { (down[e[0]] = down[e[0]] || []).push(e[1]); (up[e[1]] = up[e[1]] || []).push(e[0]); });
      var sel = null;
      function draw() {
        box.innerHTML = '<div class="kg-hint">' + esc(L(d.hint || { en: 'Tap any item to trace its connections.', zh: '点任意一项，查看它的联系。' })) + '</div><div class="kg-cols" style="--cols:' + d.levels.length + '"><svg class="kg-lines" aria-hidden="true"></svg>' +
          d.levels.map(function (lv, i) {
            return '<div class="kg-col"><h4>' + esc(L(lv)) + '</h4>' + d.nodes.filter(function (n) { return n.level === i; }).map(function (n) {
              return '<button type="button" class="kn" data-id="' + esc(n.id) + '">' + esc(L(n.label)) + (n.weight ? '<span class="w" style="width:' + Math.round(100 * n.weight / maxW) + '%"></span>' : '') + '</button>';
            }).join('') + '</div>';
          }).join('') + '</div><div class="kg-panel" aria-live="polite">' + esc(T('Nothing selected yet.', '还没有选中。')) + '</div>';
        $$('.kn', box).forEach(function (b) { b.addEventListener('click', function () { pick(sel === b.dataset.id ? null : b.dataset.id); }); });
        lines(); if (sel) pick(sel);
      }
      function reach(id, map, acc) { (map[id] || []).forEach(function (x) { if (!acc[x]) { acc[x] = 1; reach(x, map, acc); } }); return acc; }
      function pick(id) {
        sel = id; box.classList.toggle('focus', !!id);
        var hl = {}; if (id) { hl[id] = 1; reach(id, up, hl); reach(id, down, hl); }
        $$('.kn', box).forEach(function (b) { b.classList.toggle('hl', !!hl[b.dataset.id]); b.classList.toggle('sel', b.dataset.id === id); });
        $$('svg.kg-lines path', box).forEach(function (p) { p.classList.toggle('hl', !!(hl[p.dataset.a] && hl[p.dataset.b]) && (p.dataset.a === id || p.dataset.b === id || (byId[id] && byId[id].level === 1))); });
        var panel = $('.kg-panel', box), n = byId[id];
        if (!n) { panel.textContent = T('Nothing selected yet.', '还没有选中。'); return; }
        var ups = (up[id] || []).map(function (x) { return L(byId[x].label); }), dn = (down[id] || []).map(function (x) { return L(byId[x].label); });
        panel.innerHTML = '<b>' + esc(L(n.label)) + '</b>' + (n.note ? ' — ' + esc(L(n.note)) : '') +
          (ups.length ? '<br><span class="small muted">' + esc(T('Comes from: ', '来自：')) + esc(ups.join(' · ')) + '</span>' : '') +
          (dn.length ? '<br><span class="small muted">' + esc(T('Leads to: ', '通向：')) + esc(dn.join(' · ')) + '</span>' : '') +
          (n.href ? '<br><a href="' + esc(n.href) + '">' + esc(T('Open this page →', '打开这一页 →')) + '</a>' : '');
      }
      function lines() {
        var svg = $('svg.kg-lines', box), cols = $('.kg-cols', box);
        if (!svg) return;
        var wide = cols.getBoundingClientRect().width >= 700 && getComputedStyle(cols).gridTemplateColumns.split(' ').length > 1;
        if (!wide) { svg.innerHTML = ''; return; }
        var R = cols.getBoundingClientRect(), out = '';
        d.edges.forEach(function (e) {
          var a = $('.kn[data-id="' + e[0] + '"]', box), b = $('.kn[data-id="' + e[1] + '"]', box); if (!a || !b) return;
          var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          var x1 = ra.right - R.left, y1 = ra.top + ra.height / 2 - R.top, x2 = rb.left - R.left, y2 = rb.top + rb.height / 2 - R.top, mx = (x1 + x2) / 2;
          out += '<path data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
        });
        svg.setAttribute('viewBox', '0 0 ' + R.width + ' ' + R.height); svg.innerHTML = out;
      }
      draw(); hooks.push(draw);
      var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { lines(); if (sel) pick(sel); }, 150); });
      box.dataset.kgDone = '1';
    });
  }

  /* ---------- audio v2: speed, +/-15 s, remembered position, download, transcript follow, groups ---------- */
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function wireAudio2() {
    $$('.ap2').forEach(function (ap) {
      var src = ap.dataset.src, id = ap.dataset.id || src, soon = $('.soon-tag', ap);
      if (!src) { ap.classList.add('soon'); if (soon) soon.hidden = false; return; }
      var au = new Audio(); au.preload = 'metadata'; au.src = src;
      var play = $('.play', ap), bar = $('.bar', ap), fill = $('.bar i', ap), tm = $('.tm', ap), sp = $('select', ap);
      S.audio = S.audio || {}; var pos = S.audio[id] || 0;
      au.addEventListener('loadedmetadata', function () { if (pos && pos < au.duration - 3) au.currentTime = pos; upd(); });
      function upd() { fill.style.width = (au.duration ? 100 * au.currentTime / au.duration : 0) + '%'; tm.textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration); follow(); }
      var lastSave = 0;
      au.addEventListener('timeupdate', function () { upd(); if (Date.now() - lastSave > 4000) { S.audio[id] = au.currentTime; save(); lastSave = Date.now(); } });
      au.addEventListener('ended', function () { S.audio[id] = 0; save(); play.textContent = '▶'; });
      play.addEventListener('click', function () { if (au.paused) { au.play(); play.textContent = '❚❚'; } else { au.pause(); play.textContent = '▶'; S.audio[id] = au.currentTime; save(); } });
      $('[data-skip="-15"]', ap).addEventListener('click', function () { au.currentTime = Math.max(0, au.currentTime - 15); });
      $('[data-skip="15"]', ap).addEventListener('click', function () { au.currentTime = Math.min(au.duration || 0, au.currentTime + 15); });
      sp.addEventListener('change', function () { au.playbackRate = +sp.value; });
      bar.addEventListener('click', function (e) { var r = bar.getBoundingClientRect(); if (au.duration) au.currentTime = au.duration * (e.clientX - r.left) / r.width; });
      var lines = $$('.tx p[data-t]', ap);
      lines.forEach(function (p) { p.addEventListener('click', function () { au.currentTime = +p.dataset.t; if (au.paused) play.click(); }); });
      function follow() { if (!lines.length) return; var cur = null; lines.forEach(function (p) { if (+p.dataset.t <= au.currentTime) cur = p; }); lines.forEach(function (p) { p.classList.toggle('now', p === cur); }); }
    });
  }

  /* ---------- exam centre: full mock, optional timer, weak-spot report by unit / skill ----------
     d.questions: fixed list.  Or d.pool: [{unit, qs:[q...], stim?: {en,zh} html}] + d.weights {unit: %} + d.lengths [n...] + d.perQ (minutes per question):
     the mock is drawn at start in proportion to the official unit weights (a stimulus set stays together). q.why (optional) is shown after hand-in. */
  function wireExam() {
    $$('.exam[data-exam]').forEach(function (box) {
      var d = json(box.dataset.exam); if (!d) return;
      var t0 = null, tick = null, limit = 0, QS = d.questions || [], links = d.links || {};
      function draw(pool, n) {
        var w = d.weights || {}, units = Object.keys(w), tot = units.reduce(function (a, u) { return a + w[u]; }, 0), out = [];
        units.forEach(function (u) {
          var want = Math.max(1, Math.round(n * w[u] / tot)), items = pool.filter(function (it) { return it.unit === u; }).slice();
          for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = items[i]; items[i] = items[j]; items[j] = x; }
          var got = 0; items.forEach(function (it) { if (got >= want) return; if (it.qs.length > 1 && got + it.qs.length > want + 1) return; it.qs.forEach(function (q, k) { out.push(Object.assign({ unit: u, stimHtml: k === 0 ? it.stim : null }, q)); }); got += it.qs.length; });
        });
        var have = {}; out.forEach(function (q) { have[q.id] = 1; });
        var rest = pool.filter(function (it) { return it.qs.length === 1 && !have[it.qs[0].id]; });
        while (out.length < n && rest.length) { var it = rest.splice(Math.floor(Math.random() * rest.length), 1)[0]; out.push(Object.assign({ unit: it.unit, stimHtml: null }, it.qs[0])); }
        return out;
      }
      function start(timed, n) {
        if (d.pool) { QS = draw(d.pool, n); limit = Math.round(QS.length * (d.perQ || 1.5) * 60); } else { limit = (d.minutes || 0) * 60; }
        box.innerHTML = '<div class="ex-bar"><b>' + esc(L(d.title)) + '</b><span class="ex-timer"></span><span class="small muted ex-count">' + QS.length + ' ' + esc(T('questions', '题')) + '</span><button class="btn sm solid" data-submit type="button">' + esc(T('Hand in', '交卷')) + '</button></div>' +
          QS.map(function (q, i) { return (q.stimHtml ? '<div class="ex-stim card soft">' + q.stimHtml + '</div>' : '') + '<div class="card ex-q" data-i="' + i + '"><div class="ex-meta">' + esc(L(d.units[q.unit])) + ' · ' + esc(L(d.skills[q.skill])) + '</div><p><b>' + (i + 1) + '.</b> ' + esc(L(q.q)) + '</p>' +
            q.opts.map(function (o, j) { return '<label><input type="radio" name="ex' + i + '" value="' + j + '"> <span>' + String.fromCharCode(65 + j) + '. ' + esc(L(o)) + '</span></label>'; }).join('') + '<div class="why ex-why" hidden></div></div>'; }).join('');
        t0 = Date.now(); clearInterval(tick);
        var tEl = $('.ex-timer', box);
        tick = setInterval(function () { var el = (Date.now() - t0) / 1000; tEl.textContent = timed && limit ? '⏱ ' + fmt(Math.max(0, limit - el)) : '⏱ ' + fmt(el); if (timed && limit && el >= limit) submit(); }, 500);
        $('[data-submit]', box).addEventListener('click', submit);
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function submit() {
        clearInterval(tick);
        var by = { unit: {}, skill: {} }, right = 0, mx = {};
        QS.forEach(function (q, i) {
          var c = $('input[name="ex' + i + '"]:checked', box), v = c ? +c.value : -1, ok = v === q.a, qe = $('.ex-q[data-i="' + i + '"]', box);
          if (ok) right++;
          [['unit', q.unit], ['skill', q.skill]].forEach(function (k) { var o = by[k[0]][k[1]] = by[k[0]][k[1]] || { n: 0, ok: 0 }; o.n++; if (ok) o.ok++; });
          $$('label', qe).forEach(function (l, j) { l.classList.toggle('right', j === q.a); l.classList.toggle('wrong', j === v && !ok); $('input', l).disabled = true; });
          var wy = $('.ex-why', qe); if (wy && q.why) { wy.hidden = false; wy.style.display = 'block'; wy.textContent = (ok ? '✅ ' : '💡 ') + L(q.why); }
          if (q.topic) { S.apx = S.apx || {}; S.apx[q.id || i] = { ok: ok, topic: q.topic, at: Date.now() }; }
          var cell = (mx[q.unit] = mx[q.unit] || {})[q.skill] = (mx[q.unit] || {})[q.skill] || { n: 0, ok: 0 }; cell.n++; if (ok) cell.ok++;
          if (!ok) { var wid = (q.id || ((d.id || 'exam') + '#' + i)); S.wrong[wid] = schedule({ q: q.q, right: q.opts[q.a], picked: v >= 0 ? q.opts[v] : { en: '(blank)', zh: '（未答）' }, why: q.why || '', topic: q.topic, skill: q.skill, variant: q.variant, page: PAGE, href: (links[q.unit] || PAGE).replace(/^/, PAGE.replace(/[^/]*$/, '')), title: L(d.title), at: Date.now() }, false); }
        });
        save();
        function rows(kind, names) { return Object.keys(by[kind]).sort().map(function (k) { var o = by[kind][k], pct = Math.round(100 * o.ok / o.n), lk = kind === 'unit' && links[k] ? ' <a class="small" href="' + esc(links[k]) + '">' + esc(T('practise →', '去练习 →')) + '</a>' : ''; return '<tr><td>' + esc(L(names[k])) + lk + '</td><td>' + o.ok + ' / ' + o.n + '</td><td><div class="bar" style="height:8px;background:var(--surface-2);border-radius:4px"><i style="display:block;height:8px;border-radius:4px;background:' + (pct < 60 ? 'var(--warn)' : 'var(--ok)') + ';width:' + pct + '%"></i></div></td></tr>'; }).join(''); }
        var rep = document.createElement('div'); rep.className = 'card'; rep.innerHTML = '<h3 style="margin-top:0">' + esc(T('Your weak-spot report', '薄弱点报告')) + ' — ' + right + ' / ' + QS.length + '</h3>' +
          '<div class="tbl"><table><thead><tr><th>' + esc(T('Unit', '单元')) + '</th><th></th><th></th></tr></thead><tbody>' + rows('unit', d.units) + '</tbody></table></div><br>' +
          '<div class="tbl"><table><thead><tr><th>' + esc(T('Skill', '技能')) + '</th><th></th><th></th></tr></thead><tbody>' + rows('skill', d.skills) + '</tbody></table></div>' +
          '<p class="small">' + esc(T('Missed questions are now in your review queue, each with its explanation. Start with the shortest bar — one unit at a time.', '答错的题已带着解析进复习队列。从最短的那一条开始——一次一个单元。')) + '</p><button class="btn sm" type="button" data-again>' + esc(T('Try again', '再做一次')) + '</button>';
        if (d.matrix) {   // unit x skill matrix + next week's review list (weak cells -> variants spread over 7 days)
          var sks = Object.keys(d.skills), us = Object.keys(mx).sort(), weakQ = [];
          var tb = '<div class="tbl"><table class="mx"><thead><tr><th></th>' + sks.map(function (k) { return '<th title="' + esc(L(d.skills[k])) + '">' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + us.map(function (u) {
            return '<tr><th>' + esc(L(d.units[u]).split(' ').slice(0, 2).join(' ')) + '</th>' + sks.map(function (k) { var c = mx[u][k]; if (!c) return '<td class="mx-n">·</td>'; var r = c.ok / c.n; if (r < 0.6) weakQ.push([u, k]); return '<td class="' + (r < 0.6 ? 'mx-w' : (r < 1 ? 'mx-m' : 'mx-g')) + '">' + c.ok + '/' + c.n + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div><p class="small muted">' + esc(T('Columns are the six Science Practices: ', '列是六项科学实践：')) + sks.map(function (k) { return esc(L(d.skills[k])); }).join(' · ') + '</p>';
          var used = {}; QS.forEach(function (q) { used[q.id] = 1; });
          var list = [], dayN = 0;
          weakQ.forEach(function (c) { (d.pool || []).forEach(function (it) { if (it.unit !== c[0]) return; it.qs.forEach(function (q) { if (list.length >= 10 || used[q.id] || q.skill !== c[1] || !q.variant || S.wrong[q.id]) return; used[q.id] = 1; list.push(Object.assign({ unit: it.unit }, q)); }); }); });
          list.forEach(function (q) { dayN = dayN % 7 + 1; var rec = schedule({ q: q.q, right: q.opts[q.a], picked: { en: '(planned review)', zh: '（计划复习）' }, why: q.why, topic: q.topic, skill: q.skill, variant: q.variant, page: PAGE, title: T('Next week from my mock', '模拟考生成的下周复习'), at: Date.now() }, false); rec.due = today0() + dayN * DAY; S.wrong[q.id] = rec; });
          save();
          rep.innerHTML += '<h3>' + esc(T('Unit × skill matrix', '单元 × 技能矩阵')) + '</h3>' + tb + '<h3>' + esc(T('Next week’s review list', '下周复习清单')) + '</h3>' + (list.length ? '<p class="small">' + esc(T(list.length + ' variant questions from your weakest cells are now spread over the next 7 days in your review queue (about ' + Math.ceil(list.length / 7) + ' a day).', '你最弱格子里的 ' + list.length + ' 道变式题已排进未来 7 天的复习队列（每天约 ' + Math.ceil(list.length / 7) + ' 道）。')) + '</p><ol class="small">' + list.map(function (q) { return '<li>' + esc(L(d.units[q.unit] || d.units[Object.keys(d.units)[0]]).split(' ').slice(0, 2).join(' ')) + ' · ' + esc(q.topic || '') + ' · ' + esc(L(d.skills[q.skill])) + '</li>'; }).join('') + '</ol>' : '<p class="small">' + esc(T('No weak cells this time — your queue only has the questions you missed.', '这次没有薄弱格子——复习队列里只有你答错的题。')) + '</p>');
          document.dispatchEvent(new Event('ap-mock-done'));
        }
        box.insertBefore(rep, box.firstChild.nextSibling); $('[data-submit]', box).disabled = true;
        $('[data-again]', rep).addEventListener('click', intro);
        rep.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function intro() {
        clearInterval(tick);
        var btns;
        if (d.pool) {
          btns = (d.lengths || [15]).map(function (n) { return '<button class="btn' + (n === (d.lengths || [15])[0] ? ' solid' : '') + '" type="button" data-n="' + n + '">' + esc(T(n + ' questions', n + ' 题')) + ' <small>· ~' + Math.round(n * (d.perQ || 1.5)) + ' min</small></button>'; }).join('') +
            '<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-timed> ' + esc(T('Use a timer (exam pace: ' + (d.perQ || 1.5) + ' min per question)', '计时（考试节奏：每题 ' + (d.perQ || 1.5) + ' 分钟）')) + '</label>';
        } else {
          btns = '<button class="btn solid" type="button" data-untimed>' + esc(T('Start (no timer)', '开始（不计时）')) + '</button>' +
            (d.minutes ? '<button class="btn" type="button" data-timedb>' + esc(T('Start with a ' + d.minutes + '-minute timer', '开始（' + d.minutes + ' 分钟计时）')) + '</button>' : '');
        }
        box.innerHTML = '<div class="card"><h3 style="margin-top:0">' + esc(L(d.title)) + '</h3><p>' + esc(L(d.intro)) + '</p><div class="row">' + btns + '</div></div>';
        $$('[data-n]', box).forEach(function (b) { b.addEventListener('click', function () { start(!!($('[data-timed]', box) || {}).checked, +b.dataset.n); }); });
        var u = $('[data-untimed]', box); if (u) u.addEventListener('click', function () { start(false); });
        var tb = $('[data-timedb]', box); if (tb) tb.addEventListener('click', function () { start(true); });
      }
      intro(); hooks.push(function () { if (!$('.ex-q', box)) intro(); });
    });
  }


  /* ---------- planner: goal splitter, 3-tier week menu, base day, balance, load-down (no scores, no streaks) ---------- */
  function wirePlanner() {
    var gOut = $('#g-out'); if (!gOut) return;
    var TPL = json('plan-templates') || {}, DAYS = json('plan-days') || [];
    S.plan = S.plan || {}; var P = S.plan;
    P.goal = P.goal || {}; P.blocks = P.blocks || []; P.minimal = P.minimal || {}; P.base = P.base || {}; P.dates = P.dates || [];
    function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function addDays(d, n) { return new Date(+d + n * DAY); }
    function monday(d) { d = new Date(d); d.setHours(0, 0, 0, 0); var w = (d.getDay() + 6) % 7; return addDays(d, -w); }
    function fmtD(s) { var d = new Date(s + 'T00:00'); return d.toLocaleDateString(lang() === 'zh' ? 'zh-CN' : 'en-CA', { month: 'short', day: 'numeric' }); }
    // ---- goal splitter
    var gt = $('#g-title'), gd = $('#g-date'), gc = $('#g-course'), go = $('#g-own');
    gt.value = P.goal.title || ''; gd.value = P.goal.date || ''; gc.value = P.goal.course || ''; go.value = P.goal.own || '';
    gc.addEventListener('change', function () { var t = TPL[gc.value]; if (t && t.date && !gd.value) gd.value = t.date; if (t && !gt.value) gt.value = t.name + T(' exam', ' 考试'); });
    function units() {
      var t = TPL[gc.value]; if (t) return t.units.map(function (u) { return { name: u.name, w: u.w || 1 }; });
      var own = go.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      return (own.length ? own : ['Part 1', 'Part 2', 'Part 3']).map(function (n) { return { name: n, w: 1 }; });
    }
    function suggest() {
      var end = gd.value ? new Date(gd.value + 'T00:00') : addDays(new Date(), 120), start = monday(new Date());
      var weeks = Math.max(2, Math.round((end - start) / (7 * DAY))), us = units(), tw = us.reduce(function (a, u) { return a + u.w; }, 0);
      var light = 1, mixed = Math.max(1, Math.round(weeks * 0.2)), learn = Math.max(1, weeks - light - mixed);
      var rows = [], wk = 0, acc = 0;
      us.forEach(function (u, i) { acc += u.w; var upto = Math.round(learn * acc / tw); var n = Math.max(1, upto - wk); if (i === us.length - 1) n = Math.max(1, learn - wk); rows.push({ kind: 'learn', text: u.name, weeks: n }); wk += n; });
      rows.push({ kind: 'mixed', text: T('Mixed review + practice questions from every unit', '混合复习＋每个单元都练题'), weeks: mixed });
      rows.push({ kind: 'light', text: T('Light week: short reviews, sleep, rest', '轻量周：短复习、睡好、休息'), weeks: light });
      var d = start; rows.forEach(function (r) { r.start = iso(d); d = addDays(d, 7 * r.weeks); r.end = iso(addDays(d, -1)); });
      P.goal = { title: gt.value, date: gd.value, course: gc.value, own: go.value, rows: rows }; save(); drawGoal();
    }
    function drawGoal() {
      var rows = P.goal.rows || []; if (!rows.length) { gOut.innerHTML = ''; return; }
      var months = {};
      rows.forEach(function (r, i) { var m = r.start.slice(0, 7); (months[m] = months[m] || []).push(i); });
      gOut.innerHTML = '<h3>' + esc(P.goal.title || T('My goal', '我的目标')) + (P.goal.date ? ' · ' + esc(fmtD(P.goal.date)) : '') + '</h3>' +
        '<div class="tbl"><table><thead><tr><th>' + esc(T('Stretch', '阶段')) + '</th><th>' + esc(T('Weeks', '周数')) + '</th><th>' + esc(T('From – to', '起止')) + '</th><th>' + esc(T('Focus (you can edit)', '重点（可改）')) + '</th></tr></thead><tbody>' +
        rows.map(function (r, i) { var ico = r.kind === 'learn' ? '🥾' : (r.kind === 'mixed' ? '⛰️' : '🏁'); return '<tr><td>' + ico + ' ' + (i + 1) + '</td><td><input type="number" min="1" max="30" value="' + r.weeks + '" data-gw="' + i + '" style="width:70px"></td><td class="small">' + esc(fmtD(r.start)) + ' – ' + esc(fmtD(r.end)) + '</td><td><input type="text" value="' + esc(r.text) + '" data-gt="' + i + '"></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="small muted">' + esc(T('Learning time is split by the official unit weights; the last fifth is mixed review, the final week is light. Change any number or line.', '学习时间按官方单元权重分配；最后约五分之一是混合复习，最后一周是轻量周。任何数字和文字都能改。')) + '</p>' +
        '<h4>' + esc(T('By month', '按月看')) + '</h4><ul class="small">' + Object.keys(months).map(function (m) { return '<li><b>' + esc(new Date(m + '-01T00:00').toLocaleDateString(lang() === 'zh' ? 'zh-CN' : 'en-CA', { year: 'numeric', month: 'long' })) + '</b>: ' + months[m].map(function (i) { return esc(rows[i].text); }).join(' · ') + '</li>'; }).join('') + '</ul>' +
        '<p class="small">👉 ' + esc(T('This week: ', '本周：')) + '<b>' + esc(current()) + '</b> — ' + esc(T('add blocks for it in the menu below.', '在下面的菜单里为它加几块。')) + '</p>';
      $$('[data-gw]', gOut).forEach(function (el) { el.addEventListener('change', function () { var r = P.goal.rows; r[+el.dataset.gw].weeks = Math.max(1, +el.value || 1); var d = new Date(r[0].start + 'T00:00'); r.forEach(function (x) { x.start = iso(d); d = addDays(d, 7 * x.weeks); x.end = iso(addDays(d, -1)); }); save(); drawGoal(); }); });
      $$('[data-gt]', gOut).forEach(function (el) { el.addEventListener('input', function () { P.goal.rows[+el.dataset.gt].text = el.value; save(); }); });
    }
    function current() { var t = iso(new Date()), r = (P.goal.rows || []).filter(function (x) { return x.start <= t && t <= x.end; })[0]; return r ? r.text : T('(not started yet)', '（还没开始）'); }
    $('#g-make').addEventListener('click', suggest);
    [gt, gd, gc, go].forEach(function (el) { el.addEventListener('change', function () { P.goal.title = gt.value; P.goal.date = gd.value; P.goal.course = gc.value; P.goal.own = go.value; save(); }); });
    drawGoal();
    // ---- key dates and load-down
    function drawDates() {
      $('#d-list').innerHTML = P.dates.map(function (d, i) { return '<li>' + esc(d.label) + ' · ' + esc(fmtD(d.date)) + ' <button class="btn sm" type="button" data-dd="' + i + '">' + esc(T('Remove', '移除')) + '</button></li>'; }).join('');
      $$('[data-dd]').forEach(function (b) { b.addEventListener('click', function () { P.dates.splice(+b.dataset.dd, 1); save(); drawDates(); drawWeek(); }); });
    }
    $('#d-add').addEventListener('click', function () { var l = $('#d-label').value.trim(), d = $('#d-date').value; if (!d) return; P.dates.push({ label: l || T('Key date', '关键日期'), date: d }); P.dates.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); save(); drawDates(); drawWeek(); });
    function caps() {
      var now = new Date(); now.setHours(0, 0, 0, 0);
      var near = P.dates.filter(function (d) { var t = new Date(d.date + 'T00:00'); return t >= now && (t - now) <= 14 * DAY; })[0];
      return near ? { must: 4, should: 3, want: 1, near: near } : { must: 6, should: 6, want: 3 };
    }
    // ---- base day
    $$('[data-base]').forEach(function (el) {
      if (P.base[el.dataset.base] != null) el.value = P.base[el.dataset.base];
      el.addEventListener('input', function () { P.base[el.dataset.base] = el.value; save(); drawWeek(); });
    });
    function base(k) { var el = $('[data-base="' + k + '"]'); return P.base[k] != null ? P.base[k] : (el ? el.value : ''); }
    function sleepHours() { var b = base('bed').split(':'), w = base('wake').split(':'); if (b.length < 2 || w.length < 2) return 8; var h = (+w[0] + w[1] / 60) - (+b[0] + b[1] / 60); if (h <= 0) h += 24; return Math.round(h * 10) / 10; }
    // ---- week menu
    var picked = null;
    function blockEl(b) {
      return '<div class="blk tier-' + b.tier + '" draggable="true" data-id="' + b.id + '" tabindex="0"><span>' + esc(b.text) + '</span><button type="button" class="x no-print" data-del="' + b.id + '" aria-label="remove">×</button></div>';
    }
    function drawWeek() {
      var cp = caps(), lw = $('#w-load');
      if (cp.near) { lw.hidden = false; lw.innerHTML = '<span style="font-size:1.4rem">🌿</span><p>' + esc(T('“' + cp.near.label + '” is within two weeks, so the suggested load is lighter: must ≤ 4, should ≤ 3, want ≤ 1. You can still change anything.', '「' + cp.near.label + '」在两周之内，建议量自动减轻：必做 ≤4、该做 ≤3、想做 ≤1。依然都可以改。')) + '</p>'; } else lw.hidden = true;
      ['must', 'should', 'want'].forEach(function (tier) {
        var pool = $('[data-drop="pool-' + tier + '"]'), list = P.blocks.filter(function (b) { return b.tier === tier; });
        pool.innerHTML = list.filter(function (b) { return !b.day; }).map(blockEl).join('') || '<span class="small muted">' + esc(T('All placed, or none yet.', '都排好了，或还没有。')) + '</span>';
        var h = $('.tier[data-tier="' + tier + '"] h4 small'); if (h) h.textContent = '· ' + list.length + ' / ' + cp[tier] + T(' suggested', ' 建议') + ' · 45 min';
      });
      var sh = sleepHours();
      DAYS.forEach(function (d) {
        var col = $('[data-drop="' + d.k + '"]'), mini = !!P.minimal[d.k];
        $('.day[data-day="' + d.k + '"]').classList.toggle('minimal', mini);
        $('[data-minimal="' + d.k + '"]').checked = mini;
        $('[data-base-for="' + d.k + '"]').innerHTML = '<span>🛏 ' + esc(base('bed')) + '–' + esc(base('wake')) + '</span><span>🍽 ×3</span><span>🌳 ' + esc(base('out')) + '′</span><span>⏹ ' + esc(base('stop')) + '</span>';
        col.innerHTML = P.blocks.filter(function (b) { return b.day === d.k; }).sort(function (a, b) { return ['must', 'should', 'want'].indexOf(a.tier) - ['must', 'should', 'want'].indexOf(b.tier); }).map(blockEl).join('');
      });
      wireBlocks(); drawBalance(sh);
    }
    function wireBlocks() {
      $$('.blk').forEach(function (el) {
        el.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', el.dataset.id); });
        el.addEventListener('click', function (e) { if (e.target.dataset.del) return; picked = picked === el.dataset.id ? null : el.dataset.id; $$('.blk').forEach(function (x) { x.classList.toggle('picked', x.dataset.id === picked); }); });
      });
      $$('[data-del]').forEach(function (b) { b.addEventListener('click', function () { P.blocks = P.blocks.filter(function (x) { return x.id !== b.dataset.del; }); save(); drawWeek(); }); });
    }
    function place(id, day) { var b = P.blocks.filter(function (x) { return x.id === id; })[0]; if (!b) return; b.day = day; picked = null; save(); drawWeek(); }
    $$('[data-drop]').forEach(function (z) {
      var day = z.dataset.drop.indexOf('pool-') === 0 ? null : z.dataset.drop;
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('over'); });
      z.addEventListener('dragleave', function () { z.classList.remove('over'); });
      z.addEventListener('drop', function (e) { e.preventDefault(); z.classList.remove('over'); place(e.dataTransfer.getData('text/plain'), day); });
    });
    $$('.day').forEach(function (d) { d.addEventListener('click', function (e) { if (picked && !e.target.closest('.blk') && !e.target.closest('input')) place(picked, d.dataset.day); }); });
    $$('.tier').forEach(function (d) { d.addEventListener('click', function (e) { if (picked && !e.target.closest('.blk') && !e.target.closest('input') && !e.target.closest('button')) place(picked, null); }); });
    $$('[data-add]').forEach(function (b) {
      function add() { var inp = $('.addblk[data-tier="' + b.dataset.add + '"]'), v = inp.value.trim(); if (!v) return; P.blocks.push({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tier: b.dataset.add, text: v, day: null }); inp.value = ''; save(); drawWeek(); }
      b.addEventListener('click', add); $('.addblk[data-tier="' + b.dataset.add + '"]').addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    });
    $$('[data-minimal]').forEach(function (c) { c.addEventListener('change', function () { P.minimal[c.dataset.minimal] = c.checked; save(); drawWeek(); }); });
    $('#w-clear').addEventListener('click', function () { P.blocks.forEach(function (b) { b.day = null; }); P.minimal = {}; save(); drawWeek(); });
    // ---- balance doughnut (waking hours only; sleep shown as text)
    var bal = null;
    function drawBalance(sh) {
      var cv = $('#bal-chart'); if (!cv || !window.Chart) return;
      var study = P.blocks.filter(function (b) { return b.day; }).reduce(function (a, b) { return a + (P.minimal[b.day] && b.tier !== 'must' ? 0 : 0.75); }, 0);
      var body = 7 * (+base('out') || 0) / 60, life = 7 * (+base('life') || 0) / 60, people = 7 * (+base('people') || 0) / 60;
      var data = [study, body, life, people].map(function (x) { return Math.round(x * 10) / 10; });
      if (bal) bal.destroy();
      bal = new Chart(cv, { type: 'doughnut', data: { labels: [T('Study', '学习'), T('Body (outdoors, exercise)', '身体（户外、运动）'), T('Life (meals, breaks)', '生活（吃饭、休息）'), T('People', '人际')],
        datasets: [{ data: data, backgroundColor: [cssv('--a'), cssv('--ok'), cssv('--warn'), cssv('--a-2')], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (x) { return x.label + ': ' + x.parsed + ' h'; } } } } } });
      $('#bal-note').textContent = T('Hours this week (planned). Sleep: about ' + sh + ' h a night, not shown in the ring. ', '本周计划的小时数。睡眠：每晚约 ' + sh + ' 小时，没画进环里。') + (data[0] > data[1] + data[2] + data[3] ? T('Study is bigger than the other three together — maybe move one block to next week?', '学习比其余三类加起来还多——要不要挪一块到下周？') : T('All four have room. 🌿', '四类都有位置。🌿'));
    }
    hooks.push(function () { drawGoal(); drawWeek(); drawDates(); });
    drawDates(); drawWeek();
    // ---- export / print
    $('#p-export').addEventListener('click', function () {
      var md = '# ' + T('My plan', '我的规划') + ' (' + today() + ')\n\n';
      if (P.goal.rows) md += '## ' + (P.goal.title || T('Goal', '目标')) + (P.goal.date ? ' — ' + P.goal.date : '') + '\n\n' + P.goal.rows.map(function (r, i) { return (i + 1) + '. ' + r.start + ' → ' + r.end + ' (' + r.weeks + ' wk): ' + r.text; }).join('\n') + '\n\n';
      if (P.dates.length) md += '## ' + T('Key dates', '关键日期') + '\n\n' + P.dates.map(function (d) { return '- ' + d.date + ' ' + d.label; }).join('\n') + '\n\n';
      md += '## ' + T('Base day', '基础一天') + '\n\n- ' + T('Sleep', '睡眠') + ': ' + base('bed') + '–' + base('wake') + '\n- ' + T('Stop studying at', '停止学习') + ': ' + base('stop') + '\n- ' + T('Outdoors', '户外') + ': ' + base('out') + ' min\n\n';
      md += '## ' + T('This week', '本周') + '\n\n' + DAYS.map(function (d) { var bs = P.blocks.filter(function (b) { return b.day === d.k; }); return '### ' + L(d.l) + (P.minimal[d.k] ? ' (' + T('minimal day', '最小版') + ')' : '') + '\n' + (bs.map(function (b) { return '- [' + b.tier + '] ' + b.text; }).join('\n') || '-'); }).join('\n\n') + '\n';
      download('my-plan-' + today() + '.md', md);
    });
    $('#p-print').addEventListener('click', function () { window.print(); });
  }

  /* ---------- filter chips (careers grid) ---------- */
  function wireFilter() {
    $$('.filter[data-filter]').forEach(function (f) {
      var grid = document.getElementById(f.dataset.filter), sel = { like: null, span: null };
      function apply() {
        var n = 0;
        $$('.card[data-like]', grid).forEach(function (c) { var ok = (!sel.like || c.dataset.like.split(' ').indexOf(sel.like) >= 0) && (!sel.span || c.dataset.span === sel.span); c.classList.toggle('hide', !ok); if (ok) n++; });
        $$('button', f).forEach(function (b) { b.setAttribute('aria-pressed', String(sel[b.dataset.f] === b.dataset.v)); });
        $('.fcount', f).textContent = (sel.like || sel.span) ? T(n + ' of 14 match. Tap again to clear.', '14 个里有 ' + n + ' 个符合。再点一次可取消。') : T('Tap to narrow the list — nothing is decided, it just helps you look.', '点一下缩小范围——不是做决定，只是帮你看。');
      }
      $$('button', f).forEach(function (b) { b.addEventListener('click', function () { sel[b.dataset.f] = sel[b.dataset.f] === b.dataset.v ? null : b.dataset.v; apply(); }); });
      apply(); hooks.push(apply);
    });
  }

  /* ---------- reveal on scroll ---------- */
  function wireReveal() {
    var els = $$('.reveal'); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- boot ---------- */
  window.addEventListener('beforeprint', function () { $$('.reveal').forEach(function (e) { e.classList.add('in'); }); });
  wireReveal(); wireCards(); wireQuizzes(); wireReview(); wireAudio(); wireNotes(); wireJournal(); wireMoodViews(); wireOptLang(); wireToday(); wireTimer(); wireCopy(); wireKG(); wireFilter(); wirePlanner(); wireAudio2(); wireExam(); paintRings(); renderMath();
  renderCharts(); renderMols(); renderMermaid();
  hooks.push(paintRings);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { paintToggles(); restyle(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(ROOT + 'sw.js').catch(function () {});
  // small API for page add-ons (kit/ap.js, kit/sims.js): same store, same language, same review queue
  window.BTP = { state: function () { return S; }, save: save, T: T, L: L, esc: esc, json: json, schedule: schedule, due: due, whenText: whenText, cssv: cssv, dark: dark, today: today, fmt: fmt,
    onLang: function (f) { hooks.push(f); }, onStyle: function (f) { styleHooks.push(f); }, root: ROOT, page: PAGE };
})();

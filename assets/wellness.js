/* VeryVisa Wellness — small site add-ons on top of the vendored kit.js (same store, same language hooks via window.BTP). */
(function () {
  'use strict';
  var B = window.BTP; if (!B) return;
  function countdowns() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-countdown]'), function (el) {
      var d = new Date(el.dataset.countdown + 'T23:59:00'), n = Math.ceil((d - Date.now()) / 864e5), out = el.querySelector('.cd-n');
      if (out) out.textContent = n >= 0 ? String(n) : '0';
      el.classList.toggle('past', n < 0);
    });
  }
  countdowns(); B.onLang(countdowns);
})();
/* Figure zoom: open a plate (with its language label layer) or a diagram in an on-page dialog, never a bare image tab.
   ＋/－ zoom, drag-scroll inside; Esc / back button / ✕ closes. */
(function () {
  'use strict';
  var dlg, area, scale = 1, base = 0;
  function apply() { var el = area.firstElementChild; if (el) el.style.width = Math.round(base * scale) + 'px'; }
  function make() {
    dlg = document.createElement('dialog'); dlg.className = 'zoom2';
    dlg.innerHTML = '<div class="zbar"><button type="button" class="btn sm" data-z="out" aria-label="zoom out">－</button><button type="button" class="btn sm" data-z="in" aria-label="zoom in">＋</button><button type="button" class="btn sm" data-z="x" aria-label="close">✕</button></div><div class="zarea"></div>';
    area = dlg.querySelector('.zarea');
    dlg.addEventListener('click', function (e) {
      var z = e.target.closest && e.target.closest('[data-z]');
      if (z) { if (z.dataset.z === 'x') dlg.close(); else { scale = Math.max(0.5, Math.min(5, scale * (z.dataset.z === 'in' ? 1.4 : 1 / 1.4))); apply(); } return; }
      if (e.target === dlg) dlg.close();
    });
    window.addEventListener('popstate', function () { if (dlg.open) dlg.close(); });
    document.body.appendChild(dlg);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.plate-open'); if (!b) return;
    if (!dlg) make();
    var src = b.querySelector('.lp') || b.querySelector('svg') || b.querySelector('img'), node;
    if (!src) return;
    node = src.cloneNode(true); node.removeAttribute('loading');
    area.innerHTML = ''; area.appendChild(node);
    var img = node.tagName === 'IMG' ? node : node.querySelector && node.querySelector('img');
    scale = 1; base = Math.min(window.innerWidth * 0.96, Math.max(700, (img && img.naturalWidth ? img.naturalWidth * 2 : 900)));
    if (img && img.naturalWidth && img.naturalHeight) base = Math.min(base, (window.innerHeight * 0.9 - 48) * img.naturalWidth / img.naturalHeight * 1.0) || base;
    if (node.tagName !== 'svg' && img) base = Math.max(base, Math.min(window.innerWidth * 0.96, 640));
    apply(); dlg.showModal(); try { history.pushState({ zoom: 1 }, ''); } catch (x) {}
  });
})();

/* 繁體 mode (user order 2026-11-21: 简 / 繁 / EN+中 / EN). Kept as html[data-lang=zh] for the kit, plus html[data-script=hant]; every
   Chinese text node outside English spans and outside the classical originals (already Traditional) is converted in the browser with
   OpenCC (assets/opencc-cn2t.js, loaded only on demand). Leaving 繁體 reloads the page so the Simplified source text comes back. */
(function () {
  'use strict';
  var root = document.documentElement, done = false;
  var base = (root.dataset.root || '') + 'assets/opencc-cn2t.js';
  function skip(el) { for (; el && el !== document.body; el = el.parentElement) { if (el.classList && (el.classList.contains('l-en') || el.classList.contains('orig'))) return true; if (/^(SCRIPT|STYLE|CODE|PRE)$/.test(el.tagName)) return true; if (el.getAttribute && el.getAttribute('lang') === 'en') return true; } return false; }
  function convert() {
    if (done) return; done = true;
    var go = function () {
      var cv = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, list = [];
      while ((n = w.nextNode())) { if (/[㐀-鿿]/.test(n.nodeValue) && !skip(n.parentElement)) list.push(n); }
      list.forEach(function (t) { t.nodeValue = cv(t.nodeValue); });
      document.title = cv(document.title);
    };
    if (window.OpenCC) return go();
    var s = document.createElement('script'); s.src = base; s.onload = go; document.head.appendChild(s);
  }
  function pressed() {
    var h = root.dataset.script === 'hant' && root.dataset.lang === 'zh';
    document.querySelectorAll('[data-set-script]').forEach(function (b) { b.setAttribute('aria-pressed', String(h)); });
    document.querySelectorAll('[data-script-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(!h && root.dataset.lang === 'zh')); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-set-script],[data-set-lang]'); if (!t) return;
    if (t.hasAttribute('data-set-script')) {
      var zh = document.querySelector('[data-set-lang="zh"]'); if (zh && root.dataset.lang !== 'zh') zh.click();
      root.dataset.script = 'hant'; root.lang = 'zh-Hant'; try { localStorage.setItem('wellness:script', 'hant'); } catch (x) {}
      convert(); setTimeout(pressed, 0); return;
    }
    var was = root.dataset.script === 'hant';
    try { localStorage.setItem('wellness:script', 'hans'); } catch (x) {}
    delete root.dataset.script;
    if (was && done) { setTimeout(function () { location.reload(); }, 30); }
    setTimeout(pressed, 0);
  }, true);
  if (root.dataset.script === 'hant' && root.dataset.lang === 'zh') convert();
  pressed();
})();

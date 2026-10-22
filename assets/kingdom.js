/* ==========================================================
   Mimosa's Study Kingdom — shared behaviour
   - remembers ticked checkboxes (per page, in this browser)
   - "Mark unit complete" button + confetti
   - reading progress bar, countdown, quiz buttons
   - opens every flashcard when printing / ?print
   Everything degrades gracefully if storage is blocked.
   ========================================================== */
(function () {
  var PREFIX = 'mimosa:';
  function get(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} }

  var page = (location.pathname.split('/').slice(-2).join('/') || 'page').replace(/\.html?$/, '');

  /* ---------- checkboxes ---------- */
  function initChecks() {
    var boxes = document.querySelectorAll('input[type=checkbox]');
    boxes.forEach(function (b, i) {
      var key = 'chk:' + (b.dataset.key || (page + '#' + i));
      if (get(key) === '1') b.checked = true;
      b.addEventListener('change', function () {
        b.checked ? set(key, '1') : del(key);
        updateMeters();
        if (b.checked && b.dataset.celebrate !== undefined) confetti(70);
      });
    });
    updateMeters();
  }
  function updateMeters() {
    document.querySelectorAll('[data-meter]').forEach(function (m) {
      var scope = document.querySelector(m.dataset.meter) || document;
      var all = scope.querySelectorAll('input[type=checkbox]');
      var done = scope.querySelectorAll('input[type=checkbox]:checked');
      var pct = all.length ? Math.round(done.length * 100 / all.length) : 0;
      var bar = m.querySelector('i'); if (bar) bar.style.width = pct + '%';
      var label = document.querySelector('[data-meter-label="' + m.dataset.meter + '"]');
      if (label) label.textContent = done.length + ' / ' + all.length + ' (' + pct + '%)';
    });
  }

  /* ---------- unit complete button ---------- */
  function initDone() {
    document.querySelectorAll('.done-btn[data-unit]').forEach(function (btn) {
      var key = 'done:' + btn.dataset.unit;
      var original = btn.textContent;
      function paint() {
        var d = get(key);
        if (d) { btn.classList.add('is-done'); btn.textContent = '✅ Completed on ' + d + ' — tap to undo'; }
        else { btn.classList.remove('is-done'); btn.textContent = original; }
      }
      btn.addEventListener('click', function () {
        if (get(key)) { del(key); }
        else { set(key, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })); confetti(160); }
        paint();
      });
      paint();
    });
    /* home page: show which units are done */
    document.querySelectorAll('[data-unit-status]').forEach(function (el) {
      var d = get('done:' + el.dataset.unitStatus);
      if (d) { el.classList.add('is-done'); el.setAttribute('data-done', d); }
    });
    document.querySelectorAll('[data-subject-meter]').forEach(function (m) {
      var units = m.dataset.subjectMeter.split(',');
      var n = units.filter(function (u) { return get('done:' + u); }).length;
      var bar = m.querySelector('i'); if (bar) bar.style.width = Math.round(n * 100 / units.length) + '%';
      var lab = m.nextElementSibling; if (lab && lab.hasAttribute('data-subject-label')) lab.textContent = n + ' of ' + units.length + ' units done';
    });
  }

  /* ---------- quiz buttons ---------- */
  function initQuiz() {
    document.querySelectorAll('.quiz .qitem').forEach(function (q) {
      q.querySelectorAll('.opt').forEach(function (o) {
        o.addEventListener('click', function () {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          q.querySelectorAll('.opt').forEach(function (x) { if (x.hasAttribute('data-right')) x.classList.add('right'); });
          if (!o.hasAttribute('data-right')) o.classList.add('wrong'); else confetti(40);
        });
      });
    });
  }

  /* ---------- countdown ---------- */
  function initCountdown() {
    document.querySelectorAll('[data-countdown]').forEach(function (el) {
      var target = new Date(el.dataset.countdown + 'T09:30:00+05:30');
      var days = Math.ceil((target - new Date()) / 86400000);
      el.textContent = days > 0 ? days : (days === 0 ? 'Today!' : '🎓');
    });
    document.querySelectorAll('[data-today]').forEach(function (el) {
      el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    });
  }

  /* ---------- reading bar ---------- */
  function initReadbar() {
    var bar = document.createElement('div'); bar.id = 'readbar'; document.body.appendChild(bar);
    function upd() {
      var h = document.documentElement; var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- print: open all flashcards ---------- */
  function openAll() { document.querySelectorAll('details').forEach(function (d) { d.open = true; }); }
  if (/[?&]print/.test(location.search)) document.addEventListener('DOMContentLoaded', openAll);
  window.addEventListener('beforeprint', openAll);

  /* ---------- tiny confetti ---------- */
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.getElementById('confetti');
    if (!c) { c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c); }
    var ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    var colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#f43f5e', '#fde68a'];
    var shapes = ['★', '✦', '❤', '●'];
    var parts = [];
    for (var i = 0; i < n; i++) parts.push({
      x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight / 3,
      vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4, g: .35 + Math.random() * .2,
      s: 12 + Math.random() * 14, c: colors[i % colors.length], t: shapes[i % shapes.length], r: Math.random() * 6
    });
    var frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += .1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.font = p.s + 'px serif'; ctx.fillText(p.t, 0, 0); ctx.restore();
      });
      if (++frames < 160) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }
  window.mimosaConfetti = confetti;

  document.addEventListener('DOMContentLoaded', function () {
    initChecks(); initDone(); initQuiz(); initCountdown(); initReadbar();
  });
})();

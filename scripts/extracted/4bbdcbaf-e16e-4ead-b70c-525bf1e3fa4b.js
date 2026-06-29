/* Leenkey landing — interactions: nav scroll, scroll-reveal, count-up, FAQ accordion, pricing toggle */
(function () {
  'use strict';

  /* ---- Sticky navbar background on scroll ---- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Hero entrance failsafe ----
     The hero uses pure-CSS load animations (opacity:0 backwards-fill). In any
     context where the timeline doesn't advance (print/PDF, backgrounded tab,
     capture tooling) that would leave the hero blank. Lock the end-state inline
     after the entrance would have finished — float animations keep running. */
  function lockHero() {
    document.querySelectorAll('.hero-copy > *, .hero-visual, .hero-brandbar').forEach(function (el) {
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('animation', 'none', 'important');
    });
    // floating elements: keep their transform/float, just guarantee visibility
    document.querySelectorAll('.estimate-chip, .estimate-card').forEach(function (el) {
      el.style.setProperty('opacity', '1', 'important');
    });
  }
  // If animations can't play, show immediately; otherwise lock after they finish.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lockHero();
  } else if (document.visibilityState === 'hidden') {
    lockHero();
  } else {
    setTimeout(lockHero, 1700);
  }

  /* ---- Scroll reveal ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function lockVisible(el) {
    el.style.setProperty('animation', 'none', 'important');
    el.style.setProperty('transition', 'none', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  }
  function reveal(el) {
    if (el.dataset.revd) return;
    el.dataset.revd = '1';
    el.classList.add('in');
    maybeCount(el);
    var delay = 820 + (parseInt(el.dataset.d || 0, 10) * 90);
    setTimeout(function () { lockVisible(el); }, delay); // lock end-state inline so nothing can re-trigger it
  }
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || 800) * 0.95 && r.bottom > 0;
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // First paint: after a committed frame, reveal anything already on-screen
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      revealEls.forEach(function (el) { if (inView(el)) { reveal(el); io.unobserve(el); } });
    }); });
    // Failsafe: never leave content hidden
    setTimeout(function () { revealEls.forEach(reveal); }, 1600);
  } else {
    revealEls.forEach(reveal);
  }

  /* ---- Count-up for stats ---- */
  function maybeCount(scope) {
    var nums = scope.querySelectorAll('.proof-num[data-count]');
    nums.forEach(function (n) {
      if (n.dataset.done) return;
      n.dataset.done = '1';
      var target = parseFloat(n.dataset.count);
      var suffix = n.dataset.suffix || '';
      var dur = 1300, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(target * eased);
        n.textContent = val.toLocaleString('fr-FR') + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---- FAQ accordion ---- */
  var faq = document.getElementById('faq');
  if (faq) {
    faq.addEventListener('click', function (e) {
      var btn = e.target.closest('.faq-q');
      if (!btn) return;
      var item = btn.parentElement;
      var ans = item.querySelector('.faq-a');
      var isOpen = item.classList.contains('open');
      // close all
      faq.querySelectorAll('.faq-item.open').forEach(function (it) {
        it.classList.remove('open');
        it.querySelector('.faq-a').style.maxHeight = '0px';
        it.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        ans.style.maxHeight = ans.firstElementChild.offsetHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ---- Pricing toggle ---- */
  var toggle = document.getElementById('pricingToggle');
  var grid = document.getElementById('pricingGrid');
  if (toggle && grid) {
    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-view]');
      if (!btn) return;
      var view = btn.dataset.view;
      toggle.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
      grid.setAttribute('data-view', view);
      var showForfait = view === 'forfait';
      grid.querySelectorAll('.pa-forfait').forEach(function (el) { el.hidden = !showForfait; });
      grid.querySelectorAll('.pa-eco').forEach(function (el) { el.hidden = showForfait; });
    });
  }
})();

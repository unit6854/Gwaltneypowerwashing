/**
 * Gwaltney's All Seasons Pressure Washing — Theme Interactions
 * Header scroll · Mobile nav · Testimonial slider · Stat counters
 * Scroll reveal · Netlify form AJAX · Scroll progress bar · Card tilt
 */

(function () {
  'use strict';

  // ─── Header Scroll Behavior ──────────────────────────────────────────────
  (function initHeader() {
    const header = document.querySelector('.gpw-header');
    if (!header) return;

    let lastY = 0, ticking = false;

    function updateHeader() {
      const y = window.scrollY;
      header.classList.toggle('gpw-header--scrolled', y > 40);
      header.classList.toggle('gpw-header--hidden',   y > lastY + 5 && y > 300);
      if (y < lastY || y < 100) header.classList.remove('gpw-header--hidden');
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(updateHeader); ticking = true; }
    }, { passive: true });
  })();

  // ─── Mobile Nav ──────────────────────────────────────────────────────────
  (function initMobileNav() {
    const toggle  = document.getElementById('gpwNavToggle');
    const overlay = document.getElementById('gpwNavOverlay');
    const close   = document.getElementById('gpwNavClose');
    if (!toggle || !overlay) return;

    function open() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
    }
    function shut() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', open);
    close  && close.addEventListener('click', shut);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) shut();
    });

    // Close on nav link click
    overlay.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', shut);
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') shut();
    });
  })();

  // ─── Smooth Scroll ───────────────────────────────────────────────────────
  (function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const id     = this.getAttribute('href').slice(1);
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        e.preventDefault();
        const headerH = document.querySelector('.gpw-header')?.offsetHeight ?? 80;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - headerH,
          behavior: 'smooth',
        });
      });
    });
  })();

  // ─── Testimonials Slider ─────────────────────────────────────────────────
  (function initTestiSlider() {
    const slider = document.getElementById('gpwTestiSlider');
    if (!slider) return;

    const track  = slider.querySelector('.gpw-testi-track');
    const slides = slider.querySelectorAll('.gpw-testi-slide');
    const dots   = slider.querySelectorAll('.gpw-testi-dot');
    const prev   = slider.querySelector('.gpw-testi-prev');
    const next   = slider.querySelector('.gpw-testi-next');

    let current = 0, autoTimer = null;

    function goTo(idx) {
      current = (idx + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function(d, i) {
        d.classList.toggle('gpw-testi-dot--active', i === current);
      });
    }

    function startAuto() { autoTimer = setInterval(function(){ goTo(current + 1); }, 6000); }
    function stopAuto()  { clearInterval(autoTimer); }

    prev && prev.addEventListener('click', function(){ stopAuto(); goTo(current - 1); startAuto(); });
    next && next.addEventListener('click', function(){ stopAuto(); goTo(current + 1); startAuto(); });
    dots.forEach(function(dot) {
      dot.addEventListener('click', function(){ stopAuto(); goTo(parseInt(this.dataset.index, 10)); startAuto(); });
    });

    let touchStartX = 0;
    slider.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend',   function(e){
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { stopAuto(); goTo(current + (diff > 0 ? 1 : -1)); startAuto(); }
    });

    startAuto();
  })();

  // ─── Stat Counter Animation ───────────────────────────────────────────────
  (function initStatCounters() {
    const stats = document.querySelectorAll('.gpw-stat-number[data-count]');
    if (!stats.length) return;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el     = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.textContent.replace(/[\d,]/g, '').trim();
        const dur    = 1800;
        const start  = performance.now();

        function step(now) {
          const pct  = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - pct, 3);
          const val  = Math.round(ease * target);
          el.textContent = val.toLocaleString() + (suffix || '');
          if (pct < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });

    stats.forEach(function(s){ observer.observe(s); });
  })();

  // ─── Scroll-triggered fade-in ─────────────────────────────────────────────
  (function initScrollReveal() {
    const els = document.querySelectorAll(
      '.gpw-service-card, .gpw-gallery-item, .gpw-testi-card, .gpw-stat-col, .gpw-about__point, .gpw-compliance-item'
    );
    if (!els.length) return;

    const obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('gpw-revealed'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function(el){ el.classList.add('gpw-reveal'); obs.observe(el); });
  })();

  // ─── Netlify Contact Form ─────────────────────────────────────────────────
  (function initQuoteForm() {
    const form = document.getElementById('gpwQuoteForm');
    if (!form) return;

    const submitBtn    = form.querySelector('.gpw-form-submit');
    const successPanel = document.getElementById('gpwFormSuccess');
    const errorPanel   = document.getElementById('gpwFormError');

    function setLoading(on) {
      submitBtn.classList.toggle('gpw-form-submit--loading', on);
      submitBtn.disabled = on;
    }

    function showSuccess() {
      if (successPanel) successPanel.hidden = false;
      if (errorPanel)   errorPanel.hidden   = true;
      form.reset();
    }

    function showError() {
      if (errorPanel)   errorPanel.hidden   = false;
      if (successPanel) successPanel.hidden = true;
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        const invalid = form.querySelector(':invalid');
        if (invalid) invalid.focus();
        return;
      }

      setLoading(true);

      const data = new FormData(form);

      fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams(data).toString(),
      })
        .then(function() {
          setLoading(false);
          showSuccess();
        })
        .catch(function() {
          setLoading(false);
          showError();
        });
    });
  })();

  // ─── Left Scroll Progress Bar ─────────────────────────────────────────────
  (function initScrollBar() {
    const bar  = document.createElement('div');
    bar.id     = 'gpw-scrollbar';
    const fill = document.createElement('div');
    fill.id    = 'gpw-scrollbar__fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    function update() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct  = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      fill.style.height = Math.min(pct, 100) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  // ─── Service card hover tilt ──────────────────────────────────────────────
  (function initCardTilt() {
    if (window.matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('.gpw-service-card').forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - 0.5;
        const y = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform = 'perspective(600px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 6) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function(){ card.style.transform = ''; });
    });
  })();

  // ─── FAQ accordion ────────────────────────────────────────────────────────
  (function initFaq() {
    document.querySelectorAll('.gpw-faq-item').forEach(function(item) {
      const btn    = item.querySelector('.gpw-faq-question');
      const answer = item.querySelector('.gpw-faq-answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', function() {
        const open = item.classList.contains('is-open');
        // Close all
        document.querySelectorAll('.gpw-faq-item.is-open').forEach(function(i) {
          i.classList.remove('is-open');
          i.querySelector('.gpw-faq-answer').style.maxHeight = '0';
        });
        // Open clicked if it was closed
        if (!open) {
          item.classList.add('is-open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  })();

  // ─── Before / After Sliders ──────────────────────────────────────────────
  (function initBeforeAfterSliders() {
    var sliders = document.querySelectorAll('.gpw-ba-slider');
    if (!sliders.length) return;

    sliders.forEach(function(slider) {
      var beforeEl  = slider.querySelector('.gpw-ba-before');
      var dividerEl = slider.querySelector('.gpw-ba-divider');
      if (!beforeEl || !dividerEl) return;

      var pct      = 50;
      var dragging = false;
      var rafId    = null;

      function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

      function getPct(clientX) {
        var rect = slider.getBoundingClientRect();
        return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      }

      function apply(p) {
        beforeEl.style.clipPath = 'inset(0 ' + (100 - p).toFixed(3) + '% 0 0)';
        dividerEl.style.left    = p.toFixed(3) + '%';
      }

      function snapTarget(p) {
        if (p < 40) return 0;
        if (p > 60) return 100;
        return 50;
      }

      function animateTo(target, duration) {
        var startPct = pct, startTime = null;
        if (rafId) cancelAnimationFrame(rafId);
        function step(ts) {
          if (!startTime) startTime = ts;
          var t     = Math.min((ts - startTime) / duration, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          pct = startPct + (target - startPct) * eased;
          apply(pct);
          if (t < 1) { rafId = requestAnimationFrame(step); }
          else { pct = target; apply(pct); rafId = null; }
        }
        rafId = requestAnimationFrame(step);
      }

      function onStart(clientX) {
        dragging = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        pct = getPct(clientX); apply(pct);
      }
      function onMove(clientX)  { if (dragging) { pct = getPct(clientX); apply(pct); } }
      function onEnd()           { if (dragging) { dragging = false; animateTo(snapTarget(pct), 250); } }

      var handle = slider.querySelector('.gpw-ba-handle');

      // ── Mouse: only the handle starts a drag ─────────────────────────────
      handle.addEventListener('mousedown', function(e) { e.preventDefault(); onStart(e.clientX); });
      window.addEventListener('mousemove', function(e) { onMove(e.clientX); });
      window.addEventListener('mouseup',   onEnd);

      // ── Touch: handle starts drag; move/end tracked on slider so the
      //   finger can travel outside the handle while dragging. Touching
      //   anywhere else on the image does NOT start a drag, so normal
      //   page scrolling works fine. ────────────────────────────────────────
      handle.addEventListener('touchstart', function(e) {
        onStart(e.touches[0].clientX);
      }, { passive: true });

      slider.addEventListener('touchmove', function(e) {
        if (dragging) {
          e.preventDefault();   // block scroll only while handle is grabbed
          onMove(e.touches[0].clientX);
        }
      }, { passive: false });

      slider.addEventListener('touchend',    onEnd);
      slider.addEventListener('touchcancel', onEnd);

      apply(pct); // init at 50%
    });
  })();

})();

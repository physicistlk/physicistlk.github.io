/**
 * Neuromorphic Bioelectronics Laboratory (NBL)
 * Main Interactive Script
 */

(function () {
  'use strict';

  // --- Theme Management ---
  const THEME_KEY = 'nbl_theme';
  const root = document.documentElement;

  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }
  initTheme();

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isLight = root.classList.toggle('light');
      localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
      showToast(isLight ? 'Switched to Light mode' : 'Switched to Dark mode');
    });
  });

  // --- Mobile Navigation ---
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // --- Scroll Progress Bar & Back-to-Top ---
  const progressBar = document.querySelector('[data-scroll-progress]');
  const backToTopBtn = document.querySelector('[data-back-to-top]');

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (progressBar && docHeight > 0) {
      const scrollPercent = (scrollTop / docHeight) * 100;
      progressBar.style.width = scrollPercent + '%';
    }

    if (backToTopBtn) {
      if (scrollTop > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  }, { passive: true });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Toast Notification System ---
  function showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;color:var(--accent-cyan)">check_circle</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
  window.showToast = showToast;

  // --- Modal / Lightbox for Research Figures ---
  const modal = document.querySelector('[data-modal]');
  const modalImg = document.querySelector('[data-modal-img]');
  const modalCaption = document.querySelector('[data-modal-caption]');
  const modalClose = document.querySelector('[data-modal-close]');

  function openModal(src, caption) {
    if (!modal) return;
    if (modalImg) modalImg.src = src;
    if (modalCaption) modalCaption.textContent = caption;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  document.querySelectorAll('[data-zoomable]').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.getAttribute('data-caption') || (img ? img.alt : '');
      if (img) openModal(img.src, caption);
    });
  });

  // --- Publication & Patent Filter & Search ---
  const filterChips = document.querySelectorAll('[data-filter]');
  const searchInput = document.querySelector('[data-search-input]');
  const pubCards = document.querySelectorAll('[data-pub-item]');

  let activeCategory = 'all';
  let searchQuery = '';

  function filterPublications() {
    pubCards.forEach(card => {
      const categories = (card.getAttribute('data-categories') || '').toLowerCase();
      const text = card.textContent.toLowerCase();

      const matchesCat = activeCategory === 'all' || categories.includes(activeCategory);
      const matchesSearch = !searchQuery || text.includes(searchQuery);

      if (matchesCat && matchesSearch) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-filter').toLowerCase();
      filterPublications();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterPublications();
    });
  }

  // --- BibTeX & APA Citation Copy ---
  document.querySelectorAll('[data-copy-bibtex]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bibtex = btn.getAttribute('data-bibtex');
      if (bibtex) {
        navigator.clipboard.writeText(bibtex).then(() => {
          showToast('BibTeX citation copied to clipboard!');
        }).catch(() => {
          showToast('Failed to copy BibTeX');
        });
      }
    });
  });

  document.querySelectorAll('[data-copy-apa]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const apa = btn.getAttribute('data-apa');
      if (apa) {
        navigator.clipboard.writeText(apa).then(() => {
          showToast('APA citation copied to clipboard!');
        }).catch(() => {
          showToast('Failed to copy APA citation');
        });
      }
    });
  });

  // --- Contact Form Helper ---
  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(contactForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const category = String(data.get('category') || 'Research Inquiry').trim();
      const message = String(data.get('message') || '').trim();

      if (!name || !email || !message) {
        showToast('Please fill in Name, Email, and Message.');
        return;
      }

      const subject = encodeURIComponent(`[NBL Inquiry] ${category} - ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\nMessage:\n${message}`);
      const mailtoUrl = `mailto:lokesh@nitc.ac.in?subject=${subject}&body=${body}`;

      showToast('Opening your email client to send message…');
      window.location.href = mailtoUrl;
      contactForm.reset();
    });
  }

})();

/* --- Hero synapse network (decorative; honours reduced motion) --- */
(function () {
  'use strict';
  var canvases = document.querySelectorAll('[data-synapse-canvas]');
  if (!canvases.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  canvases.forEach(function (cv) {
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, nodes = [], pulses = [], running = true;
    var dense = cv.getAttribute('data-density') || 'hero';

    function resize() {
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(70, Math.max(14, (w * h) / (dense === 'hero' ? 16000 : 7000))));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, r: 1.2 + Math.random() * 1.8, fire: 0 });
      }
    }

    function colors() {
      var light = document.documentElement.classList.contains('light');
      return light ? ['2,132,199', '5,150,105'] : ['56,189,248', '52,211,153'];
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var c = colors(), maxD = dense === 'hero' ? 150 : 110, i, j, a, b, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (!reduce) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1; }
        a.fire *= 0.94;
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxD) {
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + (0.16 * (1 - d / maxD)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (!reduce && Math.random() < 0.06 && nodes.length > 2) {
        var s = nodes[(Math.random() * nodes.length) | 0], t = nodes[(Math.random() * nodes.length) | 0];
        if (s !== t && Math.hypot(s.x - t.x, s.y - t.y) < maxD * 1.6) pulses.push({ s: s, t: t, p: 0 });
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var q = pulses[i]; q.p += 0.025;
        if (q.p >= 1) { q.t.fire = 1; pulses.splice(i, 1); continue; }
        var px = q.s.x + (q.t.x - q.s.x) * q.p, py = q.s.y + (q.t.y - q.s.y) * q.p;
        ctx.fillStyle = 'rgba(' + c[1] + ',0.95)';
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.283); ctx.fill();
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = 'rgba(' + (a.fire > 0.1 ? c[1] : c[0]) + ',' + (0.55 + a.fire * 0.45).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + a.fire * 2.5, 0, 6.283); ctx.fill();
      }
      if (!reduce) requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running && !reduce) requestAnimationFrame(frame);
    });
    frame();
  });
})();

/* 신은선 Portfolio — shared behaviour */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- menu ---------- */
  const menu = $('#menu');
  const setMenu = open => {
    if (!menu) return;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  $('#menuOpen')?.addEventListener('click', () => setMenu(true));
  $('#menuClose')?.addEventListener('click', () => setMenu(false));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- cursor ---------- */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover:hover)').matches) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    const label = cur.querySelector('span');
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      cur.classList.toggle('is-big', !!t);
      if (t) label.textContent = t.dataset.cursor || 'View';
    });
    const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); };
    loop();
  }

  /* ---------- marquee: always moving right→left (reading direction) ---------- */
  const marquees = $$('.marquee__track').map(track => {
    const unit = track.innerHTML;
    // repeat until the track is at least 3× the viewport so the loop never shows a gap
    let guard = 0;
    while (track.scrollWidth < innerWidth * 3 && guard++ < 20) track.insertAdjacentHTML('beforeend', unit);
    track.insertAdjacentHTML('beforeend', track.innerHTML); // two identical halves
    return { track, x: 0, speed: +(track.dataset.speed || 70) };
  });
  let lastY = scrollY, boost = 0, lastT = performance.now();
  const tick = t => {
    const dt = Math.min(64, t - lastT) / 1000; lastT = t;
    const dy = Math.abs(scrollY - lastY); lastY = scrollY;
    boost = Math.max(boost * 0.92, Math.min(dy * 6, 900));
    marquees.forEach(m => {
      const half = m.track.scrollWidth / 2;
      m.x -= (m.speed + boost) * dt;
      if (-m.x >= half) m.x += half;
      m.track.style.transform = `translate3d(${m.x}px,0,0)`;
    });
    requestAnimationFrame(tick);
  };
  if (marquees.length) requestAnimationFrame(tick);

  /* ---------- manifesto word-by-word reveal ---------- */
  const mt = $('#manifestoText');
  let words = [];
  if (mt) {
    const hl = (mt.dataset.hl || '').split(',').filter(Boolean);
    mt.innerHTML = mt.textContent.trim().split(/\s+/).map(w => `<span class="w${hl.some(h => w.startsWith(h)) ? ' hl' : ''}">${w}</span>`).join(' ');
    words = $$('.w', mt); // runs even with OS "reduce motion" on (requested effect)
  }

  /* ---------- pinned horizontal work ---------- */
  const work = $('#work'), track = $('#workTrack'), now = $('#workNow'), bar = $('#workBar');
  const sizeWork = () => {
    if (!work) return;
    const shift = Math.max(0, track.scrollWidth - innerWidth);
    work.style.height = `${innerHeight + shift}px`;
    work.dataset.shift = shift;
  };

  /* ---------- scroll handler ---------- */
  const progress = $('#progress'), topbar = $('.topbar');
  const spots = $$('.spot__media img');
  const onScroll = () => {
    const h = document.documentElement;
    if (progress) progress.style.width = `${(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100}%`;
    topbar?.classList.toggle('is-solid', scrollY > 40);

    if (words.length) {
      const r = mt.getBoundingClientRect();
      const p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .3), 0, 1);
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    if (work) {
      const shift = +work.dataset.shift || 0;
      const p = clamp((scrollY - work.offsetTop) / Math.max(1, work.offsetHeight - innerHeight), 0, 1);
      track.style.transform = `translate3d(${-p * shift}px,0,0)`;
      const total = track.children.length;
      if (now) now.textContent = String(Math.min(total, Math.floor(p * total) + 1)).padStart(2, '0');
      if (bar) bar.style.width = `${p * 100}%`;
    }

    if (!reduced) spots.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1
      img.style.transform = `translate3d(0,${-8 + p * 8}%,0)`;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeWork(); onScroll(); });
  addEventListener('load', () => { sizeWork(); onScroll(); });
  sizeWork(); onScroll();

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .skills').forEach(el => io.observe(el));

  /* ---------- lightbox for case images ---------- */
  const imgs = $$('[data-lb] img');
  if (imgs.length) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="이미지 크게 보기">
        <button class="lb__close" aria-label="닫기">×</button>
        <button class="lb__prev" aria-label="이전 이미지">←</button>
        <img alt="">
        <button class="lb__next" aria-label="다음 이미지">→</button>
        <p class="lb__cap mono"></p>
      </div>`);
    const lb = $('#lb'), big = $('img', lb), cap = $('.lb__cap', lb);
    let i = 0;
    const show = n => { i = (n + imgs.length) % imgs.length; big.src = imgs[i].currentSrc || imgs[i].src; big.alt = imgs[i].alt; cap.textContent = imgs[i].alt; };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
    imgs.forEach((im, n) => {
      im.closest('[data-lb]').addEventListener('click', () => { show(n); lb.classList.add('open'); document.body.style.overflow = 'hidden'; });
    });
    $('.lb__close', lb).onclick = close;
    $('.lb__prev', lb).onclick = () => show(i - 1);
    $('.lb__next', lb).onclick = () => show(i + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
})();

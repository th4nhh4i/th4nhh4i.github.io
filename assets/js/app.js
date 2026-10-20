/* th4nhh4i — tương tác dùng chung cho portfolio (index.html) và field notes (blog.html).
   Không phụ thuộc thư viện ngoài; mọi hiệu ứng đều xuống cấp an toàn khi thiếu API. */
(() => {
  'use strict';

  window.th4nhh4iReady = true;

  const scriptURL = document.currentScript?.src || new URL('assets/js/app.js', location.href).href;
  const siteURL = new URL('../../', scriptURL);
  const root = document.documentElement;
  const query = (selector, scope = document) => scope.querySelector(selector);
  const all = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const storage = {
    get(kind, key) {
      try { return window[kind].getItem(key); } catch { return null; }
    },
    set(kind, key, value) {
      try { window[kind].setItem(key, value); } catch { /* Private browsing is supported. */ }
    },
    remove(kind, key) {
      try { window[kind].removeItem(key); } catch { /* Storage is optional. */ }
    }
  };
  const ARRIVAL_KEY = 'th4nhh4i-arrival';
  const MOTION_KEY = 'th4nhh4i-motion';
  const HEX = '0123456789abcdef';
  root.classList.add('js');

  // ===== Motion preference =====
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const savedMotion = storage.get('localStorage', MOTION_KEY);
  let motionEnabled = savedMotion !== 'off' && !motionQuery?.matches;
  const motionToggle = query('#motion-toggle');
  const applyMotion = () => {
    root.classList.toggle('motion-reduced', !motionEnabled);
    if (motionToggle) {
      motionToggle.disabled = Boolean(motionQuery?.matches);
      motionToggle.setAttribute('aria-pressed', String(motionEnabled));
      motionToggle.setAttribute('aria-label', motionEnabled ? 'Tắt hiệu ứng chuyển động' : 'Bật hiệu ứng chuyển động');
      motionToggle.title = motionEnabled ? 'Chuyển động: bật' : 'Chuyển động: tắt';
      const state = query('[data-motion-state]', motionToggle);
      if (state) state.textContent = motionEnabled ? 'ON' : 'OFF';
    }
    if (!motionEnabled) {
      all('.reveal').forEach(element => element.classList.add('is-visible'));
      all('.core-scene').forEach(element => {
        element.style.setProperty('--pointer-x', '0deg');
        element.style.setProperty('--pointer-y', '0deg');
      });
    }
  };
  applyMotion();
  motionToggle?.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    storage.set('localStorage', MOTION_KEY, motionEnabled ? 'on' : 'off');
    applyMotion();
  });
  motionQuery?.addEventListener?.('change', event => {
    motionEnabled = storage.get('localStorage', MOTION_KEY) !== 'off' && !event.matches;
    applyMotion();
  });

  // ===== SHA-256 & giải mã chữ =====
  // Fallback khi không có Web Crypto (context không an toàn): chỉ để hiển thị, không dùng cho bảo mật.
  const fallbackHex = text => {
    let out = '';
    for (let seed = 0; out.length < 64; seed++) {
      let h = 0x811c9dc5 ^ seed;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      out += (h >>> 0).toString(16).padStart(8, '0');
    }
    return out.slice(0, 64);
  };
  const hashCache = new Map();
  const sha256 = text => {
    if (hashCache.has(text)) return hashCache.get(text);
    const promise = window.crypto?.subtle && window.TextEncoder
      ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
        .then(buffer => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join(''))
        .catch(() => fallbackHex(text))
      : Promise.resolve(fallbackHex(text));
    hashCache.set(text, promise);
    return promise;
  };
  const shortHash = (hash, head = 6, tail = 4) => `0x${hash.slice(0, head)}…${hash.slice(-tail)}`;
  const scramble = (element, text, duration = 700) => {
    if (!motionEnabled || duration <= 0) {
      element.textContent = text;
      return Promise.resolve();
    }
    const glyphs = `${HEX}#%&*/<>`;
    const start = performance.now();
    return new Promise(resolve => {
      const frame = now => {
        const progress = Math.min((now - start) / duration, 1);
        const settled = Math.floor(text.length * progress);
        let out = text.slice(0, settled);
        for (let i = settled; i < text.length; i++) out += text[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
        element.textContent = out;
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  };

  // ===== Chuyển cảnh chain-of-custody =====
  // Rời trang: tấm màn trượt lên, băm SHA-256, chuỗi 6 block sáng dần. Vào trang: màn đã phủ sẵn rồi trượt đi.
  const curtain = query('#page-transition');
  const PAGE_PATHS = { 'index.html': '/portfolio', 'blog.html': '/field-notes' };
  const PAGE_TITLES = { 'index.html': 'Portfolio.', 'blog.html': 'Field Notes.' };
  const pageFile = url => url.pathname.split('/').pop() || 'index.html';
  const pagePath = url => PAGE_PATHS[pageFile(url)] || `/${pageFile(url).replace(/\.html$/i, '')}`;
  const cleanLabel = label => (label || '').replace(/[↗↙↓↑]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

  const fillCurtain = ({ title, from, to, verified }) => {
    if (!curtain) return;
    const setText = (selector, text) => {
      const element = query(selector, curtain);
      if (element) element.textContent = text;
    };
    setText('.transition-label', title);
    setText('.transition-route', `${from} → ${to}`);
    setText('.transition-status', verified ? 'INTEGRITY VERIFIED ✓' : 'HASHING EVIDENCE…');
    const hashElement = query('.transition-hash', curtain);
    if (hashElement) sha256(`${from}->${to}|${title}`).then(hash => scramble(hashElement, `sha256 · ${hash}`, verified ? 0 : 520));
  };

  let navigating = false;
  let navigationTimer;
  let pendingDestination = null;
  const resetTransition = () => {
    clearTimeout(navigationTimer);
    navigating = false;
    pendingDestination = null;
    if (curtain) {
      curtain.classList.add('no-transition');
      curtain.classList.remove('is-active', 'is-entering', 'is-leaving');
      void curtain.offsetHeight;
      curtain.classList.remove('no-transition');
    }
    root.classList.remove('is-navigating', 'is-arriving');
  };
  const navigate = (destination, label) => {
    if (navigating) return;
    const url = new URL(destination, location.href);
    if (!curtain || !motionEnabled) {
      location.assign(url.href);
      return;
    }
    navigating = true;
    pendingDestination = url.href;
    const from = pagePath(location);
    const to = pagePath(url);
    const title = cleanLabel(label) || PAGE_TITLES[pageFile(url)] || 'Next chapter.';
    fillCurtain({ title, from, to, verified: false });
    curtain.classList.add('no-transition');
    curtain.classList.remove('is-leaving', 'is-entering');
    void curtain.offsetHeight;
    curtain.classList.remove('no-transition');
    root.classList.add('is-navigating');
    curtain.classList.add('is-active');
    storage.set('sessionStorage', ARRIVAL_KEY, JSON.stringify({ href: url.href, title, from, to, t: Date.now() }));
    navigationTimer = window.setTimeout(() => location.assign(url.href), 720);
  };

  const arrivalRaw = storage.get('sessionStorage', ARRIVAL_KEY);
  storage.remove('sessionStorage', ARRIVAL_KEY);
  if (root.classList.contains('is-arriving') && curtain) {
    let arrival = {};
    try { arrival = JSON.parse(arrivalRaw) || {}; } catch { arrival = {}; }
    fillCurtain({
      title: arrival.title || PAGE_TITLES[pageFile(location)] || 'Welcome.',
      from: arrival.from || '/',
      to: pagePath(location),
      verified: true
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('is-leaving');
      root.classList.remove('is-arriving');
    }));
  } else {
    root.classList.remove('is-arriving');
  }
  window.addEventListener('pageshow', event => {
    if (event.persisted) resetTransition();
  });
  window.addEventListener('pagehide', () => clearTimeout(navigationTimer));
  // Người dùng bàn phím có thể huỷ chuyển trang trước khi trình duyệt điều hướng.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigating) {
      storage.remove('sessionStorage', ARRIVAL_KEY);
      resetTransition();
    }
  });
  window.addEventListener('focus', () => {
    // Khôi phục nếu chính sách trình duyệt đã huỷ điều hướng.
    if (navigating && pendingDestination === location.href) resetTransition();
  });

  // ===== Menu =====
  const menuToggle = query('.menu-toggle');
  const nav = query('#main-nav');
  const closeMenu = () => {
    nav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };
  if (menuToggle && nav) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', nav.id);
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        closeMenu();
        menuToggle.focus();
      }
    });
    const desktopQuery = window.matchMedia?.('(min-width: 901px)');
    desktopQuery?.addEventListener?.('change', event => { if (event.matches) closeMenu(); });
  }

  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    if (nav?.contains(link)) closeMenu();
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || (link.target && link.target !== '_self') || link.hasAttribute('data-no-transition')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['http:', 'https:', 'file:'].includes(url.protocol)) return;
    if (!/\.html$/i.test(url.pathname) && !url.pathname.endsWith('/')) return;
    // Cùng trang (vd: "/" và "index.html#contact"): để trình duyệt tự cuộn tới anchor.
    const sameDirectory = url.pathname.replace(/[^/]*$/, '') === location.pathname.replace(/[^/]*$/, '');
    if (sameDirectory && pageFile(url) === pageFile(location) && url.search === location.search) return;
    event.preventDefault();
    navigate(url.href, link.dataset.transitionLabel || link.textContent);
  });

  // ===== Reveal khi cuộn (nội dung vẫn đọc được khi thiếu IntersectionObserver) =====
  const reveals = all('.reveal');
  if ('IntersectionObserver' in window && motionEnabled) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(element => revealObserver.observe(element));

    const scrambleObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        scrambleObserver.unobserve(entry.target);
        scramble(entry.target, entry.target.dataset.text, 800);
      });
    }, { threshold: 0.6 });
    all('[data-scramble]').forEach(element => {
      element.dataset.text = element.textContent;
      scrambleObserver.observe(element);
    });
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }

  all('[data-hash-source]').forEach(element => {
    sha256(element.dataset.hashSource).then(hash => scramble(query('b', element) || element, shortHash(hash, 8, 6), 900));
  });

  // ===== Thanh tiến trình cuộn =====
  const progressLine = document.createElement('div');
  progressLine.className = 'progress-line';
  progressLine.setAttribute('aria-hidden', 'true');
  document.body.append(progressLine);
  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    const max = root.scrollHeight - window.innerHeight;
    progressLine.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  };
  const scheduleProgress = () => { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); };
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  updateProgress();

  // ===== Evidence Core: nghiêng theo con trỏ =====
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)');
  all('.core-scene').forEach(scene => {
    let frame = 0;
    let x = 0;
    let y = 0;
    const render = () => {
      scene.style.setProperty('--pointer-x', `${x.toFixed(2)}deg`);
      scene.style.setProperty('--pointer-y', `${y.toFixed(2)}deg`);
      frame = 0;
    };
    scene.addEventListener('pointermove', event => {
      if (!motionEnabled || !finePointer?.matches || event.pointerType === 'touch') return;
      const rect = scene.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = Math.max(-8, Math.min(8, -((event.clientY - rect.top) / rect.height - 0.5) * 12));
      y = Math.max(-8, Math.min(8, ((event.clientX - rect.left) / rect.width - 0.5) * 12));
      if (!frame) frame = requestAnimationFrame(render);
    }, { passive: true });
    const reset = () => {
      x = y = 0;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    scene.addEventListener('pointerleave', reset, { passive: true });
    scene.addEventListener('pointercancel', reset, { passive: true });
  });

  // ===== Cyber Roadmap: zoom, kéo, bộ lọc, mở thẻ (khôi phục từ bản gốc) =====
  const ledgerBlocks = [];
  const roadmapViewport = query('#roadmapViewport');
  const roadmapCanvas = query('#roadmapCanvas');
  if (roadmapViewport && roadmapCanvas) {
    const roadNodes = all('.road-node-item', roadmapCanvas);
    const mapWidth = Number(roadmapCanvas.dataset.mapWidth) || 3100;
    const mapHeight = Number(roadmapCanvas.dataset.mapHeight) || 2400;
    const maxScale = 2.2;
    let currentScale = 1;
    const overviewScale = () => Math.min(
      roadmapViewport.clientWidth / mapWidth,
      roadmapViewport.clientHeight / mapHeight
    ) * 0.94;
    const applyZoom = scale => {
      const next = Math.min(Math.max(scale, overviewScale()), maxScale);
      const centerX = (roadmapViewport.scrollLeft + roadmapViewport.clientWidth / 2) / currentScale;
      const centerY = (roadmapViewport.scrollTop + roadmapViewport.clientHeight / 2) / currentScale;
      currentScale = next;
      roadmapCanvas.style.zoom = String(next);
      roadmapViewport.scrollLeft = centerX * next - roadmapViewport.clientWidth / 2;
      roadmapViewport.scrollTop = centerY * next - roadmapViewport.clientHeight / 2;
    };
    const showOverview = () => {
      applyZoom(overviewScale());
      roadmapViewport.scrollLeft = 0;
      roadmapViewport.scrollTop = 0;
    };

    query('#zoomInBtn')?.addEventListener('click', () => applyZoom(currentScale * 1.4));
    query('#zoomOutBtn')?.addEventListener('click', () => applyZoom(currentScale / 1.4));
    query('#zoomResetBtn')?.addEventListener('click', showOverview);

    // Menu bộ lọc thả xuống
    const filterToggle = query('#filterToggleBtn');
    const filterMenu = query('#filterDropdownMenu');
    const setFilterMenu = open => {
      filterMenu?.classList.toggle('show', open);
      filterToggle?.classList.toggle('active', open);
      filterToggle?.setAttribute('aria-expanded', String(open));
    };
    if (filterToggle && filterMenu) {
      filterToggle.setAttribute('aria-haspopup', 'true');
      filterToggle.setAttribute('aria-expanded', 'false');
      filterToggle.addEventListener('click', event => {
        event.stopPropagation();
        setFilterMenu(!filterMenu.classList.contains('show'));
      });
      document.addEventListener('click', event => {
        if (!filterMenu.contains(event.target) && !filterToggle.contains(event.target)) setFilterMenu(false);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && filterMenu.classList.contains('show')) {
          setFilterMenu(false);
          filterToggle.focus();
        }
      });
    }

    // Lọc theo loại sự kiện / năm; năm thì cuộn tới mốc đầu tiên của năm đó
    const focusNode = node => {
      if (!node) return;
      applyZoom(Math.max(currentScale, 0.7));
      roadmapViewport.scrollTo({
        left: node.offsetLeft * currentScale - roadmapViewport.clientWidth / 2,
        top: node.offsetTop * currentScale - roadmapViewport.clientHeight / 2,
        behavior: motionEnabled ? 'smooth' : 'auto'
      });
    };
    const filterButtons = all('.filter-btn', roadmapViewport.parentElement);
    filterButtons.forEach(button => button.addEventListener('click', () => {
      filterButtons.forEach(other => other.classList.toggle('active', other === button));
      const filter = button.dataset.filter;
      if (filter.startsWith('year-')) {
        const year = filter.slice(5);
        focusNode(roadNodes.find(node => (query('.node-date', node)?.textContent || '').includes(year)));
      }
      roadNodes.forEach(node => {
        if (filter === 'all') {
          node.classList.remove('node-dimmed', 'node-highlighted');
          return;
        }
        const has = selector => query(selector, node) !== null;
        const dateText = query('.node-date', node)?.textContent || '';
        const match = filter === 'ctf' ? has('.ctf-tag')
          : filter === 'edu' ? has('.edu-tag') || has('.award-tag')
            : filter === 'contest' ? has('.contest-tag') || has('.nckh-tag')
              : filter === 'job' ? has('.job-tag')
                : filter.startsWith('year-') ? dateText.includes(filter.split('-')[1])
                  : false;
        node.classList.toggle('node-dimmed', !match);
        node.classList.toggle('node-highlighted', match);
      });
      setFilterMenu(false);
    }));

    // Kéo chuột để cuộn; không mở/đóng thẻ nếu vừa kéo
    let isDragging = false;
    let dragMoved = false;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let startScrollY = 0;
    const endDrag = () => {
      isDragging = false;
      roadmapViewport.classList.remove('dragging');
    };
    roadmapViewport.addEventListener('mousedown', event => {
      isDragging = true;
      dragMoved = false;
      roadmapViewport.classList.add('dragging');
      startX = event.pageX;
      startY = event.pageY;
      startScroll = roadmapViewport.scrollLeft;
      startScrollY = roadmapViewport.scrollTop;
    });
    roadmapViewport.addEventListener('mouseleave', endDrag);
    roadmapViewport.addEventListener('mouseup', endDrag);
    roadmapViewport.addEventListener('mousemove', event => {
      if (!isDragging) return;
      event.preventDefault();
      const walk = (event.pageX - startX) * 1.5;
      const rise = (event.pageY - startY) * 1.5;
      if (Math.abs(walk) > 6 || Math.abs(rise) > 6) dragMoved = true;
      roadmapViewport.scrollLeft = startScroll - walk;
      roadmapViewport.scrollTop = startScrollY - rise;
    });
    roadmapViewport.addEventListener('wheel', event => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      applyZoom(currentScale + (event.deltaY > 0 ? -0.1 : 0.1));
    }, { passive: false });

    // Bấm thẻ để xem chi tiết
    all('.node-card', roadmapCanvas).forEach(card => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');
      const toggle = () => {
        if (currentScale < 0.5) {
          applyZoom(0.8);
          const node = card.closest('.road-node-item');
          roadmapViewport.scrollLeft = node.offsetLeft * currentScale - roadmapViewport.clientWidth / 2;
          roadmapViewport.scrollTop = node.offsetTop * currentScale - roadmapViewport.clientHeight / 2;
          return;
        }
        const expanded = card.classList.toggle('expanded');
        card.setAttribute('aria-expanded', String(expanded));
      };
      card.addEventListener('click', event => {
        event.stopPropagation();
        if (dragMoved) return;
        toggle();
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });

    // Mặc định hiển thị toàn bộ hành trình
    if (document.readyState === 'complete') showOverview();
    else window.addEventListener('load', showOverview, { once: true });
    window.addEventListener('resize', () => { if (currentScale <= overviewScale() * 1.05) showOverview(); });

    // Chuỗi hash cho lệnh `ledger` trong terminal
    (async () => {
      let prev = '0'.repeat(64);
      for (const [index, node] of roadNodes.entries()) {
        const title = query('h4', node)?.textContent.trim() || '';
        const date = query('.node-date', node)?.textContent.trim() || '';
        const hash = await sha256(`${prev}|${index + 1}|${date}|${title}`);
        ledgerBlocks.push({ seq: index + 1, title, date, hash });
        prev = hash;
      }
    })();
  }

  // ===== Dialogs: native dialog lo phần focus & phím Escape =====
  const dialogOpeners = new WeakMap();
  const closeDialog = dialog => {
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      dialogOpeners.get(dialog)?.focus();
    }
  };
  const openDialog = (dialog, opener) => {
    if (!dialog || dialog.open) return;
    all('dialog[open]').forEach(closeDialog);
    closeMenu();
    dialogOpeners.set(dialog, opener || document.activeElement);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  all('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      const opener = dialogOpeners.get(dialog);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && typeof dialog.close !== 'function') closeDialog(dialog);
    });
  });

  // ===== Terminal =====
  const terminal = query('#terminal-dialog');
  const terminalInput = query('#terminal-input');
  const terminalOutput = query('#terminal-output');
  const terminalForm = query('#terminal-form');
  all('.terminal-toggle').forEach(button => button.addEventListener('click', () => {
    openDialog(terminal, button);
    terminalInput?.focus({ preventScroll: true });
  }));
  all('.terminal-close').forEach(button => button.addEventListener('click', () => closeDialog(terminal)));

  if (terminalForm && terminalInput && terminalOutput) {
    const history = [];
    let historyIndex = 0;
    let historyDraft = '';
    const appendLine = (text, className = 'terminal-response') => {
      const line = document.createElement('div');
      line.className = className;
      line.textContent = text;
      terminalOutput.append(line);
      while (terminalOutput.childElementCount > 160) terminalOutput.firstElementChild.remove();
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };
    const destinations = {
      home: 'home', about: 'about', projects: 'projects',
      resume: 'resume', experience: 'resume', roadmap: 'resume', ledger: 'resume', contact: 'contact', gallery: 'gallery-sec'
    };
    const visit = name => {
      if (name === 'blog' || name === 'notes') {
        closeDialog(terminal);
        navigate(new URL('blog.html', siteURL).href, 'Field Notes.');
        return;
      }
      const id = destinations[name];
      if (!id) {
        appendLine(`cd: Không tìm thấy “${name}”. Gõ ls để xem danh mục.`, 'terminal-response is-warn');
        return;
      }
      closeDialog(terminal);
      const section = document.getElementById(id);
      if (section) {
        if (location.hash === `#${id}`) section.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'instant' });
        else location.hash = id;
      } else {
        navigate(new URL(`index.html#${id}`, siteURL).href, `${name}.`);
      }
    };
    const fileText = {
      'about.txt': 'Lê Thanh Hải / th4nhh4i\nPurple Team · Digital Forensics · CTF player\nĐH Gia Định — CNTT / An toàn thông tin — GPA 3.64/4.0\nGõ cd about để đọc thêm.',
      'contact.txt': 'Email:   thanhhai.dakha@gmail.com\nGitHub:  https://github.com/thanhhai2103\nDiscord: Th4nhH4i\nGõ cd contact để kết nối.',
      'readme.md': '# th4nhh4i\nPortfolio cá nhân của Lê Thanh Hải.\ncd projects để xem dự án, cd blog để đọc field notes.',
      'case.log': '[CASE TH4NHH4I-2026]\n2023-09  Nhập học An toàn thông tin — ĐH Gia Định\n2025-03  Top 1 GDU-CTF 2025 · Best User\n2025-06  Security Intern — Trung tâm Athena\n2025-10  RMIT Hackathon 2025 — GenAI & Cyber Security\n2025-11  Top 23 CSCV 2025\n2026-03  Purple Team Intern — DTG Corp\n2026-07  Hacktheon Sejong 2026 — Chung kết\nSTATUS: ACTIVE — NEXT: SOC / PURPLE TEAM ANALYST'
    };
    const commands = ['help', 'whoami', 'ls', 'pwd', 'cd', 'cat', 'sha256sum', 'strings', 'vol.py', 'ledger', 'date', 'clear', 'exit'];
    const pslist = [
      'Volatility 3 Framework 2.7.0',
      'Image: th4nhh4i_portfolio.raw   Plugin: windows.pslist',
      '',
      'PID    PPID   ImageFileName        Threads',
      '4      0      System               142',
      '612    4      purple_team.exe      24',
      '1337   612    soc_monitor.exe      16',
      '2103   612    ctf_player.exe       28',
      '4444   2103   forensics.exe        64    [!] quá đam mê — không thể kill'
    ].join('\n');
    const strings = [
      '!This program cannot be run in DOS mode.',
      'th4nhh4i::purple_team',
      'curiosity.exe --no-sleep',
      'flag{think_offensive_build_defensive}'
    ].join('\n');

    if (!terminalOutput.textContent.trim()) {
      appendLine('TH4NHH4I / EVIDENCE SHELL\nGõ help để xem lệnh. Dùng ↑ / ↓ để xem lịch sử.');
    }
    terminalForm.addEventListener('submit', event => {
      event.preventDefault();
      const raw = terminalInput.value.trim();
      terminalInput.value = '';
      if (!raw) return;
      history.push(raw);
      if (history.length > 100) history.shift();
      historyIndex = history.length;
      historyDraft = '';
      appendLine(`visitor@th4nhh4i:~$ ${raw}`, 'terminal-command');
      const [command, ...args] = raw.split(/\s+/);
      const target = (args[0] || '').toLowerCase();
      switch (command.toLowerCase()) {
        case 'help':
          appendLine('help                 Danh sách lệnh\nwhoami               Giới thiệu nhanh\nls                   Xem danh mục & tệp\ncd <mục>             about · projects · roadmap\n                     gallery · contact · blog\ncat <tệp>            about.txt · contact.txt · readme.md · case.log\nsha256sum <tệp>      Băm SHA-256 kiểm tra toàn vẹn\nstrings evidence.bin Tìm chuỗi ẩn trong vật chứng\nvol.py pslist        "Phân tích bộ nhớ" của portfolio\nledger               5 cột mốc mới nhất, nối chuỗi SHA-256\ndate · pwd · clear · exit\n\nMẹo: Tab để gợi ý, ↑ / ↓ để xem lệnh trước.');
          break;
        case 'whoami': appendLine(fileText['about.txt']); break;
        case 'ls': appendLine('about/    projects/  roadmap/\ngallery/  contact/   blog/\n\nabout.txt   contact.txt   readme.md   case.log   evidence.bin'); break;
        case 'pwd': appendLine('/home/th4nhh4i/evidence'); break;
        case 'clear': terminalOutput.replaceChildren(); break;
        case 'date': appendLine(new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())); break;
        case 'cd': visit((args[0] || 'home').replace(/^(~\/|\.\/|\/)/, '').replace(/\/$/, '').toLowerCase()); break;
        case 'cat':
          if (target === 'evidence.bin') appendLine('cat: evidence.bin là tệp nhị phân. Thử: strings evidence.bin', 'terminal-response is-warn');
          else appendLine(fileText[target] || `cat: ${target ? `Không tìm thấy “${target}”.` : 'Nhập tên tệp, ví dụ: cat case.log'}`);
          break;
        case 'sha256sum': {
          const content = target === 'evidence.bin' ? strings : fileText[target];
          if (!content) {
            appendLine(`sha256sum: ${target ? `${target}: Không tìm thấy tệp` : 'thiếu tên tệp. Ví dụ: sha256sum case.log'}`, 'terminal-response is-warn');
            break;
          }
          sha256(content).then(hash => appendLine(`${hash}  ${target}\n[✓] Integrity verified — chain of custody intact.`, 'terminal-response is-ok'));
          break;
        }
        case 'strings':
          appendLine(target === 'evidence.bin' ? strings : 'strings: thử strings evidence.bin', target === 'evidence.bin' ? 'terminal-response' : 'terminal-response is-warn');
          break;
        case 'vol.py':
        case 'vol':
        case 'volatility':
          appendLine(pslist);
          break;
        case 'ledger': {
          if (!ledgerBlocks.length) {
            appendLine('ledger: chuỗi cột mốc đang đồng bộ hoặc nằm ở trang chủ — thử cd roadmap.', 'terminal-response is-warn');
            break;
          }
          const latest = [...ledgerBlocks].sort((a, b) => b.seq - a.seq).slice(0, 5);
          appendLine(`HEIGHT #${String(ledgerBlocks.length).padStart(4, '0')}\n${latest.map(block => `#${String(block.seq).padStart(4, '0')}  ${shortHash(block.hash)}  ${block.title}`).join('\n')}\n[✓] Mọi block đều trỏ đúng prev-hash.`, 'terminal-response is-ok');
          break;
        }
        case 'exit': closeDialog(terminal); break;
        default: appendLine(`Không tìm thấy lệnh “${command}”. Gõ help để xem các lệnh có sẵn.`, 'terminal-response is-warn');
      }
    });
    terminalInput.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        const value = terminalInput.value;
        if (!value || value.includes(' ')) return;
        const match = commands.find(name => name.startsWith(value.toLowerCase()));
        if (match) {
          event.preventDefault();
          terminalInput.value = `${match} `;
        }
        return;
      }
      if ((event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || !history.length) return;
      event.preventDefault();
      if (historyIndex === history.length) historyDraft = terminalInput.value;
      historyIndex = event.key === 'ArrowUp' ? Math.max(0, historyIndex - 1) : Math.min(history.length, historyIndex + 1);
      terminalInput.value = historyIndex === history.length ? historyDraft : history[historyIndex];
      terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
    });
  }

  // ===== Gallery =====
  const gallery = query('#gallery-dialog');
  const galleryImage = query('#gallery-image');
  const galleryCaption = query('#gallery-caption');
  all('[data-image]').forEach(button => button.addEventListener('click', () => {
    if (!gallery || !galleryImage) return;
    let source;
    try { source = new URL(button.dataset.image, document.baseURI); } catch { return; }
    if (!['http:', 'https:', 'file:'].includes(source.protocol)) return;
    const caption = button.dataset.caption || query('img', button)?.alt || 'Hình ảnh từ portfolio';
    galleryImage.src = source.href;
    galleryImage.alt = caption;
    if (galleryCaption) galleryCaption.textContent = caption;
    openDialog(gallery, button);
  }));
  all('.gallery-close').forEach(button => button.addEventListener('click', () => closeDialog(gallery)));
  // ===== Hai nhóm ảnh tự chuyển, giữ data-image đồng bộ với lightbox =====
  const gallerySlideSets = {
    competition: [
      ['images/2.jpg', 'Đồng đội tại cuộc thi CTF'],
      ['images/6.jpg', 'Khoảnh khắc thi đấu Hackathon'],
      ['images/anh1.jpg', 'RMIT Hackathon 2025'],
      ['images/cscv-2026-team.jpg', 'Đội GDU tại CSCV 2026'],
      ['images/cscv-2026-group.jpg', 'CSCV 2026 — đội GDU chụp ảnh cùng thầy'],
      ['images/ctf-team-focus.jpg', 'Tập trung giải thử thách cùng đồng đội']
    ],
    certificates: [
      ['images/CCEP_certificate.jpg', 'CCEP — Certificate of Achievement'],
      ['images/1.jpg', 'Bằng khen CTF'],
      ['images/3.jpg', 'Chứng nhận cuộc thi'],
      ['images/hero_certif.jpg', 'Hero Certification'],
      ['images/cert_cisco.png', 'Chứng chỉ Cisco Networking & Security']
    ]
  };
  all('.gallery-slideshow').forEach((card, groupIndex) => {
    const slides = gallerySlideSets[card.dataset.galleryGroup];
    const frames = all('.gallery-frame', card);
    const counter = query('.gallery-slide-count', card);
    if (!slides || frames.length !== 2) return;
    let current = 0;
    let active = 0;
    let loading = false;
    const advance = () => {
      const bounds = card.getBoundingClientRect();
      const inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (!motionEnabled || !inView || document.hidden || gallery?.open ||
          card.matches(':hover') || card.matches(':focus') || loading) return;
      const next = (current + 1) % slides.length;
      const [source, caption] = slides[next];
      const nextFrame = frames[1 - active];
      loading = true;
      let finished = false;
      const reveal = () => {
        if (finished) return;
        finished = true;
        if (!nextFrame.naturalWidth) { loading = false; return; }
        nextFrame.classList.add('is-visible');
        frames[active].classList.remove('is-visible');
        card.dataset.image = source;
        card.dataset.caption = caption;
        card.setAttribute('aria-label', `Xem ảnh: ${caption}`);
        if (counter) counter.textContent = `${String(next + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        current = next;
        active = 1 - active;
        loading = false;
      };
      nextFrame.onload = reveal;
      nextFrame.onerror = () => { finished = true; loading = false; };
      nextFrame.src = source;
      if (nextFrame.complete) reveal();
    };
    window.setInterval(advance, 4800 + groupIndex * 700);
  });

  // ===== Sao chép Discord từ contact dock =====
  const copyDiscord = query('#copy-discord');
  const contactStatus = query('#contact-status');
  copyDiscord?.addEventListener('click', async () => {
    const handle = copyDiscord.dataset.handle || 'Th4nhH4i';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(handle);
      if (contactStatus) contactStatus.textContent = `Đã sao chép Discord: ${handle}`;
    } catch {
      if (contactStatus) contactStatus.textContent = `Discord: ${handle}`;
    }
  });

  // ===== Đồng hồ giờ Việt Nam =====
  const clocks = all('[data-local-time]');
  if (clocks.length) {
    const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
    const updateClock = () => {
      const now = new Date();
      clocks.forEach(clock => { clock.textContent = clockFormat.format(now); });
    };
    updateClock();
    window.setInterval(updateClock, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateClock(); });
  }

  // ===== Đánh dấu mục đang xem trên menu =====
  const sectionLinks = all('[data-section]').filter(link => document.getElementById(link.dataset.section));
  const sections = [...new Set(sectionLinks.map(link => document.getElementById(link.dataset.section)))];
  if (sections.length) {
    let activeFrame = 0;
    const updateActiveSection = () => {
      activeFrame = 0;
      const guide = Math.min(window.innerHeight * 0.35, 260);
      let active = sections[0];
      sections.forEach(section => {
        if (section.getBoundingClientRect().top <= guide) active = section;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) active = sections[sections.length - 1];
      sectionLinks.forEach(link => {
        const selected = link.dataset.section === active.id;
        link.classList.toggle('is-active', selected);
        link.classList.remove('active');
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const scheduleActiveSection = () => { if (!activeFrame) activeFrame = requestAnimationFrame(updateActiveSection); };
    window.addEventListener('scroll', scheduleActiveSection, { passive: true });
    window.addEventListener('resize', scheduleActiveSection, { passive: true });
    updateActiveSection();
  }

  window.th4nhh4i = {
    sha256,
    shortHash,
    scramble,
    navigate,
    get motionEnabled() { return motionEnabled; }
  };
})();

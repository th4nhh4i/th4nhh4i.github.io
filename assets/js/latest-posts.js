/* Thẻ trượt 6 bài viết mới nhất trên trang chủ.
   Đọc thẳng blog.html nên tự cập nhật khi thêm bài; lỗi mạng/file:// thì giữ nguyên thẻ tĩnh. */
(() => {
  'use strict';

  const card = document.querySelector('[data-post-carousel]');
  if (!card || !window.fetch || !window.DOMParser) return;

  const COUNT = 6;
  const INTERVAL = 5500;
  const blogURL = new URL('blog.html', location.href);
  const motionOff = () => document.documentElement.classList.contains('motion-reduced');
  const pad = number => String(number).padStart(2, '0');
  const formatDate = iso => {
    const [year, month, day] = iso.split('-');
    return year && month && day ? `${day}/${month}/${year}` : iso;
  };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const readPosts = doc => [...doc.querySelectorAll('article.note-card[data-date]')]
    .map(article => {
      const link = article.querySelector('.note-title a');
      if (!link) return null;
      return {
        date: article.dataset.date,
        title: link.textContent.trim(),
        href: new URL(link.getAttribute('href'), blogURL).href,
        external: link.target === '_blank',
        excerpt: article.querySelector('.note-excerpt')?.textContent.trim() || '',
        category: article.querySelector('.note-category')?.textContent.trim() || 'Field Notes',
        tags: [...article.querySelectorAll('.blog-tag-pill')].slice(0, 3).map(tag => tag.textContent.trim()),
        cover: article.querySelector('.note-cover')
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, COUNT);

  // Bìa trong blog là <a>; đổi sang <div> vì cả slide đã là một liên kết (không lồng <a>).
  const buildCover = source => {
    const cover = el('div', source?.className || 'note-cover');
    if (!source) return cover;
    const style = source.getAttribute('style');
    if (style) cover.setAttribute('style', style);
    cover.append(...[...source.childNodes].map(node => document.importNode(node, true)));
    cover.querySelector('.note-cover-meta')?.remove();
    cover.querySelectorAll('img').forEach(img => img.removeAttribute('loading'));
    return cover;
  };

  const build = posts => {
    const viewport = el('div', 'post-carousel-viewport');
    const track = el('div', 'post-carousel-track');
    viewport.append(track);

    const slides = posts.map((post, i) => {
      const slide = el('div', 'post-slide');
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} / ${posts.length}`);

      const link = el('a', 'post-slide-link');
      link.href = post.href;
      if (post.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      const art = el('div', 'post-slide-art');
      const topline = el('div', 'art-topline mono');
      topline.append(el('span', null, 'LATEST FIELD NOTES'), el('span', null, `${pad(i + 1)} / ${pad(posts.length)}`));
      art.append(buildCover(post.cover), topline);

      const body = el('div', 'small-project-body');
      const kicker = el('div', 'project-kicker mono');
      kicker.append(el('span', null, post.category.toUpperCase()), el('span', null, formatDate(post.date)));
      const tags = el('div', 'tags');
      post.tags.forEach(tag => tags.append(el('span', null, tag)));
      body.append(kicker, el('h3', null, post.title), el('p', null, post.excerpt), tags);

      link.append(art, body);
      slide.append(link);
      track.append(slide);
      return slide;
    });

    const controls = el('div', 'post-carousel-controls');
    const dots = el('div', 'post-carousel-dots');
    const dotButtons = posts.map((post, i) => {
      const dot = el('button', 'post-carousel-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Bài ${i + 1}: ${post.title}`);
      dots.append(dot);
      return dot;
    });
    const nav = el('div', 'post-carousel-nav');
    const prev = el('button', 'post-carousel-btn', '‹');
    const next = el('button', 'post-carousel-btn', '›');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', 'Bài trước');
    next.setAttribute('aria-label', 'Bài tiếp theo');
    nav.append(prev, next);
    controls.append(dots, nav);

    card.classList.add('post-carousel');
    card.setAttribute('aria-roledescription', 'carousel');
    card.setAttribute('aria-label', `${posts.length} bài viết mới nhất trong Field Notes`);
    card.replaceChildren(viewport, controls);

    let index = 0;
    let lastMove = Date.now();
    let hovering = false;
    let focused = false;
    let visible = true;

    const go = (target, manual = false) => {
      const keepFocus = track.contains(document.activeElement);
      index = (target + slides.length) % slides.length;
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.inert = !active;
        slide.setAttribute('aria-hidden', String(!active));
      });
      dotButtons.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
      lastMove = Date.now();
      if (manual) viewport.setAttribute('aria-live', 'polite');
      if (keepFocus) slides[index].querySelector('a')?.focus({ preventScroll: true });
    };
    go(0);

    prev.addEventListener('click', () => go(index - 1, true));
    next.addEventListener('click', () => go(index + 1, true));
    dotButtons.forEach((dot, i) => dot.addEventListener('click', () => go(i, true)));
    card.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      go(index + (event.key === 'ArrowRight' ? 1 : -1), true);
    });

    // Tự trượt, nhưng dừng khi người xem đang rê chuột/focus, thẻ khuất màn hình, tab ẩn hoặc tắt hiệu ứng.
    card.addEventListener('pointerenter', () => { hovering = true; });
    card.addEventListener('pointerleave', () => { hovering = false; });
    card.addEventListener('focusin', () => { focused = true; });
    card.addEventListener('focusout', event => { if (!card.contains(event.relatedTarget)) focused = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.35 }).observe(card);
    }
    setInterval(() => {
      if (hovering || focused || !visible || document.hidden || motionOff()) {
        lastMove = Date.now();
      } else if (Date.now() - lastMove >= INTERVAL) {
        go(index + 1);
      }
    }, 400);

    // Vuốt ngang trên màn hình cảm ứng; chặn click sau khi vuốt để không mở nhầm bài.
    let startX = null;
    let startY = 0;
    let swiped = false;
    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      startX = event.clientX;
      startY = event.clientY;
      swiped = false;
    });
    viewport.addEventListener('pointerup', event => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        swiped = true;
        go(index + (dx < 0 ? 1 : -1), true);
      }
    });
    viewport.addEventListener('click', event => {
      if (!swiped) return;
      event.preventDefault();
      swiped = false;
    }, true);
  };

  fetch(blogURL, { credentials: 'same-origin' })
    .then(response => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    .then(html => {
      const posts = readPosts(new DOMParser().parseFromString(html, 'text/html'));
      if (posts.length >= 2) build(posts);
    })
    .catch(() => { /* Giữ nguyên thẻ tĩnh. */ });
})();

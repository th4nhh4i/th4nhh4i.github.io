/* Field Notes — tìm kiếm, lọc, sắp xếp và liên kết sâu (?q=, ?type=, ?tag=) cho blog.html.
   Chạy sau app.js (cả hai đều defer) để dùng chung sha256/shortHash qua window.th4nhh4i. */
(() => {
  'use strict';

  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.note-card')];
  const search = document.getElementById('blogSearch');
  const sort = document.getElementById('blogSort');
  const filters = [...document.querySelectorAll('.blog-filter-btn')];
  const cloud = document.getElementById('tagFiltersCloud');
  const resultCount = document.getElementById('resultCount');
  const empty = document.getElementById('noResults');
  const tagLabel = document.getElementById('selectedTagLabel');
  const tagPicker = document.querySelector('.journal-tag-picker');
  const library = document.getElementById('journal-library');
  const helpers = window.th4nhh4i || {};
  const motionEnabled = () => helpers.motionEnabled ?? !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

  let activeType = 'all';
  let activeTag = 'all';
  const cloudTags = new Map();
  const tagLabels = new Map();

  const metadata = cards.map((card, index) => {
    const cardTags = [...card.querySelectorAll('.blog-tag-pill')].map(pill => {
      const name = pill.textContent.trim();
      const key = normalize(name);
      tagLabels.set(key, name);
      // Thẻ xếp hạng (Top 8, 33/417…) vẫn bấm được nhưng không đưa vào đám mây chủ đề.
      if (!/rank|solved|top\s*\d|\d+\/\d+/i.test(key) && !cloudTags.has(key)) cloudTags.set(key, name);
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('aria-label', `Lọc chủ đề ${name}`);
      const selectTag = event => {
        event.preventDefault();
        event.stopPropagation();
        activeTag = key;
        updateTagButtons();
        filterPosts();
        library?.scrollIntoView({ behavior: motionEnabled() ? 'smooth' : 'auto', block: 'start' });
      };
      pill.addEventListener('click', selectTag);
      pill.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') selectTag(event);
      });
      return key;
    });
    const iso = card.dataset.date || '';
    return {
      card,
      index,
      iso,
      type: card.dataset.type,
      tags: cardTags,
      timestamp: Date.parse(iso) || 0,
      title: card.querySelector('.note-title')?.textContent.trim() || '',
      text: normalize(`${card.textContent} ${card.dataset.tags || ''}`)
    };
  });
  const byCard = new Map(metadata.map(item => [item.card, item]));

  // Số liệu kho lưu trữ
  const counts = metadata.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, { all: metadata.length });
  document.querySelectorAll('[data-count]').forEach(element => {
    element.textContent = String(counts[element.dataset.count] || 0).padStart(2, '0');
  });
  const latest = metadata.reduce((best, item) => (!best || item.timestamp > best.timestamp ? item : best), null);
  document.querySelectorAll('[data-latest]').forEach(element => {
    element.textContent = latest?.card.querySelector('time')?.textContent || '—';
  });
  document.querySelectorAll('[data-tag-count]').forEach(element => {
    element.textContent = `${cloudTags.size} chủ đề`;
  });

  // Mỗi ghi chép mang một dấu SHA-256 như vật chứng đã niêm phong
  if (helpers.sha256) {
    metadata.forEach(item => helpers.sha256(`${item.title}|${item.iso}`).then(hash => {
      const element = item.card.querySelector('.note-hash');
      if (!element) return;
      element.textContent = helpers.shortHash(hash);
      element.title = `sha256: ${hash}`;
    }));
  }

  function addTagButton(key, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-pill-btn';
    button.dataset.tag = key;
    button.textContent = label;
    button.addEventListener('click', () => {
      activeTag = key;
      updateTagButtons();
      filterPosts();
    });
    cloud.append(button);
  }
  addTagButton('all', 'Tất cả chủ đề');
  [...cloudTags].sort((a, b) => a[1].localeCompare(b[1], 'vi')).forEach(([key, name]) => addTagButton(key, name));

  function updateTagButtons() {
    cloud.querySelectorAll('button').forEach(button => {
      const active = button.dataset.tag === activeTag;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    tagLabel.textContent = activeTag === 'all' ? 'Tất cả chủ đề' : tagLabels.get(activeTag) || activeTag;
  }

  function setActiveType(type) {
    activeType = type;
    filters.forEach(filter => {
      const active = filter.dataset.filter === type;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
  }

  function syncURL() {
    try {
      const params = new URLSearchParams(location.search);
      const query = search.value.trim();
      if (query) params.set('q', query);
      else params.delete('q');
      if (activeType !== 'all') params.set('type', activeType);
      else params.delete('type');
      if (activeTag !== 'all') params.set('tag', tagLabels.get(activeTag) || activeTag);
      else params.delete('tag');
      const queryString = params.toString();
      history.replaceState(history.state, '', `${location.pathname}${queryString ? `?${queryString}` : ''}${location.hash}`);
    } catch { /* URL chỉ là tiện ích, không bắt buộc. */ }
  }

  function filterPosts(sync = true) {
    const query = normalize(search.value);
    let visible = 0;
    [...grid.children].forEach(card => {
      const item = byCard.get(card);
      if (!item) return;
      const matches = (!query || item.text.includes(query))
        && (activeType === 'all' || item.type === activeType)
        && (activeTag === 'all' || item.tags.includes(activeTag));
      card.hidden = !matches;
      if (matches) {
        card.style.setProperty('--n', Math.min(visible, 10));
        visible += 1;
      }
    });
    resultCount.textContent = `${visible}${visible !== cards.length ? ` / ${cards.length}` : ''} bài viết`;
    empty.hidden = visible !== 0;
    grid.hidden = visible === 0;
    if (sync) syncURL();
  }

  function sortPosts() {
    [...metadata]
      .sort((a, b) => (sort.value === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp) || a.index - b.index)
      .forEach(item => grid.append(item.card));
  }

  filters.forEach(button => button.addEventListener('click', () => {
    setActiveType(button.dataset.filter);
    filterPosts();
  }));
  search.addEventListener('input', () => filterPosts());
  sort.addEventListener('change', () => {
    sortPosts();
    filterPosts(false);
  });
  document.getElementById('resetFilters')?.addEventListener('click', () => {
    search.value = '';
    activeTag = 'all';
    setActiveType('all');
    updateTagButtons();
    filterPosts();
    search.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
      && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      event.preventDefault();
      search.focus();
    }
  });

  // Liên kết sâu từ trang chủ, ví dụ blog.html?q=forensics
  const params = new URLSearchParams(location.search);
  if (params.get('q')) search.value = params.get('q');
  const typeParam = params.get('type');
  setActiveType(filters.some(filter => filter.dataset.filter === typeParam) ? typeParam : 'all');
  const tagParam = normalize(params.get('tag') || '');
  if (tagParam && tagLabels.has(tagParam)) {
    activeTag = tagParam;
    if (tagPicker) tagPicker.open = true;
  }

  updateTagButtons();
  sortPosts();
  filterPosts(false);
})();

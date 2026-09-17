/* Apply saved colors before paint; mount controls after app.js is ready. */
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'th4nhh4i-appearance-v1';
  const defaults = { palette: 'violet', surface: 'midnight', glow: 'on' };
  const allowed = { palette: ['violet', 'blue', 'amber', 'red'], surface: ['midnight', 'slate', 'black'], glow: ['on', 'off'] };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    for (const key of Object.keys(defaults)) if (allowed[key].includes(saved?.[key])) preferences[key] = saved[key];
  } catch { /* Storage is optional. */ }
  const apply = () => Object.entries(preferences).forEach(([key, value]) => { root.dataset[key] = value; });
  apply();

  document.addEventListener('DOMContentLoaded', () => {
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'appearance-launcher';
    launcher.setAttribute('aria-label', 'Tùy chỉnh giao diện');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'appearance-dialog');
    launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--panel)"/><circle cx="15" cy="17" r="3" fill="var(--panel)"/></svg><span>Giao diện</span>';
    const dialog = document.createElement('dialog');
    dialog.id = 'appearance-dialog';
    dialog.className = 'appearance-dialog';
    dialog.setAttribute('aria-labelledby', 'appearance-title');
    dialog.setAttribute('aria-describedby', 'appearance-description');
    const choice = (name, value, label, colors = []) => `<label class="appearance-choice"><input type="radio" name="${name}" value="${value}"><span>${colors.length ? `<i style="--swatch-a:${colors[0]};--swatch-b:${colors[1]}" aria-hidden="true"></i>` : ''}${label}</span></label>`;
    dialog.innerHTML = `
      <div class="appearance-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2 id="appearance-title">Góc nhìn của bạn.</h2></div><button class="appearance-close" type="button" aria-label="Đóng tùy chỉnh" autofocus>×</button></div>
      <p class="appearance-description" id="appearance-description">Một chút màu sắc, một chút cá tính.<br>Tùy chỉnh được áp dụng ngay trên trang.</p>
      <fieldset><legend>Màu nhấn</legend><div class="appearance-options">
        ${choice('palette', 'violet', 'Purple Team', ['#bda4ff', '#b8f4ce'])}
        ${choice('palette', 'blue', 'Blue Team', ['#4d93ff', '#7fe3f0'])}
        ${choice('palette', 'amber', 'Hổ phách', ['#f5c18d', '#f4df9b'])}
        ${choice('palette', 'red', 'Red Team', ['#ff6b6b', '#ffb08a'])}
      </div></fieldset>
      <fieldset><legend>Sắc độ nền</legend><div class="appearance-options surfaces">
        ${choice('surface', 'midnight', 'Đêm tím')}${choice('surface', 'slate', 'Xanh đá')}${choice('surface', 'black', 'Đen sâu')}
      </div></fieldset>
      <div class="appearance-toggle-row"><div id="glow-label">Ánh sáng nền<small>Quầng sáng và ánh sáng theo con trỏ</small></div><button type="button" role="switch" class="appearance-switch" id="appearance-glow" aria-labelledby="glow-label" aria-checked="true"></button></div>
      <div class="appearance-toggle-row"><div id="motion-label">Chuyển động<small id="appearance-motion-help">Hiệu ứng cuộn, quỹ đạo và chuyển trang</small></div><button type="button" role="switch" class="appearance-switch" id="appearance-motion" aria-labelledby="motion-label" aria-checked="true"></button></div>
      <div class="appearance-footer"><span class="appearance-save-state" role="status">LƯU TRÊN THIẾT BỊ NÀY</span><button class="appearance-reset" type="button">Về mặc định ↺</button></div>`;
    document.body.append(launcher, dialog);
    const glow = dialog.querySelector('#appearance-glow');
    const motion = dialog.querySelector('#appearance-motion');
    const footerMotion = document.querySelector('#motion-toggle');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const status = dialog.querySelector('[role="status"]');
    const sync = () => {
      dialog.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = preferences[input.name] === input.value; });
      glow.setAttribute('aria-checked', String(preferences.glow === 'on'));
      motion.setAttribute('aria-checked', String(!root.classList.contains('motion-reduced') && !reduced.matches));
      motion.disabled = reduced.matches || !footerMotion;
      dialog.querySelector('#appearance-motion-help').textContent = reduced.matches ? 'Đang giảm chuyển động theo cài đặt thiết bị' : 'Hiệu ứng cuộn, quỹ đạo và chuyển trang';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    };
    const save = () => {
      apply();
      sync();
      try { localStorage.setItem(KEY, JSON.stringify(preferences)); status.textContent = 'ĐÃ LƯU TÙY CHỈNH'; }
      catch { status.textContent = 'ÁP DỤNG CHO LẦN XEM NÀY'; }
    };
    launcher.addEventListener('click', () => { sync(); dialog.showModal(); });
    dialog.querySelector('.appearance-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('change', event => {
      const { name, value } = event.target;
      if (!allowed[name]?.includes(value)) return;
      preferences[name] = value;
      save();
    });
    glow.addEventListener('click', () => { preferences.glow = preferences.glow === 'on' ? 'off' : 'on'; save(); });
    motion.addEventListener('click', () => { footerMotion?.click(); sync(); });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    reduced.addEventListener('change', sync);
    dialog.querySelector('.appearance-reset').addEventListener('click', () => {
      preferences = { ...defaults };
      const desiredMotion = !reduced.matches;
      if (footerMotion && !root.classList.contains('motion-reduced') !== desiredMotion) footerMotion.click();
      try { localStorage.removeItem('th4nhh4i-motion'); } catch { /* Storage is optional. */ }
      save();
    });
    sync();

    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    document.querySelectorAll('.id-tag, .featured-project, .small-project, .toolkit-row, .journal-counter').forEach(card => {
      card.classList.add('ambient-card');
      let frame = 0;
      let point;
      card.addEventListener('pointermove', event => {
        if (!finePointer.matches || event.pointerType === 'touch' || reduced.matches || root.classList.contains('motion-reduced') || preferences.glow === 'off') return;
        point = { x: event.clientX, y: event.clientY };
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--light-x', `${(point.x - rect.left) / rect.width * 100}%`);
          card.style.setProperty('--light-y', `${(point.y - rect.top) / rect.height * 100}%`);
          frame = 0;
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); frame = 0; }, { passive: true });
    });
  }, { once: true });
})();

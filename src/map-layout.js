// Lay out the existing milestone cards as a five-row winding map.
(() => {
  const canvas = document.querySelector('#roadmapCanvas');
  const viewport = document.querySelector('#roadmapViewport');
  if (!canvas || !viewport) return;

  const nodes = [...canvas.querySelectorAll('.road-node-item')];
  const svg = canvas.querySelector('.winding-road-svg');
  const width = 3100;
  const height = 2400;
  const perRow = 8;
  const rowGap = 470;
  const firstY = 240;
  const firstX = 270;
  const stepX = 360;
  const points = [];

  nodes.forEach((node, index) => {
    const row = Math.floor(index / perRow);
    const slot = index % perRow;
    const column = row % 2 ? perRow - 1 - slot : slot;
    const x = firstX + column * stepX;
    const y = firstY + row * rowGap + Math.sin(slot * 1.15 + row * .7) * 42;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.classList.toggle('pos-top', row % 2 === 0);
    node.classList.toggle('pos-bottom', row % 2 === 1);
    points.push({ x, y, row });
  });

  const last = points.at(-1);
  const finish = { x: 2800, y: last.y + 22, row: last.row };
  const routePoints = [...points, finish];
  let route = 'M ' + routePoints[0].x + ' ' + routePoints[0].y;
  for (let i = 1; i < routePoints.length; i++) {
    const a = routePoints[i - 1];
    const b = routePoints[i];
    if (a.row === b.row) {
      const dx = b.x - a.x;
      route += ' C ' + (a.x + dx * .34) + ' ' + (a.y - 70) + ', ' + (b.x - dx * .34) + ' ' + (b.y + 70) + ', ' + b.x + ' ' + b.y;
    } else {
      const outside = a.x > width / 2 ? width - 110 : 110;
      route += ' C ' + outside + ' ' + a.y + ', ' + outside + ' ' + b.y + ', ' + b.x + ' ' + b.y;
    }
  }
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.querySelectorAll('path').forEach(track => track.setAttribute('d', route));
  canvas.dataset.mapWidth = String(width);
  canvas.dataset.mapHeight = String(height);

  // The original vertical year gates belong to the linear layout.
  canvas.querySelectorAll('.year-divider-marker').forEach(marker => marker.hidden = true);
  const years = new Set();
  nodes.forEach((node, index) => {
    const year = node.querySelector('.node-date')?.textContent.match(/20\d{2}/)?.[0];
    if (!year || years.has(year)) return;
    years.add(year);
    const { x, y } = points[index];
    const badge = document.createElement('span');
    badge.className = 'map-year-label';
    badge.textContent = year;
    // Place the year label on the clear side of the road, away from cards.
    const cardsAbove = points[index].row % 2 === 0;
    badge.style.left = x + 'px';
    badge.style.top = (y + (cardsAbove ? 65 : -104)) + 'px';
    canvas.querySelector('.road-nodes-container').append(badge);
  });

  const traveler = canvas.querySelector('.road-finish-character');
  if (traveler) {
    traveler.style.left = (finish.x - 65) + 'px';
    traveler.style.top = (finish.y - 169) + 'px';
  }
  const sign = canvas.querySelector('.road-future-end');
  if (sign) {
    sign.style.left = (finish.x - 510) + 'px';
    sign.style.top = (finish.y + 90) + 'px';
  }
})();

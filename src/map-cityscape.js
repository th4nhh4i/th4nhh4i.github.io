// Isometric scenery around the existing winding journey.
(() => {
  const canvas = document.querySelector('#roadmapCanvas');
  if (!canvas || canvas.querySelector('.map-city-layer')) return;

  const width = 3100;
  const height = 2400;
  const colors = ['#ff4b83', '#40c5ef', '#f3ba40', '#24d9bc', '#50b4ff'];
  const escape = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const prism = (x, bottom, w, h, depth, accent, seed) => {
    const roofY = bottom - h;
    const windows = [];
    const cols = Math.max(2, Math.floor(w / 14));
    const rows = Math.max(2, Math.floor((h - 18) / 19));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const lit = (row * 7 + col * 3 + seed) % 5 !== 0;
        windows.push(`<rect x="${x + 9 + col * 13}" y="${roofY + 13 + row * 18}" width="5" height="8" rx="1" fill="${lit ? accent : '#28405b'}" opacity="${lit ? '.78' : '.4'}"/>`);
      }
    }
    return `
      <g class="map-building">
        <path d="M${x + w} ${roofY} l${depth} -${Math.round(depth * .55)} v${h} l-${depth} ${Math.round(depth * .55)}Z" fill="#0a1229" stroke="${accent}" stroke-opacity=".42" stroke-width="2"/>
        <path d="M${x} ${roofY} l${depth} -${Math.round(depth * .55)} h${w} l-${depth} ${Math.round(depth * .55)}Z" fill="#1a3151" stroke="${accent}" stroke-opacity=".7" stroke-width="2"/>
        <rect x="${x}" y="${roofY}" width="${w}" height="${h}" fill="url(#mapFacade)" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>
        <path d="M${x + 3} ${roofY + 3} v${h - 6}" stroke="${accent}" stroke-opacity=".8" stroke-width="2"/>
        ${windows.join('')}
        <path d="M${x + 4} ${bottom - 6} h${w - 8}" stroke="${accent}" stroke-width="3" opacity=".7"/>
      </g>`;
  };

  const tree = (x, bottom, accent, height) => `
    <ellipse cx="${x}" cy="${bottom + 3}" rx="24" ry="8" fill="${accent}" opacity=".18"/>
    <path d="M${x - 5} ${bottom} v-${height * .48} h10 v${height * .48}Z" fill="#173246" stroke="${accent}" stroke-opacity=".5"/>
    <path d="M${x} ${bottom - height} l-32 ${height * .47} h64Z" fill="#103d4c" stroke="${accent}" stroke-width="3"/>
    <path d="M${x} ${bottom - height * .78} l-38 ${height * .48} h76Z" fill="#0c3442" stroke="${accent}" stroke-width="3"/>
    <path d="M${x} ${bottom - height} l13 ${height * .45} M${x} ${bottom - height * .78} l15 ${height * .45}" stroke="${accent}" stroke-opacity=".5" stroke-width="2"/>
    <circle cx="${x}" cy="${bottom - height * .76}" r="3" fill="#baffef"/>`;

  const scenery = (kind, center, groundY, accent, seed) => {
    if (kind === 1) return `
      <path d="M${center - 88} ${groundY - 20} q86 -48 175 0 q-89 41 -175 0Z" fill="#0a3940" stroke="${accent}" stroke-width="3" opacity=".75"/>
      <ellipse cx="${center + 15}" cy="${groundY - 14}" rx="34" ry="11" fill="#177f99" stroke="#72e8f3" stroke-opacity=".7" stroke-width="2"/>
      ${tree(center - 62, groundY - 8, accent, 83 + seed % 18)}
      ${tree(center - 11, groundY - 10, accent, 112)}
      ${tree(center + 74, groundY - 7, accent, 94)}
      <path d="M${center - 30} ${groundY + 3} l24 -12 h45" fill="none" stroke="${accent}" stroke-opacity=".45" stroke-width="3" stroke-dasharray="6 5"/>
      <text x="${center - 85}" y="${groundY + 37}" fill="${accent}" font-size="15" font-family="monospace" letter-spacing="2">REST / GROVE</text>`;
    if (kind === 2) return `
      <path d="M${center - 77} ${groundY} l35 -20 h96 l-35 20Z" fill="#142b45" stroke="${accent}" stroke-width="3"/>
      <path d="M${center - 77} ${groundY} h96 v17 h-96Z" fill="#081729" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>
      <path d="M${center - 12} ${groundY - 16} v-116" stroke="${accent}" stroke-width="7"/>
      <path d="M${center - 52} ${groundY - 130} q42 67 84 0 q-42 17 -84 0Z" fill="#103f51" stroke="${accent}" stroke-width="4"/>
      <path d="M${center - 10} ${groundY - 140} l32 -32" stroke="${accent}" stroke-width="3"/>
      <circle cx="${center + 25}" cy="${groundY - 175}" r="7" fill="${accent}" filter="url(#cityGlow)"/>
      <circle cx="${center - 11}" cy="${groundY - 129}" r="58" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="3" stroke-dasharray="14 10"/>
      <text x="${center - 80}" y="${groundY + 39}" fill="${accent}" font-size="15" font-family="monospace" letter-spacing="2">SIGNAL / RADAR</text>`;
    if (kind === 3) return `
      ${[-74, -13, 48].map((dx, i) => `<g>
        <path d="M${center + dx + 43} ${groundY - 113 + i * 7} l15 -9 v111 l-15 9Z" fill="#071629" stroke="${accent}" stroke-opacity=".6" stroke-width="2"/>
        <rect x="${center + dx}" y="${groundY - 113 + i * 7}" width="43" height="113" rx="3" fill="#0e253b" stroke="${accent}" stroke-width="3"/>
        ${[0, 1, 2, 3, 4].map(j => `<rect x="${center + dx + 7}" y="${groundY - 101 + i * 7 + j * 19}" width="29" height="12" rx="2" fill="#071525" stroke="${accent}" stroke-opacity=".55"/><circle cx="${center + dx + 32}" cy="${groundY - 95 + i * 7 + j * 19}" r="2" fill="${j % 2 ? '#ff597c' : '#7effdf'}"/>`).join('')}
      </g>`).join('')}
      <path d="M${center - 90} ${groundY + 8} q80 29 173 0" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity=".5"/>
      <text x="${center - 77}" y="${groundY + 39}" fill="${accent}" font-size="15" font-family="monospace" letter-spacing="2">FORENSICS / LAB</text>`;
    if (kind === 4) return `
      <ellipse cx="${center}" cy="${groundY - 10}" rx="88" ry="25" fill="#092334" stroke="${accent}" stroke-width="4"/>
      <ellipse cx="${center}" cy="${groundY - 30}" rx="73" ry="20" fill="#102f45" stroke="${accent}" stroke-width="3"/>
      <path d="M${center - 88} ${groundY - 10} v20 q88 41 176 0 v-20" fill="#071728" stroke="${accent}" stroke-opacity=".6" stroke-width="3"/>
      <path d="M${center} ${groundY - 38} v-116" stroke="${accent}" stroke-width="5"/>
      <path d="M${center} ${groundY - 153} l74 13 -33 27 -41 -12Z" fill="#452646" stroke="${accent}" stroke-width="3"/>
      <path d="M${center - 44} ${groundY - 49} l-17 -76 M${center + 44} ${groundY - 49} l17 -76" stroke="${accent}" stroke-opacity=".55" stroke-width="3"/>
      <circle cx="${center}" cy="${groundY - 39}" r="12" fill="${accent}" filter="url(#cityGlow)"/>
      <text x="${center - 60}" y="${groundY + 46}" fill="${accent}" font-size="15" font-family="monospace" letter-spacing="2">CTF / ARENA</text>`;
    return `
      ${prism(center - 87, groundY, 49, 62 + (seed * 11) % 42, 15, accent, seed)}
      ${prism(center - 26, groundY, 64, 100 + (seed * 19) % 45, 19, accent, seed + 1)}
      ${prism(center + 53, groundY, 39, 55 + (seed * 13) % 47, 13, accent, seed + 2)}
      <text x="${center - 78}" y="${groundY + 39}" fill="${accent}" font-size="15" font-family="monospace" letter-spacing="2">CYBER / CITY</text>`;
  };

  const clusters = [];
  for (let row = 0; row < 5; row++) {
    const baseY = 240 + row * 470 + (row % 2 === 0 ? 220 : -86);
    const accent = colors[row];
    for (let slot = 0; slot < 7; slot++) {
      const center = 450 + slot * 360;
      const variation = (slot * 17 + row * 11) % 31;
      const groundY = baseY + variation * .25;
      const seed = row * 7 + slot;
      const kind = (slot + row * 2) % 5;
      clusters.push(`<g class="map-city-block" opacity="${slot % 3 === 0 ? '.9' : '.76'}">
        <ellipse cx="${center + 2}" cy="${groundY + 13}" rx="119" ry="26" fill="${accent}" opacity=".08" filter="url(#cityGlow)"/>
        <path d="M${center - 112} ${groundY + 5} l36 -21 h177 l-36 21Z" fill="#15243d" stroke="${accent}" stroke-opacity=".5" stroke-width="2"/>
        <path d="M${center - 112} ${groundY + 5} h177 v11 h-177Z" fill="#080f23" stroke="${accent}" stroke-opacity=".33" stroke-width="2"/>
        ${scenery(kind, center, groundY, accent, seed)}
        <path d="M${center - 117} ${groundY + 22} h217" stroke="${accent}" stroke-opacity=".27" stroke-width="2" stroke-dasharray="13 10"/>
      </g>`);
    }
  }

  // Four taller landmarks give each year a recognizable place on the map.
  const landmarks = [
    { x: 92, y: 470, label: 'ORIGIN / 2023', accent: colors[0] },
    { x: 2780, y: 535, label: 'EXPLORE / 2024', accent: colors[1] },
    { x: 128, y: 1410, label: 'BUILD / 2025', accent: colors[2] },
    { x: 2770, y: 1640, label: 'DEFEND / 2026', accent: colors[3] }
  ].map((mark, index) => `<g opacity=".86">
    ${prism(mark.x, mark.y, 82, 155 + index * 12, 25, mark.accent, index)}
    <path d="M${mark.x + 41} ${mark.y - 160 - index * 12} v-35" stroke="${mark.accent}" stroke-width="3"/>
    <circle cx="${mark.x + 41}" cy="${mark.y - 199 - index * 12}" r="5" fill="${mark.accent}" filter="url(#cityGlow)"/>
    <text x="${mark.x}" y="${mark.y + 36}" fill="${mark.accent}" font-size="17" font-family="monospace" letter-spacing="2">${escape(mark.label)}</text>
  </g>`).join('');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('map-city-layer');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs>
    <linearGradient id="mapFacade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1d3153"/><stop offset=".55" stop-color="#101a33"/><stop offset="1" stop-color="#080f21"/></linearGradient>
    <filter id="cityGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>${clusters.join('')}${landmarks}`;
  canvas.insertBefore(svg, canvas.firstElementChild);

  const road = canvas.querySelector('.winding-road-svg');
  const main = road?.querySelectorAll('path')[1];
  if (main && !road.querySelector('.road-extrusion')) {
    const side = main.cloneNode();
    side.removeAttribute('filter');
    side.removeAttribute('class');
    side.setAttribute('class', 'road-extrusion');
    side.setAttribute('stroke', '#314a72');
    side.setAttribute('stroke-width', '68');
    side.setAttribute('transform', 'translate(0 16)');
    road.insertBefore(side, road.firstElementChild.nextElementSibling);
  }
})();

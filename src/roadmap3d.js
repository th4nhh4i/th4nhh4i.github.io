import * as THREE from '../vendor/three.module.js';

// An original, explorable cyber journey diorama. The existing cards remain the data source
// and a fallback for browsers without WebGL.
const viewport = document.querySelector('#roadmapViewport');
const source = document.querySelector('#roadmapCanvas');
if (viewport && source) {
  const entries = [...source.querySelectorAll('.road-node-item')].map((node, index) => ({
    index,
    date: node.querySelector('.node-date')?.textContent.trim() || '',
    category: node.querySelector('.card-tag-row span:last-child')?.textContent.trim() || 'MILESTONE',
    title: node.querySelector('h4')?.textContent.trim() || `Cột mốc ${index + 1}`,
    description: node.querySelector('.node-card p')?.textContent.trim() || ''
  }));

  const stage = document.createElement('div');
  stage.className = 'roadmap3d-stage';
  stage.innerHTML = `
    <div class="roadmap3d-head"><span class="roadmap3d-kicker">TH4NHH4I / INTERACTIVE DIORAMA</span><strong>Cyber Journey <em>2023 — 2026</em></strong><span class="roadmap3d-hint">Thu nhỏ: kéo để di chuyển · Phóng to: kéo để xoay · Shift+kéo: di chuyển</span></div>
    <select class="roadmap3d-eventselect" aria-label="Chọn cột mốc hành trình"><option value="">Chọn một cột mốc...</option></select>
    <div class="roadmap3d-yearnav" aria-label="Chọn giai đoạn"><button type="button" data-year="2023">2023</button><button type="button" data-year="2024">2024</button><button type="button" data-year="2025">2025</button><button type="button" data-year="2026">2026</button></div>
    <div class="roadmap3d-actions"><button type="button" data-action="zoom-in" aria-label="Phóng to mô hình">+</button><button type="button" data-action="zoom-out" aria-label="Thu nhỏ mô hình">−</button><button type="button" data-action="overview">Toàn cảnh ↗</button></div>
    <div class="roadmap3d-card" hidden><button class="roadmap3d-card-close" type="button" aria-label="Đóng chi tiết">×</button><span class="roadmap3d-card-meta"></span><h3></h3><p></p><div class="roadmap3d-card-nav"><button type="button" data-step="-1" aria-label="Xem cột mốc trước">← <span>Trước</span></button><small class="roadmap3d-card-count" aria-live="polite"></small><button type="button" data-step="1" aria-label="Xem cột mốc tiếp theo"><span>Tiếp</span> →</button></div></div>
    <div class="roadmap3d-caption">01 / ORIGIN <span>→</span> 39 / NEXT CHAPTER</div>`;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.error('Roadmap 3D renderer unavailable:', error);
    window.roadmap3dStatus = String(error);
    stage.remove();
  }

  if (renderer) {
    viewport.prepend(stage);
    stage.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Sa bàn 3D hành trình Th4nhH4i');
    document.documentElement.classList.add('roadmap3d-active');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d19);
    scene.fog = new THREE.Fog(0x070d19, 85, 145);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180);
    const orbit = { theta: .18, phi: .42, radius: 74, target: new THREE.Vector3(0, 0, 0) };
    const desired = { theta: .18, phi: .42, radius: 74, target: new THREE.Vector3(0, 0, 0) };
    const overview = () => {
      desired.theta = .18;
      desired.phi = .42;
      desired.radius = window.innerWidth < 700 ? 88 : 74;
      desired.target.set(0, 0, 0);
    };
    overview();

    scene.add(new THREE.HemisphereLight(0x9fdaff, 0x101225, 2.4));
    const sunlight = new THREE.DirectionalLight(0xdcefff, 3.0);
    sunlight.position.set(-14, 26, 15);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    // The city is static; keep the first shadow map instead of rebuilding it every frame.
    sunlight.shadow.autoUpdate = false;
    sunlight.shadow.needsUpdate = true;
    sunlight.shadow.camera.left = -30;
    sunlight.shadow.camera.right = 30;
    sunlight.shadow.camera.top = 30;
    sunlight.shadow.camera.bottom = -30;
    sunlight.shadow.bias = -.0003;
    scene.add(sunlight);
    const rim = new THREE.DirectionalLight(0xf052b4, 1.5);
    rim.position.set(18, 13, -17);
    scene.add(rim);

    const materialCache = new Map();
    const mat = (color, metalness = .35, roughness = .55, emissive = 0x000000, emissiveIntensity = 0) => {
      const key = `${color}:${metalness}:${roughness}:${emissive}:${emissiveIntensity}`;
      if (!materialCache.has(key)) materialCache.set(key,
        new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity }));
      return materialCache.get(key);
    };
    const graphite = mat(0x182639, .7, .35);
    const asphalt = mat(0x17242e, .3, .9);
    const edgeMetal = mat(0x33506a, .75, .3);
    const cyan = mat(0x35f5e3, .12, .23, 0x03b6ae, 1.5);
    const rose = mat(0xff5f91, .2, .27, 0xa81855, 1.1);
    const gold = mat(0xffc978, .3, .29, 0x75440a, 1);
    const glass = mat(0x315b7c, .15, .15, 0x123956, .25);
    const foliage = mat(0x0d725f, .06, .75);
    const sand = mat(0x254052, .1, .9);
    const parkGreen = mat(0x145842, .04, .88);
    const pathStone = mat(0x8d9a9d, .08, .9);
    const water = mat(0x0b4964, .42, .22, 0x06475c, .28);
    const marketRoof = mat(0xb85a55, .18, .75);
    const streetAsphalt = mat(0x263a44, .12, .94);
    const accentMats = [rose, cyan, gold, cyan, rose, gold, cyan];

    const staticMeshes = [];
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const cylinderCache = new Map();
    const coneCache = new Map();
    const crownCache = new Map();
    const box = (parent, w, h, d, x, y, z, material, shadow = true) => {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      mesh.castShadow = shadow && h > .35 && w > .3 && d > .3;
      mesh.receiveShadow = true;
      parent.add(mesh);
      staticMeshes.push(mesh);
      return mesh;
    };
    const cylinder = (parent, rt, rb, h, x, y, z, material, sides = 12) => {
      const key = `${rt}:${rb}:${h}:${sides}`;
      if (!cylinderCache.has(key)) cylinderCache.set(key, new THREE.CylinderGeometry(rt, rb, h, sides));
      const mesh = new THREE.Mesh(cylinderCache.get(key), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = h > .4;
      mesh.receiveShadow = true;
      parent.add(mesh);
      staticMeshes.push(mesh);
      return mesh;
    };

    // A substantial museum-like plinth makes the scene read as a physical miniature.
    box(scene, 44.3, 1.4, 45.4, 0, -1.05, 0, mat(0x0a1524, .8, .28));
    box(scene, 43.7, .18, 44.8, 0, -.27, 0, graphite);
    box(scene, 44.5, .1, 45.6, 0, -1.79, 0, cyan, false);
    for (const z of [-22.38, 22.38]) box(scene, 43.6, .08, .07, 0, -.13, z, cyan, false);
    for (const x of [-21.82, 21.82]) box(scene, .07, .08, 44.7, x, -.13, 0, rose, false);
    const grid = new THREE.GridHelper(42, 42, 0x376379, 0x234253);
    grid.position.y = -.165;
    grid.material.transparent = true;
    grid.material.opacity = .27;
    scene.add(grid);

    const columns = 5;
    const rows = Math.ceil(entries.length / columns);
    const columnGap = 7.2;
    const rowGap = 5.6;
    const mapPoint = index => {
      const row = Math.floor(index / columns);
      const slot = index % columns;
      const col = row % 2 ? columns - 1 - slot : slot;
      const x = (col - (columns - 1) / 2) * columnGap + Math.sin(index * 1.91) * 1.02;
      const z = (row - (rows - 1) / 2) * rowGap +
        Math.sin(slot * 1.4 + row * 1.17) * 1.52 + (col - 2) * Math.sin(row * 1.8) * .24;
      return new THREE.Vector3(x, .35, z);
    };
    const milestones = entries.map((_, i) => mapPoint(i));
    const finishDirection = Math.floor((entries.length - 1) / columns) % 2 ? -1 : 1;
    const finish = new THREE.Vector3(milestones.at(-1).x + finishDirection * 4.1, .35, milestones.at(-1).z + .25);
    // The journey street returns along the western edge, so it remains a real loop.
    const westernReturn = [
      [-17.2, 20.4], [-18.2, 13.3], [-17.4, 5.7],
      [-18.2, -2.8], [-17.3, -11.2], [-17.7, -18.8]
    ].map(([x, z]) => new THREE.Vector3(x, .35, z));
    const route = new THREE.CatmullRomCurve3([...milestones, finish, ...westernReturn], true, 'centripetal', .55);
    const routeCount = 1400;
    const ribbon = (width, y, material, offset = 0, roadCurve = route, samples = routeCount) => {
      const positions = [];
      const indices = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = roadCurve.getPointAt(t);
        const tangent = roadCurve.getTangentAt(t);
        const nx = -tangent.z;
        const nz = tangent.x;
        for (const sign of [-1, 1]) positions.push(p.x + nx * (offset + sign * width / 2), y, p.z + nz * (offset + sign * width / 2));
        if (i < samples) {
          const n = i * 2;
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    ribbon(1.31, .13, edgeMetal);
    ribbon(1.08, .22, asphalt);
    ribbon(.045, .235, cyan, -.54);
    ribbon(.045, .235, rose, .54);
    // Each connector begins and ends on the main street at a milestone junction.
    const connectorSpecs = [
      { from: 1, to: 8, bend: -1.15 },
      { from: 3, to: 13, bend: 1.25 },
      { from: 6, to: 17, bend: -.95 },
      { from: 12, to: 22, via: [-.8, .15] },
      { from: 18, to: 27, bend: 1.45 },
      { from: 23, to: 33, bend: -1.15 },
      { from: 28, to: 37, bend: 1.25 }
    ];
    const sideStreetCurves = [];
    for (const spec of connectorSpecs) {
      const start = milestones[spec.from].clone();
      const end = milestones[spec.to].clone();
      const midpoint = spec.via
        ? new THREE.Vector3(spec.via[0], .35, spec.via[1])
        : start.clone().lerp(end, .5).add(new THREE.Vector3(
          -(end.z - start.z) / start.distanceTo(end) * spec.bend, 0,
          (end.x - start.x) / start.distanceTo(end) * spec.bend));
      const street = new THREE.CatmullRomCurve3([start, midpoint, end], false, 'centripetal', .5);
      sideStreetCurves.push(street);
      ribbon(.88, .145, edgeMetal, 0, street, 180);
      ribbon(.73, .225, streetAsphalt, 0, street, 180);
      ribbon(.022, .238, pathStone, 0, street, 180);
    }
    // A compact roundabout breaks the block grid near the centre of the city.
    cylinder(scene, 1.43, 1.43, .055, -.8, .18, .15, streetAsphalt, 32);
    const circleLane = new THREE.Mesh(new THREE.TorusGeometry(1.16, .025, 6, 48), pathStone);
    circleLane.rotation.x = Math.PI / 2;
    circleLane.position.set(-.8, .215, .15);
    scene.add(circleLane);
    cylinder(scene, .57, .57, .075, -.8, .255, .15, parkGreen, 24);
    cylinder(scene, .055, .075, .45, -.8, .48, .15, edgeMetal, 8);
    const circleTree = new THREE.Mesh(new THREE.IcosahedronGeometry(.38, 1), parkGreen);
    circleTree.position.set(-.8, .92, .15);
    scene.add(circleTree);
    // A sweeping Saigon River inspired waterfront softens the city's eastern edge.
    const river = new THREE.CatmullRomCurve3([
      [19.4, -22.3], [18.1, -16], [19.7, -9.2], [18.2, -2.5],
      [19.8, 4.1], [18, 10.6], [19.2, 17.1], [18.1, 22.3]
    ].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    ribbon(2.6, -.045, water, 0, river, 240);
    ribbon(.085, -.033, cyan, -1.28, river, 240);
    ribbon(.085, -.033, cyan, 1.28, river, 240);
    ribbon(.025, -.027, pathStone, -.38, river, 240);
    ribbon(.025, -.027, pathStone, .52, river, 240);
    // Two bridges and the opposite bank form another complete walkable loop.
    const bridgeLevels = [-3.1, 14.1];
    for (const z of bridgeLevels) {
      box(scene, 6.8, .17, 1.25, 17.7, .17, z, streetAsphalt);
      for (const edgeZ of [z - .66, z + .66]) box(scene, 6.8, .07, .055, 17.7, .31, edgeZ, cyan, false);
      for (const x of [15.3, 19.5]) cylinder(scene, .09, .12, .55, x, -.02, z, edgeMetal, 8);
    }
    const riversideWalk = new THREE.CatmullRomCurve3([
      new THREE.Vector3(21.1, .35, bridgeLevels[0]),
      new THREE.Vector3(21.08, .35, 2),
      new THREE.Vector3(21.12, .35, 8),
      new THREE.Vector3(21.1, .35, bridgeLevels[1])
    ]);
    ribbon(.66, .23, pathStone, 0, riversideWalk, 140);
    for (const offset of [-.34, .34]) ribbon(.035, .245, cyan, offset, riversideWalk, 140);
    const dashMaterial = new THREE.LineDashedMaterial({ color: 0xb2fdf3, dashSize: .33, gapSize: .29, transparent: true, opacity: .9 });
    const dashPoints = [];
    for (let i = 0; i <= 650; i++) {
      const p = route.getPointAt(i / 650);
      dashPoints.push(new THREE.Vector3(p.x, .242, p.z));
    }
    const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dashPoints), dashMaterial);
    dash.computeLineDistances();
    scene.add(dash);

    // Road supports and low safety rails keep the ribbon visibly above the terrain.
    for (let i = 0; i < 48; i++) {
      const p = route.getPointAt(i / 47);
      cylinder(scene, .17, .24, .48, p.x, -.09, p.z, mat(0x22384c, .65, .45), 10);
    }

    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x84e7fb });
    const warmWindow = new THREE.MeshBasicMaterial({ color: 0xffc477 });
    const building = (parent, x, z, width, height, depth, accent, seed) => {
      box(parent, width, height, depth, x, height / 2 - .1, z, mat(0x25394b, .42, .57));
      box(parent, width + .07, .08, depth + .07, x, height - .06, z, accent);
      box(parent, width * .65, .16, depth * .65, x, height + .05, z, mat(0x5f7589, .6, .4));
      for (let floor = 0; floor < Math.floor(height / .42); floor++) {
        for (let col = 0; col < Math.max(2, Math.floor(width / .34)); col++) {
          const wx = x - width / 2 + .17 + col * .34;
          const wy = .35 + floor * .42;
          box(parent, .16, .19, .02, wx, wy, z + depth / 2 + .017, (floor + col + seed) % 4 ? windowMaterial : warmWindow, false);
        }
      }
      box(parent, .08, height + .12, .08, x + width / 2, height / 2, z + depth / 2, accent, false);
    };
    const tree = (parent, x, z, scale = 1) => {
      cylinder(parent, .065 * scale, .09 * scale, .55 * scale, x, .27 * scale, z, mat(0x66554d, .05, .95), 8);
      for (let level = 0; level < 3; level++) {
        if (!coneCache.has(level)) coneCache.set(level, new THREE.ConeGeometry(.38 - level * .07, .72, 7));
        const cone = new THREE.Mesh(coneCache.get(level), foliage);
        cone.position.set(x, (.65 + level * .31) * scale, z);
        cone.scale.setScalar(scale);
        cone.castShadow = true;
        parent.add(cone);
        staticMeshes.push(cone);
      }
      const light = new THREE.Mesh(new THREE.SphereGeometry(.055 * scale, 6, 6), cyan);
      light.position.set(x, 1.42 * scale, z);
      parent.add(light);
    };
    const antenna = (parent, x, z, accent) => {
      cylinder(parent, .32, .45, .14, x, .04, z, graphite);
      cylinder(parent, .055, .08, 1.6, x, .89, z, edgeMetal);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(.54, 18, 8, 0, Math.PI * 2, 0, Math.PI * .45), accent);
      dish.rotation.z = .48;
      dish.position.set(x, 1.65, z);
      parent.add(dish);
      cylinder(parent, .06, .06, .5, x + .28, 1.95, z, cyan);
    };
    const server = (parent, x, z, accent) => {
      box(parent, 1.7, .18, 1.25, x, .02, z, edgeMetal);
      for (let j = 0; j < 3; j++) {
        const px = x + (j - 1) * .46;
        box(parent, .38, 1.25, .65, px, .7, z, graphite);
        for (let k = 0; k < 4; k++) box(parent, .25, .035, .01, px, .32 + k * .24, z + .33, k === 0 ? accent : cyan, false);
      }
    };
    const arena = (parent, x, z, accent) => {
      cylinder(parent, 1.1, 1.25, .36, x, .03, z, graphite, 12);
      cylinder(parent, .75, .9, .12, x, .27, z, accent, 12);
      cylinder(parent, .05, .05, 1.55, x, 1.03, z, edgeMetal);
      const flag = box(parent, .62, .35, .04, x + .32, 1.7, z, accent, false);
      flag.rotation.y = .2;
      for (let j = 0; j < 6; j++) {
        const a = j / 6 * Math.PI * 2;
        cylinder(parent, .055, .09, .7, x + Math.cos(a) * .95, .5, z + Math.sin(a) * .95, cyan, 8);
      }
    };
    const shadeTree = (parent, x, z, scale = 1) => {
      cylinder(parent, .07 * scale, .11 * scale, .7 * scale, x, .3 * scale, z, edgeMetal, 8);
      for (const [dx, dz, size] of [[0, 0, .43], [-.28, .1, .32], [.26, -.12, .34]]) {
        if (!crownCache.has(size)) crownCache.set(size, new THREE.IcosahedronGeometry(size, 1));
        const crown = new THREE.Mesh(crownCache.get(size), parkGreen);
        crown.position.set(x + dx * scale, 1.02 * scale, z + dz * scale);
        crown.scale.setScalar(scale);
        crown.castShadow = true;
        parent.add(crown);
        staticMeshes.push(crown);
      }
    };
    const park = (parent, x, z, seed) => {
      box(parent, 4.1, .09, 3.45, x, -.1, z, parkGreen);
      box(parent, 3.9, .015, .25, x, -.045, z, pathStone, false);
      box(parent, .24, .015, 3.2, x, -.043, z, pathStone, false);
      const pondX = x + (seed % 2 ? .92 : -.92);
      cylinder(parent, .51, .51, .055, pondX, -.015, z + .8, water, 16);
      cylinder(parent, .1, .12, .17, pondX, .08, z + .8, cyan, 10);
      for (const [dx, dz] of [[-1.55,-1.18],[-.6,-1.22],[1.37,-1.15],[-1.55,1.2],[.15,1.22],[1.44,1.18]])
        shadeTree(parent, x + dx, z + dz, .65 + ((seed + Math.abs(dx) * 3) % 3) * .08);
      for (const dx of [-.75, .8]) box(parent, .65, .12, .16, x + dx, .07, z - .46, marketRoof);
    };
    const market = (parent, x, z, seed) => {
      box(parent, 3.25, .09, 2.55, x, -.08, z, pathStone);
      box(parent, 2.65, .72, 1.72, x, .37, z, mat(0x9caaae, .18, .82));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.57, .7, 4), marketRoof);
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = .72;
      roof.position.set(x, 1.09, z);
      roof.castShadow = true;
      parent.add(roof);
      box(parent, .57, 1.15, .57, x, 1.39, z + .63, marketRoof);
      cylinder(parent, .29, .29, .025, x, 1.61, z + .94, pathStone, 16);
      for (const dx of [-1.05, 0, 1.05]) box(parent, .52, .18, .48, x + dx, .04, z + 1.31, seed % 2 ? rose : gold);
    };
    const tower = (parent, x, z, seed) => {
      box(parent, 3.1, .1, 2.75, x, -.08, z, pathStone);
      box(parent, 1.15, 3.05 + seed * .18, 1.03, x, 1.45, z, glass);
      box(parent, .86, 1.2, .85, x + .08, 3.35 + seed * .18, z, graphite);
      box(parent, .56, .83, .57, x + .16, 4.28 + seed * .18, z, glass);
      cylinder(parent, .04, .04, .9, x + .16, 5.05 + seed * .18, z, cyan);
      for (const side of [-.44, .44]) box(parent, .055, 3.2, .04, x + side, 1.5, z + .54, cyan, false);
      shadeTree(parent, x - 1.04, z + .95, .6);
    };
    const plaza = (parent, x, z) => {
      box(parent, 3.7, .09, 3.2, x, -.1, z, pathStone);
      cylinder(parent, .8, .8, .13, x, .03, z, edgeMetal, 24);
      cylinder(parent, .62, .62, .04, x, .115, z, water, 24);
      cylinder(parent, .055, .055, .68, x, .49, z, cyan, 10);
      for (const [dx, dz] of [[-1.36,-1.05],[1.36,-1.05],[-1.36,1.05],[1.36,1.05]])
        shadeTree(parent, x + dx, z + dz, .52);
    };

    // Irregular parcels keep the districts from forming two identical rows.
    const reservedSites = [];
    const routeSamples = route.getSpacedPoints(350);
    const connectorSamples = sideStreetCurves.flatMap(curve => curve.getSpacedPoints(60));
    const random = seed => {
      const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    const siteIsFree = (x, z, radius) =>
      Math.abs(x) < 17.3 && Math.abs(z) < 20.8 &&
      !routeSamples.some(p => (x - p.x) ** 2 + (z - p.z) ** 2 < (radius + .72) ** 2) &&
      !connectorSamples.some(p => (x - p.x) ** 2 + (z - p.z) ** 2 < (radius + .3) ** 2) &&
      !reservedSites.some(site => (x - site.x) ** 2 + (z - site.z) ** 2 < ((radius + site.radius) * .82) ** 2);
    for (let row = 0; row < rows; row++) {
      const zRoad = (row - (rows - 1) / 2) * rowGap;
      for (let col = 0; col < columns - 1; col++) {
        const seed = row * 17 + col * 31;
        const baseX = (col - (columns - 2) / 2) * columnGap;
        const preferredSide = random(seed + 1) > .5 ? 1 : -1;
        const kind = Math.floor(random(seed + 9) * 7);
        const radius = kind === 1 ? 2.35 : 1.88;
        const candidates = [preferredSide, -preferredSide].flatMap(side => [
          { x: baseX + (random(seed + side * 3 + 4) - .5) * 2.3,
            z: zRoad + side * (2.65 + random(seed + side * 7 + 5) * .52) },
          { x: baseX + (random(seed + side * 11 + 6) - .5) * 2.9,
            z: zRoad + side * 3.42 }
        ]);
        const site = candidates.find(candidate => siteIsFree(candidate.x, candidate.z, radius));
        if (!site) continue;
        const { x, z } = site;
        const group = new THREE.Group();
        scene.add(group);
        reservedSites.push({ x, z, radius });
        box(group, 2.5 + random(seed + 14) * .8, .14, 2.12 + random(seed + 15) * .4, x, -.1, z, sand);
        box(group, 2.45, .03, 2.05, x, -.015, z, mat(0x1b3243, .3, .8));
        const accent = accentMats[row];
        if (kind === 0) {
          building(group, x - .55, z, .75, 1.4 + random(seed + 21) * 1.3, .8, accent, col);
          building(group, x + .53, z + .16, .65, 1.6 + random(seed + 22) * 1.4, .9, accent, row);
          tree(group, x + 1.12, z - .7, .55);
        } else if (kind === 1) {
          park(group, x, z, row + col);
        } else if (kind === 2) {
          antenna(group, x, z, accent);
          box(group, .56, .48, .45, x - .9, .3, z + .45, graphite);
          cylinder(group, .09, .09, 2.2, x + .9, 1.05, z - .5, edgeMetal);
          cylinder(group, .15, .15, .18, x + .9, 2.23, z - .5, rose);
        } else if (kind === 3) {
          market(group, x, z, row + col);
        } else if (kind === 4) {
          arena(group, x, z, accent);
          tree(group, x - 1.03, z + .56, .55);
        } else if (kind === 5) {
          tower(group, x, z, Math.floor(random(seed + 23) * 3));
        } else {
          plaza(group, x, z);
        }
      }
    }

    // Smaller shop clusters occupy staggered plots rather than a second uniform row.
    for (let row = 0; row < rows; row++) {
      const zRoad = (row - (rows - 1) / 2) * rowGap;
      for (let parcel = 0; parcel < 4; parcel++) {
        const seed = row * 47 + parcel * 19 + 201;
        if (random(seed) < .32) continue;
        const side = random(seed + 1) > .5 ? 1 : -1;
        const x = -13.3 + parcel * 8.8 + (random(seed + 2) - .5) * 2.6;
        const z = zRoad + side * (2.5 + random(seed + 3) * .9);
        if (!siteIsFree(x, z, 1.58)) continue;
        const block = new THREE.Group();
        block.position.set(x, 0, z);
        block.rotation.y = (random(seed + 4) - .5) * .38;
        scene.add(block);
        reservedSites.push({ x, z, radius: 1.58 });
        const shopCount = random(seed + 5) > .43 ? 3 : 2;
        box(block, shopCount * .95 + .34, .12, 2.1, 0, -.11, 0, sand);
        for (let shop = 0; shop < shopCount; shop++) {
          const sx = (shop - (shopCount - 1) / 2) * .9;
          const h = .95 + random(seed + 11 + shop) * 1.55;
          building(block, sx, 0, .72 + random(seed + 21 + shop) * .14, h, .8,
            shop % 2 ? accentMats[row] : cyan, row + shop);
          box(block, .76, .08, .38, sx, .55, .55, random(seed + 31 + shop) > .5 ? marketRoof : gold, false);
        }
        if (random(seed + 6) > .38) shadeTree(block, shopCount * .48 + .38, -.7, .5);
      }
    }

    // Irregular low-rise infill gives each district the texture of real streets.
    const streetSamples = [...routeSamples, ...connectorSamples];
    const districtColors = [
      mat(0x304656, .2, .7), mat(0x3d5360, .15, .76),
      mat(0x69545a, .12, .82), mat(0x435667, .16, .7)
    ];
    const infillSites = [];
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 16; col++) {
        const seed = row * 71 + col * 23 + 907;
        const noise = random(seed);
        const density = .24 + .16 * Math.sin(row * .7 + col * .38);
        if (noise < density) continue;
        const px = -18.2 + col * 2.23 + (row % 2) * .83 + (random(seed + 1) - .5) * 1.12;
        const pz = -20.1 + row * 2.37 + (random(seed + 2) - .5) * 1.04;
        if (Math.abs(px) > 18.2 || Math.abs(pz) > 20.7) continue;
        if (reservedSites.some(site => (px - site.x) ** 2 + (pz - site.z) ** 2 < site.radius ** 2)) continue;
        if (streetSamples.some(p => (px - p.x) ** 2 + (pz - p.z) ** 2 < 1.28 ** 2)) continue;
        if ((px - (18.8 + Math.sin(pz * .42) * .8)) ** 2 < 3.4 ** 2) continue;
        if (infillSites.some(site => (px - site.x) ** 2 + (pz - site.z) ** 2 < 1.78 ** 2)) continue;
        infillSites.push({ x: px, z: pz });
        const lot = new THREE.Group();
        lot.position.set(px, 0, pz);
        lot.rotation.y = (random(seed + 3) - .5) * .4;
        scene.add(lot);
        const height = .65 + random(seed + 4) * 2.18;
        const width = .84 + random(seed + 5) * .58;
        const depth = .82 + random(seed + 6) * .48;
        box(lot, 1.5 + random(seed + 7) * .36, .07, 1.5 + random(seed + 8) * .36, 0, -.105, 0, sand);
        box(lot, width, height, depth, 0, height / 2 - .09, 0, districtColors[Math.floor(random(seed + 9) * districtColors.length)]);
        box(lot, width + .12, .07, depth + .12, 0, height - .06, 0, random(seed + 10) > .68 ? marketRoof : edgeMetal);
        for (const dx of [-.24, .24]) box(lot, .16, .22, .025, dx, height * .58, depth / 2 + .02, warmWindow, false);
        if (random(seed + 12) > .73) shadeTree(lot, .71, -.66, .38);
      }
    }

    // Quays, little boats, and pocket gardens give the waterfront its own rhythm.
    for (let i = 0; i < 7; i++) {
      const z = -18.2 + i * 5.8;
      const x = 16.7 + Math.sin(i * 1.4) * .5;
      box(scene, 1.7, .08, 1.4, x, -.075, z, pathStone);
      shadeTree(scene, x - .55, z - .43, .56);
      cylinder(scene, .045, .045, .82, x + .52, .33, z + .35, edgeMetal, 8);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 8), gold);
      lamp.position.set(x + .52, .79, z + .35);
      scene.add(lamp);
      if (i % 2 === 0) {
        const boatX = 19.1 + Math.sin(i) * .42;
        const boat = new THREE.Group();
        scene.add(boat);
        box(boat, .58, .12, 1.35, boatX, .01, z + 1.1, graphite);
        box(boat, .42, .24, .5, boatX, .2, z + 1.1, pathStone);
        cylinder(boat, .025, .025, .65, boatX, .53, z + 1.1, cyan, 8);
      }
    }

    // Larger named hubs mark the changes of year, like anchor pieces on a model.
    const hubIndices = [];
    for (const year of ['2023', '2024', '2025', '2026']) {
      const index = entries.findIndex(entry => entry.date.includes(year));
      if (index >= 0) hubIndices.push({ year, index });
    }
    // Each year lights only its part of the journey street, from its first
    // milestone to the next year's first milestone (or the finish in 2026).
    const yearColors = { 2023: 0x63f8e9, 2024: 0xff72ab, 2025: 0xffd978, 2026: 0x76baff };
    const yearHighlights = new Map();
    const routePointCount = route.points.length;
    const yearRibbon = (start, end, width, height, color, opacity) => {
      const samples = Math.max(24, (end - start) * 40);
      const positions = [];
      const indices = [];
      for (let i = 0; i <= samples; i++) {
        const t = (start + (end - start) * i / samples) / routePointCount;
        const point = route.getPoint(t);
        const tangent = route.getTangent(t);
        const nx = -tangent.z;
        const nz = tangent.x;
        for (const sign of [-1, 1]) {
          positions.push(point.x + nx * sign * width / 2, height, point.z + nz * sign * width / 2);
        }
        if (i < samples) {
          const n = i * 2;
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
      }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      return mesh;
    };
    hubIndices.forEach(({ year, index }, position) => {
      const end = hubIndices[position + 1]?.index ?? milestones.length;
      const color = yearColors[year];
      yearHighlights.set(year, [
        yearRibbon(index, end, 1.38, .244, color, .27),
        yearRibbon(index, end, .94, .253, color, .69),
        yearRibbon(index, end, .075, .263, 0xffffff, .95)
      ]);
    });
    const setYearHighlight = year => {
      for (const [candidate, meshes] of yearHighlights) {
        meshes.forEach(mesh => { mesh.visible = candidate === year; });
      }
      stage.dataset.activeYear = year || '';
      stage.querySelectorAll('[data-year]').forEach(button => {
        const selected = button.dataset.year === year;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    };
    const clickTargets = [];
    const markerGroups = [];
    entries.forEach((entry, index) => {
      const p = milestones[index];
      const row = Math.floor(index / columns);
      const accent = accentMats[row];
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);
      scene.add(group);
      cylinder(group, .27, .37, .25, 0, .28, 0, graphite, 12);
      cylinder(group, .2, .22, .07, 0, .43, 0, accent, 12);
      const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 1), accent);
      sphere.position.y = .69;
      sphere.userData.index = index;
      group.add(sphere);
      clickTargets.push(sphere);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.37, .023, 6, 24), cyan);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = .49;
      group.add(ring);
      markerGroups.push({ sphere, ring, phase: index * .62 });
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'roadmap3d-milestone';
      label.setAttribute('aria-label', `Xem cột mốc ${index + 1}: ${entry.title}`);
      label.innerHTML = `<span class="roadmap3d-milestone-number">${String(index + 1).padStart(2, '0')}</span><span class="roadmap3d-milestone-title"></span>`;
      label.querySelector('.roadmap3d-milestone-title').textContent = entry.title;
      label.addEventListener('click', () => focus(index));
      stage.append(label);
      // Stable small offsets keep nearby names from lining up like another street.
      const labelSpread = entry.title.length > 25 ? 30 : 52;
      markerGroups.push({
        label,
        anchor: new THREE.Vector3(p.x, 1.35, p.z),
        offsetX: (random(index * 43 + 301) - .5) * labelSpread,
        offsetY: (random(index * 59 + 607) - .5) * 34 - (index === 7 ? 12 : 0) + (index === 33 ? 22 : 0),
        index
      });
    });
    for (const { year, index } of hubIndices) {
      const p = milestones[index];
      const sign = new THREE.Group();
      sign.position.set(p.x, 0, p.z + (Math.floor(index / columns) % 2 ? -1.1 : 1.1));
      scene.add(sign);
      cylinder(sign, .055, .08, 1.35, 0, .68, 0, edgeMetal);
      box(sign, 1.45, .48, .1, 0, 1.4, 0, graphite);
      const label = stage.querySelectorAll('.roadmap3d-milestone')[index];
      label.querySelector('.roadmap3d-milestone-number').textContent = year;
    }

    // A distinct little explorer at the end of the route.
    const explorer = new THREE.Group();
    explorer.position.set(finish.x, 0, finish.z);
    scene.add(explorer);
    cylinder(explorer, .37, .45, .15, 0, .22, 0, cyan);
    box(explorer, .34, .69, .24, 0, .7, 0, mat(0x2463a0, .25, .45));
    cylinder(explorer, .2, .2, .31, 0, 1.22, 0, mat(0x366490, .3, .4), 12);
    box(explorer, .32, .1, .08, 0, 1.25, .17, cyan, false);
    for (const dx of [-.11, .11]) box(explorer, .09, .46, .1, dx, .22, 0, edgeMetal);

    // All scenery is fixed. Reuse geometry and draw equal material/geometry pairs
    // as one InstancedMesh; only the milestone markers remain individual objects.
    scene.updateMatrixWorld(true);
    const batches = new Map();
    for (const mesh of staticMeshes) {
      const key = `${mesh.geometry.uuid}:${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(mesh);
    }
    let batchedCount = 0;
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const sample = meshes[0];
      const batch = new THREE.InstancedMesh(sample.geometry, sample.material, meshes.length);
      batch.castShadow = sample.castShadow;
      batch.receiveShadow = sample.receiveShadow;
      batch.frustumCulled = false;
      meshes.forEach((mesh, index) => {
        batch.setMatrixAt(index, mesh.matrixWorld);
        mesh.parent.remove(mesh);
      });
      batch.instanceMatrix.needsUpdate = true;
      scene.add(batch);
      batchedCount += meshes.length;
    }
    window.roadmap3dStats = { batchedObjects: batchedCount, batchCount: [...batches.values()].filter(items => items.length > 1).length };

    const card = stage.querySelector('.roadmap3d-card');
    const eventSelect = stage.querySelector('.roadmap3d-eventselect');
    let activeIndex = -1;
    const focus = index => {
      const entry = entries[index];
      const p = milestones[index];
      if (!entry || !p) return;
      setYearHighlight(null);
      activeIndex = index;
      stage.querySelectorAll('.roadmap3d-milestone').forEach((label, labelIndex) => {
        label.classList.toggle('is-active', labelIndex === index);
      });
      desired.target.set(p.x, .5, p.z);
      desired.radius = 21;
      desired.phi = .76;
      eventSelect.value = String(index);
      card.hidden = false;
      card.querySelector('.roadmap3d-card-meta').textContent = `${String(index + 1).padStart(2, '0')} / ${entry.date} · ${entry.category}`;
      card.querySelector('h3').textContent = entry.title;
      card.querySelector('p').textContent = entry.description;
      card.querySelector('.roadmap3d-card-count').textContent = `${index + 1} / ${entries.length}`;
      card.querySelector('[data-step="-1"]').disabled = index === 0;
      card.querySelector('[data-step="1"]').disabled = index === entries.length - 1;
    };
    stage.querySelector('.roadmap3d-card-close').addEventListener('click', () => { card.hidden = true; activeIndex = -1; eventSelect.value = ''; stage.querySelector('.roadmap3d-milestone.is-active')?.classList.remove('is-active'); });
    card.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => focus(activeIndex + Number(button.dataset.step))));
    entries.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${String(index + 1).padStart(2, '0')} · ${entry.title}`;
      eventSelect.append(option);
    });
    eventSelect.addEventListener('change', () => { if (eventSelect.value !== '') focus(Number(eventSelect.value)); });
    stage.querySelectorAll('[data-year]').forEach(button => button.addEventListener('click', () => {
      card.hidden = true;
      activeIndex = -1;
      eventSelect.value = '';
      stage.querySelector('.roadmap3d-milestone.is-active')?.classList.remove('is-active');
      setYearHighlight(button.dataset.year);
      overview();
    }));
    stage.querySelector('[data-action="overview"]').addEventListener('click', () => { card.hidden = true; activeIndex = -1; eventSelect.value = ''; stage.querySelector('.roadmap3d-milestone.is-active')?.classList.remove('is-active'); setYearHighlight(null); overview(); });
    stage.querySelector('[data-action="zoom-in"]').addEventListener('click', () => { desired.radius = Math.max(9, desired.radius * .78); });
    stage.querySelector('[data-action="zoom-out"]').addEventListener('click', () => { desired.radius = Math.min(100, desired.radius * 1.28); });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let dragMode = 'rotate';
    renderer.domElement.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.button !== 2) return;
      dragging = true;
      moved = false;
      dragMode = event.shiftKey || event.button === 2 || desired.radius >= 61 ? 'pan' : 'rotate';
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    });
    renderer.domElement.addEventListener('pointermove', event => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (dragMode === 'pan') {
        // Move the map with the pointer in camera screen space, regardless of rotation.
        const scale = 2 * orbit.radius * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / renderer.domElement.clientHeight;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        right.y = 0;
        up.y = 0;
        right.normalize();
        up.normalize();
        desired.target.x = THREE.MathUtils.clamp(desired.target.x - right.x * dx * scale + up.x * dy * scale, -23, 23);
        desired.target.z = THREE.MathUtils.clamp(desired.target.z - right.z * dx * scale + up.z * dy * scale, -24, 24);
      } else {
        desired.theta -= dx * .006;
        desired.phi = THREE.MathUtils.clamp(desired.phi - dy * .006, .37, 1.48);
      }
      lastX = event.clientX;
      lastY = event.clientY;
    });
    renderer.domElement.addEventListener('pointerup', event => {
      dragging = false;
      if (moved || event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickTargets)[0];
      if (hit) focus(hit.object.userData.index);
    });
    renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
    renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
    renderer.domElement.addEventListener('wheel', event => {
      event.preventDefault();
      desired.radius = THREE.MathUtils.clamp(desired.radius * Math.exp(event.deltaY * .001), 9, 100);
    }, { passive: false });

    let stageWidth = 0;
    let stageHeight = 0;
    let labelsDirty = true;
    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      stageWidth = width;
      stageHeight = height;
      labelsDirty = true;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    new ResizeObserver(resize).observe(stage);
    resize();
    let stageVisible = false;
    new IntersectionObserver(([entry]) => { stageVisible = entry.isIntersecting; }, { rootMargin: '100px' }).observe(stage);
    const clock = new THREE.Clock();
    const projectedPoint = new THREE.Vector3();
    let lastRender = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      if (document.hidden || !stageVisible) return;
      const moving = Math.abs(desired.theta - orbit.theta) > .0002 ||
        Math.abs(desired.phi - orbit.phi) > .0002 ||
        Math.abs(desired.radius - orbit.radius) > .002 ||
        desired.target.distanceToSquared(orbit.target) > .00002;
      const now = performance.now();
      if (!moving && !labelsDirty && now - lastRender < 33) return;
      lastRender = now;
      const dt = clock.getElapsedTime();
      orbit.theta += (desired.theta - orbit.theta) * .09;
      orbit.phi += (desired.phi - orbit.phi) * .09;
      orbit.radius += (desired.radius - orbit.radius) * .09;
      orbit.target.lerp(desired.target, .09);
      camera.position.set(
        orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        orbit.target.y + orbit.radius * Math.cos(orbit.phi),
        orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
      );
      camera.lookAt(orbit.target);
      const showMilestoneNames = orbit.radius < 61;
      for (const marker of markerGroups) {
        if (marker.sphere) marker.sphere.position.y = .69 + Math.sin(dt * 1.6 + marker.phase) * .085;
        if (marker.label && (moving || labelsDirty)) {
          const projected = projectedPoint.copy(marker.anchor).project(camera);
          const label = marker.label;
          label.style.left = ((projected.x + 1) * .5 * stageWidth + marker.offsetX) + 'px';
          label.style.top = ((1 - projected.y) * .5 * stageHeight + marker.offsetY) + 'px';
          const visible = showMilestoneNames && projected.z < 1 && Math.abs(projected.x) < 1.12 && Math.abs(projected.y) < 1.12;
          label.style.opacity = visible ? '1' : '0';
          label.style.pointerEvents = visible ? 'auto' : 'none';
        }
      }
      labelsDirty = false;
      renderer.render(scene, camera);
      window.roadmap3dStats.drawCalls = renderer.info.render.calls;
    };
    animate();
  }
}

# Cyber 3D Roadmap — Bước 1

Map 3D được phát triển ngay trong trang chủ của repo này, tại mục `#resume`. Timeline 2D vẫn hiển thị cho đến khi phần 3D sẵn sàng.

## Cấu trúc

```text
index.html                 Trang chủ, điểm gắn #cyber3d-map
package.json               Vite, Three.js, GSAP
vite.config.js             Cấu hình dev/build
src/
  main.js                  Khởi tạo vùng map trong #resume
  style.css                CSS nền cho map 3D
  data/timeline.js         Dữ liệu mẫu 3 cột mốc
  three/                   Bước 2–3: scene, path, camera, particles
  ui/                      Bước 4–5: HTML overlay
```

## Chạy

```bash
npm install
npm run dev
```

Mở http://127.0.0.1:8788/index.html#resume. Lệnh `npm run build` kiểm tra phần mã Vite; build này chưa phải gói phát hành cho toàn bộ website tĩnh.

## Các bước tiếp theo

2. `src/three/scene.js`, `path.js`: không gian và đường neon phát sáng.
3. `src/three/camera.js`: camera di chuyển theo cuộn trang.
4. Điểm mốc 3D và `src/ui/htmlOverlay.js`.
5. Chuyển động GSAP và tinh chỉnh giao diện.

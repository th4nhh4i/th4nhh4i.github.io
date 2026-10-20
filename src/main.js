import { timeline } from './data/timeline.js';

// Bước 1: gắn dữ liệu mẫu vào phần Hành trình hiện có.
// Các module Three.js và giao diện overlay sẽ dùng cùng vùng này ở Bước 2–5.
const roadmap = document.querySelector('#resume .roadmap-wrapper');
if (roadmap) {
  roadmap.dataset.cyber3dMilestones = String(timeline.length);
  const mount = document.createElement('div');
  mount.id = 'cyber3d-map';
  mount.className = 'cyber3d-map';
  mount.hidden = true;
  mount.setAttribute('aria-hidden', 'true');
  roadmap.querySelector('.roadmap-viewport')?.before(mount);
}

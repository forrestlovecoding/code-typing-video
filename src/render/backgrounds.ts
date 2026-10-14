import type { Theme } from '../engine/themes';

/** 背景绘制器：全部基于时间 t 的确定性动画（预览与导出逐帧一致） */
export type BackgroundPainter = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  theme: Theme,
) => void;

/** mulberry32 种子随机（初始化粒子等静态数据用） */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap01(v: number): number {
  return v - Math.floor(v);
}

/* ---------------- 深空粒子网络 ---------------- */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const PARTICLE_COUNT = 80;
const particles: Particle[] = (() => {
  const rnd = mulberry32(20260101);
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: rnd(),
    y: rnd(),
    vx: (rnd() - 0.5) * 0.012,
    vy: (rnd() - 0.5) * 0.012,
    r: 0.6 + rnd() * 1.6,
  }));
})();

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#060b1a');
  grad.addColorStop(0.55, '#0a1430');
  grad.addColorStop(1, '#050912');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const s = h / 1920;
  const pos = particles.map((p) => ({
    x: wrap01(p.x + p.vx * t) * w,
    y: wrap01(p.y + p.vy * t) * h,
    r: p.r,
  }));

  // 连线
  const maxDist = w * 0.115;
  ctx.lineWidth = Math.max(0.5, 1 * s);
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const dx = pos[i].x - pos[j].x;
      const dy = pos[i].y - pos[j].y;
      const d = Math.hypot(dx, dy);
      if (d < maxDist) {
        const a = (1 - d / maxDist) * 0.28;
        ctx.strokeStyle = `rgba(110, 165, 255, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pos[i].x, pos[i].y);
        ctx.lineTo(pos[j].x, pos[j].y);
        ctx.stroke();
      }
    }
  }

  // 粒子 + 光晕
  for (const p of pos) {
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6 * s + 2);
    glow.addColorStop(0, 'rgba(140, 190, 255, 0.5)');
    glow.addColorStop(1, 'rgba(140, 190, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 6 * s + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 225, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 顶部氛围光
  const top = ctx.createRadialGradient(w * 0.5, -h * 0.1, 0, w * 0.5, -h * 0.1, h * 0.5);
  top.addColorStop(0, 'rgba(50, 100, 220, 0.16)');
  top.addColorStop(1, 'rgba(50, 100, 220, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
}

/* ---------------- 霓虹极光 ---------------- */

const AURORA_BLOBS = [
  { hue: '34, 211, 238', ax: 0.3, ay: 0.24, rx: 0.1, ry: 0.14, rr: 0.42, phase: 0.0 },
  { hue: '168, 85, 247', ax: 0.68, ay: 0.4, rx: 0.13, ry: 0.1, rr: 0.46, phase: 1.8 },
  { hue: '236, 72, 153', ax: 0.42, ay: 0.62, rx: 0.12, ry: 0.12, rr: 0.4, phase: 3.6 },
  { hue: '59, 130, 246', ax: 0.72, ay: 0.78, rx: 0.09, ry: 0.13, rr: 0.44, phase: 5.1 },
];

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#0a0814';
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'lighter';
  for (const b of AURORA_BLOBS) {
    const cx = (b.ax + Math.sin(t * 0.21 + b.phase) * b.rx) * w;
    const cy = (b.ay + Math.cos(t * 0.17 + b.phase * 1.3) * b.ry) * h;
    const r = (b.rr + Math.sin(t * 0.13 + b.phase) * 0.06) * h;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${b.hue}, 0.34)`);
    grad.addColorStop(0.6, `rgba(${b.hue}, 0.12)`);
    grad.addColorStop(1, `rgba(${b.hue}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';

  // 细微星点
  const s = h / 1920;
  const rnd = mulberry32(77);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + rnd()) + i));
    ctx.globalAlpha = tw * 0.5;
    ctx.fillRect(x, y, 1.6 * s, 1.6 * s);
  }
  ctx.globalAlpha = 1;
}

/* ---------------- 黑客矩阵代码雨 ---------------- */

const MATRIX_CHARS = '01'.split('');
const MATRIX_COL_W = 26; // 设计坐标列宽

const matrixCols = (() => {
  const rnd = mulberry32(424242);
  return Array.from({ length: 200 }, () => ({
    speed: 0.5 + rnd() * 0.9,
    offset: rnd(),
    seed: Math.floor(rnd() * 100000),
  }));
})();

function drawMatrix(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#010703';
  ctx.fillRect(0, 0, w, h);

  const s = h / 1920;
  const colW = MATRIX_COL_W * s;
  const charH = colW * 1.05;
  const cols = Math.ceil(w / colW);
  const fontSize = colW * 0.92;

  ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';

  const trail = Math.ceil((h * 0.5) / charH);
  const total = h + trail * charH + 100 * s;

  for (let ci = 0; ci < cols; ci++) {
    const col = matrixCols[ci % matrixCols.length];
    const head = ((col.speed * t * 220 * s + col.offset * total) % total) - trail * charH;
    const x = ci * colW + colW * 0.08;

    for (let k = 0; k < trail; k++) {
      const y = head - k * charH;
      if (y < -charH || y > h) continue;
      const chIdx =
        (col.seed + k * 7 + Math.floor(t * 2.5 + k * 0.9)) % MATRIX_CHARS.length;
      const ch = MATRIX_CHARS[chIdx];
      if (k === 0) {
        ctx.fillStyle = 'rgba(215, 255, 225, 0.95)';
      } else {
        const a = (1 - k / trail) * 0.55;
        ctx.fillStyle = `rgba(60, 255, 120, ${a.toFixed(3)})`;
      }
      ctx.fillText(ch, x, y);
    }
  }

  // 轻微暗角
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/* ---------------- 赛博透视网格 ---------------- */

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const horizon = h * 0.4;

  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#100322');
  sky.addColorStop(1, '#33095c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  // 太阳
  const sunR = h * 0.13;
  const sunY = horizon - sunR * 0.35;
  const sun = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 160, 90, 0.95)');
  sun.addColorStop(0.65, 'rgba(255, 90, 140, 0.75)');
  sun.addColorStop(1, 'rgba(255, 90, 140, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(w / 2, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // 地面
  const ground = ctx.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, '#0d0221');
  ground.addColorStop(1, '#1b0638');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, w, h - horizon);

  const s = h / 1920;

  // 地平线辉光
  const glow = ctx.createLinearGradient(0, horizon - 26 * s, 0, horizon + 26 * s);
  glow.addColorStop(0, 'rgba(255, 70, 200, 0)');
  glow.addColorStop(0.5, 'rgba(255, 90, 210, 0.55)');
  glow.addColorStop(1, 'rgba(255, 70, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - 26 * s, w, 52 * s);

  // 纵向线（向灭点汇聚）
  ctx.lineWidth = Math.max(1, 1.6 * s);
  for (let i = -14; i <= 14; i++) {
    const xb = w / 2 + i * w * 0.085;
    const xh = w / 2 + i * w * 0.009;
    ctx.strokeStyle = 'rgba(90, 220, 255, 0.30)';
    ctx.beginPath();
    ctx.moveTo(xh, horizon);
    ctx.lineTo(xb, h);
    ctx.stroke();
  }

  // 横向线（向观察者流动，近密远疏）
  const K = 16;
  for (let k = 0; k < K; k++) {
    const z = wrap01(t * 0.35 + k / K);
    const y = horizon + (h - horizon) * Math.pow(z, 2.6);
    const a = 0.08 + z * 0.5;
    ctx.strokeStyle = `rgba(255, 60, 200, ${a.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, (0.8 + z * 2.4) * s);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 星星
  const rnd = mulberry32(9);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w;
    const y = rnd() * horizon * 0.8;
    const tw = Math.abs(Math.sin(t * (0.4 + rnd()) + i * 2));
    ctx.globalAlpha = tw * 0.5;
    ctx.fillRect(x, y, 1.8 * s, 1.8 * s);
  }
  ctx.globalAlpha = 1;
}

const PAINTERS: Record<Theme['bg'], BackgroundPainter> = {
  particles: drawParticles,
  aurora: drawAurora,
  matrix: drawMatrix,
  grid: drawGrid,
};

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  theme: Theme,
): void {
  (PAINTERS[theme.bg] ?? drawParticles)(ctx, w, h, t, theme);
}

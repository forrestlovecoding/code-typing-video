import { paintBackground } from './backgrounds';
import { FONT_STACK, type Scene } from './scene';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function codeFont(px: number, weight = 400): string {
  return `${weight} ${px}px ${FONT_STACK}`;
}

/** 绘制单帧：背景 → 代码窗口 → 打字文本 → 光标。t 为秒。 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: Scene,
  t: number,
): void {
  const s = h / 1920; // 设计坐标 → 实际画布 缩放
  paintBackground(ctx, w, h, t, scene.theme);
  drawCodeWindow(ctx, w, h, s, scene, t);
}

function drawCodeWindow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  scene: Scene,
  t: number,
) {
  const { windowRect: wr, theme } = scene;
  const x = wr.x * s;
  const y = wr.y * s;
  const ww = wr.w * s;
  const wh = wr.h * s;
  const radius = 26 * s;

  // 窗口阴影 + 主体
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 60 * s;
  ctx.shadowOffsetY = 24 * s;
  ctx.fillStyle = theme.windowFill;
  roundRectPath(ctx, x, y, ww, wh, radius);
  ctx.fill();
  ctx.restore();

  // 窗口描边
  ctx.strokeStyle = theme.windowBorder;
  ctx.lineWidth = Math.max(1, 2 * s);
  roundRectPath(ctx, x, y, ww, wh, radius);
  ctx.stroke();

  // 标题栏（macOS 风格）
  if (scene.windowChrome) {
    const barH = scene.barH * s;
    ctx.save();
    roundRectPath(ctx, x, y, ww, wh, radius);
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.fillRect(x, y, ww, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x, y + barH);
    ctx.lineTo(x + ww, y + barH);
    ctx.stroke();

    // 红黄绿按钮
    const lightR = 11 * s;
    const lightY = y + barH / 2;
    const lightColors = ['#ff5f57', '#febc2e', '#28c840'];
    lightColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 46 * s + i * 40 * s, lightY, lightR, 0, Math.PI * 2);
      ctx.fill();
    });

    // 文件名
    ctx.fillStyle = theme.titleBarText;
    ctx.font = codeFont(26 * s, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.filename, x + ww / 2, lightY);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // 代码区
  ctx.save();
  roundRectPath(ctx, x, y, ww, wh, radius);
  ctx.clip();

  const codeLeft = (scene.windowRect.x + scene.padX + scene.gutterW) * s;
  const codeTop = (scene.windowRect.y + scene.padTop + scene.vCenter) * s;
  const clipTop = (scene.windowRect.y + scene.padTop) * s;
  const clipH = scene.contentH * s;
  const scroll = scene.scrollAt(t) * s;

  const reveal = scene.revealAt(t);
  const lineH = scene.lineH * s;
  const fontSize = scene.fontSize * s;

  // 只绘制可见行
  const firstVisible = Math.max(
    0,
    Math.floor((scroll - scene.vCenter * s) / lineH) - 1,
  );
  const lastVisible = Math.min(
    scene.lines.length - 1,
    Math.ceil((scroll + clipH) / lineH) + 1,
  );

  ctx.textBaseline = 'middle';
  ctx.font = codeFont(fontSize);

  for (let li = firstVisible; li <= lastVisible; li++) {
    const line = scene.lines[li];
    const top = codeTop + li * lineH - scroll;
    const cy = top + lineH / 2;

    // 行号
    if (scene.showLineNumbers) {
      ctx.fillStyle = theme.lineNumber;
      ctx.font = codeFont(fontSize * 0.8);
      const num = String(li + 1);
      const numX = (scene.windowRect.x + scene.padX) * s;
      ctx.textAlign = 'right';
      ctx.fillText(num, numX + scene.gutterW * s - 14 * s, cy);
      ctx.textAlign = 'left';
      ctx.font = codeFont(fontSize);
    }

    // 该行已显示长度
    const shown = Math.min(line.length, Math.max(0, reveal - scene.lineStarts[li]));
    if (shown <= 0) continue;

    let cx = codeLeft;
    for (const span of scene.lineSpans[li]) {
      if (span.start >= shown) break;
      const end = Math.min(span.end, shown);
      if (end <= span.start) continue;
      const text = line.slice(span.start, end);
      ctx.fillStyle = scene.resolveColor(span.type);
      ctx.fillText(text, cx, cy);
      cx += ctx.measureText(text).width;
    }
  }

  // 光标
  drawCursor(ctx, s, scene, t, reveal, codeLeft, codeTop, scroll, lineH, fontSize, clipTop, clipH);

  ctx.restore();
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  s: number,
  scene: Scene,
  t: number,
  reveal: number,
  codeLeft: number,
  codeTop: number,
  scroll: number,
  lineH: number,
  fontSize: number,
  clipTop: number,
  clipH: number,
) {
  const typingDone = reveal >= scene.code.length;
  // 打字中闪烁；结束后常亮
  if (!typingDone) {
    const blink = (t * 1.9) % 1 < 0.62;
    if (!blink) return;
  }

  // 光标位置：reveal 指向的字符；若指向换行符则到下一行行首
  let li = 0;
  while (li < scene.lineStarts.length - 1 && scene.lineStarts[li + 1] <= reveal) li++;
  let col = reveal - scene.lineStarts[li];
  const line = scene.lines[li] ?? '';
  if (col > line.length) col = line.length;

  // 若 reveal 位于换行符上（col === line.length 且是行尾），光标仍在行尾
  const cx = codeLeft + measurePrefix(ctx, line, col, fontSize);
  const cy = codeTop + li * lineH - scroll + lineH / 2;
  if (cy < clipTop - lineH || cy > clipTop + clipH + lineH) return;

  const cw = Math.max(6, fontSize * 0.56);
  const ch = fontSize * 1.18;
  ctx.fillStyle = scene.theme.cursor;
  ctx.globalAlpha = 0.9;
  roundRectPath(ctx, cx, cy - ch / 2, cw, ch, Math.min(3, cw / 3) * s);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function measurePrefix(
  ctx: CanvasRenderingContext2D,
  line: string,
  col: number,
  _fontSize: number,
): number {
  if (col <= 0) return 0;
  return ctx.measureText(line.slice(0, col)).width;
}

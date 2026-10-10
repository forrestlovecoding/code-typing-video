/** 打字时间轴：每个字符的显现时刻 + 滚动关键帧 */

export interface ScrollKey {
  time: number;
  target: number;
}

export interface TimelineOptions {
  /** 打字速度：字符/秒（缩进空格与换行不计时或仅短暂停顿） */
  cps: number;
  /** 每打完一行（遇到换行符）的停顿，毫秒 */
  linePauseMs: number;
  /** 片头时长（背景先出现），毫秒 */
  introMs: number;
  /** 片尾停留时长，毫秒 */
  outroMs: number;
}

export interface Timeline {
  /** charTimes[i] = 第 i 个字符完全显现的时刻（秒） */
  charTimes: Float64Array;
  /** 打字结束时刻（秒） */
  typingEnd: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 滚动关键帧（按时间升序） */
  scrollKeys: ScrollKey[];
}

/** 确定性伪随机（同一 i 永远得到同一抖动，保证预览与导出逐帧一致） */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return 0.7 + 0.6 * frac;
}

export function buildTimeline(code: string, opts: TimelineOptions): Timeline {
  const n = code.length;
  const charTimes = new Float64Array(n);
  let t = opts.introMs / 1000;
  const base = 1 / Math.max(1, opts.cps);
  let atLineStart = true;

  for (let i = 0; i < n; i++) {
    const c = code[i];
    if (c === '\n') {
      charTimes[i] = t;
      t += opts.linePauseMs / 1000;
      atLineStart = true;
    } else {
      const isWs = c === ' ' || c === '\t';
      if (isWs && atLineStart) {
        charTimes[i] = t; // 缩进瞬间跳过
      } else {
        t += base * jitter(i);
        charTimes[i] = t;
      }
      if (!isWs) atLineStart = false;
    }
  }

  const typingEnd = n > 0 ? charTimes[n - 1] : opts.introMs / 1000;
  const duration = typingEnd + opts.outroMs / 1000;
  return { charTimes, typingEnd, duration, scrollKeys: [] };
}

/**
 * 生成滚动关键帧：平时代码静止；当光标到达窗口底端边框时，
 * 平滑上滚，让光标保持在距底边 0.8 行高处。
 * lineStarts / lineH / contentH 均为设计坐标（1080×1920 基准）。
 */
export function buildScrollKeys(
  code: string,
  charTimes: Float64Array,
  lineStarts: number[],
  lineH: number,
  contentH: number,
  padTop: number,
): ScrollKey[] {
  const keys: ScrollKey[] = [];
  const keepY = Math.max(lineH, contentH - lineH * 0.8);
  let current = 0;

  for (let li = 1; li < lineStarts.length; li++) {
    const idx = lineStarts[li];
    if (idx >= charTimes.length) break;
    const cursorY = padTop + li * lineH + lineH / 2;
    const target = Math.max(0, cursorY - keepY);
    if (Math.abs(target - current) < 1) continue;
    current = target;
    keys.push({ time: charTimes[idx], target });
  }
  return keys;
}

/** easeInOutCubic */
function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

const SCROLL_DURATION = 0.38;

/** 按关键帧插值出 t 时刻的滚动偏移 */
export function scrollAtTime(keys: ScrollKey[], t: number): number {
  if (keys.length === 0) return 0;
  // 找到最后一个 time <= t 的关键帧
  let lo = 0;
  let hi = keys.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid].time <= t) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) return 0;
  const key = keys[idx];
  const prevTarget = idx === 0 ? 0 : keys[idx - 1].target;
  const p = Math.min(1, (t - key.time) / SCROLL_DURATION);
  return prevTarget + (key.target - prevTarget) * easeInOut(p);
}

/** 二分查找 t 时刻已显现的字符数 */
export function revealAtTime(charTimes: Float64Array, t: number): number {
  let lo = 0;
  let hi = charTimes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (charTimes[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

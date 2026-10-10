import { grammarOf, filenameOf, type LanguageId } from '../engine/languages';
import { tokenizeToSpans, splitSpansByLine, type LineSpan } from '../engine/highlight';
import { themeOf, makeColorResolver, type Theme } from '../engine/themes';
import {
  buildTimeline,
  buildScrollKeys,
  scrollAtTime,
  revealAtTime,
  type Timeline,
} from '../engine/timeline';

/** 设计基准：竖版 1080×1920 */
export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export interface RenderParams {
  language: LanguageId;
  themeId: string;
  /** 窗口标题（macOS 标题栏居中显示），留空则按语言自动使用文件名 */
  filename: string;
  /** 字号（设计坐标 px，1080 宽基准） */
  fontSize: number;
  cps: number;
  linePauseMs: number;
  introMs: number;
  outroMs: number;
  showLineNumbers: boolean;
  windowChrome: boolean;
}

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Scene {
  code: string;
  lines: string[];
  lineStarts: number[];
  lineSpans: LineSpan[][];
  timeline: Timeline;
  theme: Theme;
  resolveColor: (type: string) => string;
  /** 自动适配后的最终字号（设计坐标） */
  fontSize: number;
  lineH: number;
  charW: number;
  gutterW: number;
  padX: number;
  padTop: number;
  vCenter: number;
  contentW: number;
  contentH: number;
  windowRect: WindowRect;
  barH: number;
  filename: string;
  showLineNumbers: boolean;
  windowChrome: boolean;
  scrollAt: (t: number) => number;
  revealAt: (t: number) => number;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const cv = document.createElement('canvas');
    cv.width = 8;
    cv.height = 8;
    measureCtx = cv.getContext('2d')!;
  }
  return measureCtx;
}

export const FONT_STACK = '"JetBrains Mono", "Cascadia Code", Consolas, "Microsoft YaHei", monospace';

function fontString(px: number, weight = 400): string {
  return `${weight} ${px}px ${FONT_STACK}`;
}

/**
 * 构建渲染场景：分词着色 → 时间轴 → 度量与自动缩放 → 滚动关键帧。
 * 所有尺寸均为 1080×1920 设计坐标，渲染时按实际画布高度等比缩放。
 */
export function buildScene(code: string, params: RenderParams): Scene {
  // 规范化：\r\n → \n，Tab → 4 空格，去掉末尾空白行
  const normalized = code
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\n+$/, '');

  const theme = themeOf(params.themeId);
  const lines = normalized.length > 0 ? normalized.split('\n') : [''];
  const lineStarts: number[] = [];
  let acc = 0;
  for (const line of lines) {
    lineStarts.push(acc);
    acc += line.length + 1;
  }

  const grammar = grammarOf(params.language);
  const spans = tokenizeToSpans(normalized, grammar);
  const lineSpans = splitSpansByLine(spans, lines);

  const timeline = buildTimeline(normalized, {
    cps: params.cps,
    linePauseMs: params.linePauseMs,
    introMs: params.introMs,
    outroMs: params.outroMs,
  });

  // 窗口布局（设计坐标）
  const windowRect: WindowRect = {
    x: DESIGN_W * 0.055,
    y: DESIGN_H * 0.105,
    w: DESIGN_W * 0.89,
    h: DESIGN_H * 0.79,
  };
  const barH = params.windowChrome ? 76 : 0;
  const padX = 34;
  const padTop = barH + 30;
  const padBottom = 30;
  const contentW = windowRect.w - padX * 2;
  const contentH = windowRect.h - padTop - padBottom;

  // 字号自动适配：最长行超出内容宽度则整体缩小（下限 20px）
  const mctx = getMeasureCtx();
  let fontSize = params.fontSize;
  mctx.font = fontString(fontSize);
  let maxLineW = 0;
  for (const line of lines) {
    const w = mctx.measureText(line).width;
    if (w > maxLineW) maxLineW = w;
  }
  let gutterW = 0;
  if (params.showLineNumbers) {
    const digits = String(lines.length).length;
    mctx.font = fontString(fontSize * 0.8);
    gutterW = mctx.measureText('0'.repeat(digits)).width + 30;
  }
  const availW = contentW - gutterW;
  if (maxLineW > availW && maxLineW > 0) {
    fontSize = Math.max(20, Math.floor(fontSize * (availW / maxLineW)));
  }

  mctx.font = fontString(fontSize);
  const charW = mctx.measureText('0').width;
  const lineH = Math.round(fontSize * 1.58);
  if (params.showLineNumbers) {
    const digits = String(lines.length).length;
    mctx.font = fontString(fontSize * 0.8);
    gutterW = mctx.measureText('0'.repeat(digits)).width + 30;
  }

  // 代码行数不足一屏时垂直居中
  const vCenter = Math.max(0, (contentH - lines.length * lineH) / 2);

  const scrollKeys = buildScrollKeys(
    normalized,
    timeline.charTimes,
    lineStarts,
    lineH,
    contentH,
    padTop + vCenter,
  );
  timeline.scrollKeys = scrollKeys;

  return {
    code: normalized,
    lines,
    lineStarts,
    lineSpans,
    timeline,
    theme,
    resolveColor: makeColorResolver(theme.palette),
    fontSize,
    lineH,
    charW,
    gutterW,
    padX,
    padTop,
    vCenter,
    contentW,
    contentH,
    windowRect,
    barH,
    filename: params.filename.trim() || filenameOf(params.language),
    showLineNumbers: params.showLineNumbers,
    windowChrome: params.windowChrome,
    scrollAt: (t) => scrollAtTime(scrollKeys, t),
    revealAt: (t) => revealAtTime(timeline.charTimes, t),
  };
}

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { renderFrame } from '../render/frame';
import type { Scene } from '../render/scene';

export interface ExportOptions {
  scene: Scene;
  width: number;
  height: number;
  fps: number;
  /** 码率 bps */
  bitrate: number;
  onProgress: (ratio: number) => void;
  /** 外部控制取消 */
  isAborted: () => boolean;
}

export interface ExportResult {
  blob: Blob;
  frames: number;
}

/** 检查当前浏览器是否支持 H.264 硬编码导出 */
export async function checkExportSupport(width: number, height: number, fps: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') {
    return '当前浏览器不支持 WebCodecs，请使用最新版 Chrome 或 Edge 打开。';
  }
  const candidates = ['avc1.640034', 'avc1.640033', 'avc1.640032', 'avc1.640029', 'avc1.4d0034', 'avc1.42003e'];
  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps,
      });
      if (support.supported) return codec;
    } catch {
      // 尝试下一个
    }
  }
  return null;
}

/**
 * 确定性逐帧渲染 + WebCodecs 编码 MP4（H.264）。
 * 不依赖实时录制，速度快于播放速度且不会掉帧。
 */
export async function exportMp4(opts: ExportOptions): Promise<ExportResult> {
  const { scene, width, height, fps, bitrate } = opts;
  const codec = await checkExportSupport(width, height, fps);
  if (!codec) {
    throw new Error('浏览器不支持 H.264 编码，请使用最新版 Chrome 或 Edge。');
  }

  const totalDuration = scene.timeline.duration;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({
    codec,
    width,
    height,
    bitrate,
    framerate: fps,
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingQuality = 'high';

  const frameDuration = 1_000_000 / fps;

  for (let i = 0; i < totalFrames; i++) {
    if (opts.isAborted()) {
      encoder.close();
      throw new DOMException('导出已取消', 'AbortError');
    }
    if (encodeError) throw encodeError;

    const t = i / fps;
    renderFrame(ctx, width, height, scene, t);

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(i * frameDuration),
      duration: Math.round(frameDuration),
    });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    // 背压控制：编码队列积压时等待
    while (encoder.encodeQueueSize > 6) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          encoder.removeEventListener('dequeue', handler);
          resolve();
        };
        encoder.addEventListener('dequeue', handler);
      });
      if (opts.isAborted()) break;
    }

    if (i % 3 === 0 || i === totalFrames - 1) {
      opts.onProgress((i + 1) / totalFrames);
    }
  }

  if (opts.isAborted()) {
    try {
      encoder.close();
    } catch {
      /* ignore */
    }
    throw new DOMException('导出已取消', 'AbortError');
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  return { blob, frames: totalFrames };
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

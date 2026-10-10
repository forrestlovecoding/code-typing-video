import { useCallback, useEffect, useRef, useState } from 'react';
import type { Scene } from '../render/scene';
import { renderFrame } from '../render/frame';
import { LANGUAGES } from '../engine/languages';

interface Props {
  scene: Scene | null;
  language: string;
  onLanguageChange: (id: string) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PreviewPane({ scene, language, onLanguageChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const playingRef = useRef(true);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [displayT, setDisplayT] = useState(0);
  const [loop, setLoop] = useState(true);

  const duration = scene?.timeline.duration ?? 0;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    renderFrame(ctx, canvas.width, canvas.height, scene, tRef.current);
  }, [scene]);

  // 场景变化（代码/参数）→ 重置进度自动播放
  useEffect(() => {
    tRef.current = 0;
    setDisplayT(0);
    playingRef.current = true;
    setPlaying(true);
  }, [scene]);

  // 主循环
  useEffect(() => {
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : 0;
      lastTsRef.current = ts;
      if (playingRef.current && scene) {
        tRef.current += dt;
        if (tRef.current >= scene.timeline.duration) {
          if (loop) {
            tRef.current = 0;
          } else {
            tRef.current = scene.timeline.duration;
            playingRef.current = false;
            setPlaying(false);
          }
        }
        setDisplayT(tRef.current);
      }
      draw();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [draw, loop, scene]);

  const togglePlay = () => {
    if (!scene) return;
    if (!playingRef.current && tRef.current >= scene.timeline.duration - 0.01) {
      tRef.current = 0;
    }
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  };

  const restart = () => {
    tRef.current = 0;
    setDisplayT(0);
    playingRef.current = true;
    setPlaying(true);
  };

  const seek = (v: number) => {
    tRef.current = v;
    setDisplayT(v);
  };

  return (
    <div className="preview-pane">
      <div className="preview-stage">
        <div className="phone-frame">
          <canvas ref={canvasRef} width={720} height={1280} />
        </div>
      </div>

      <div className="transport">
        <button className="btn icon" onClick={togglePlay} title={playing ? '暂停' : '播放'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="btn icon" onClick={restart} title="重新播放">
          ↺
        </button>
        <input
          type="range"
          className="seek"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.01}
          value={displayT}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="time-label">
          {formatTime(displayT)} / {formatTime(duration)}
        </span>
        <label className="check">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          循环
        </label>
      </div>

      <div className="preview-footer">
        <span className="duration-badge">
          成片时长 {formatTime(duration)}
          {duration > 180 && <em className="warn-dot"> 已超 3 分钟</em>}
        </span>
        <select
          className="select small"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          title="代码语言（影响高亮与文件名）"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

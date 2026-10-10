import { THEMES } from '../engine/themes';

export interface ParamState {
  themeId: string;
  /** 窗口标题，留空按语言自动显示文件名 */
  filename: string;
  fontSize: number;
  cps: number;
  linePauseMs: number;
  introMs: number;
  outroMs: number;
  showLineNumbers: boolean;
  windowChrome: boolean;
  resolution: 1080 | 720;
  fps: 24 | 30 | 60;
}

interface Props {
  params: ParamState;
  onChange: (patch: Partial<ParamState>) => void;
  /** 按语言自动生成的默认文件名（作输入框占位提示） */
  autoFilename: string;
}

export default function ParamPanel({ params, onChange, autoFilename }: Props) {
  return (
    <div className="param-panel">
      <div className="param-group">
        <span className="param-label">背景主题</span>
        <div className="theme-switch">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`btn chip ${params.themeId === t.id ? 'active' : ''}`}
              onClick={() => onChange({ themeId: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="param-group">
        <span className="param-label">窗口标题</span>
        <input
          className="text-input"
          value={params.filename}
          placeholder={autoFilename}
          maxLength={40}
          onChange={(e) => onChange({ filename: e.target.value })}
        />
      </div>

      <div className="param-group">
        <span className="param-label">
          打字速度 <b>{params.cps}</b> 字/秒
        </span>
        <input
          type="range"
          min={6}
          max={40}
          step={1}
          value={params.cps}
          onChange={(e) => onChange({ cps: Number(e.target.value) })}
        />
      </div>

      <div className="param-group">
        <span className="param-label">
          行间停顿 <b>{params.linePauseMs}</b> ms
        </span>
        <input
          type="range"
          min={0}
          max={600}
          step={20}
          value={params.linePauseMs}
          onChange={(e) => onChange({ linePauseMs: Number(e.target.value) })}
        />
      </div>

      <div className="param-group">
        <span className="param-label">
          字号 <b>{params.fontSize}</b> px
        </span>
        <input
          type="range"
          min={28}
          max={64}
          step={2}
          value={params.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </div>

      <div className="param-group">
        <span className="param-label">
          片头 <b>{(params.introMs / 1000).toFixed(1)}</b> s · 片尾{' '}
          <b>{(params.outroMs / 1000).toFixed(1)}</b> s
        </span>
        <div className="pair-range">
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={params.introMs}
            onChange={(e) => onChange({ introMs: Number(e.target.value) })}
          />
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={params.outroMs}
            onChange={(e) => onChange({ outroMs: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="param-group toggles">
        <label className="check">
          <input
            type="checkbox"
            checked={params.showLineNumbers}
            onChange={(e) => onChange({ showLineNumbers: e.target.checked })}
          />
          行号
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={params.windowChrome}
            onChange={(e) => onChange({ windowChrome: e.target.checked })}
          />
          macOS 窗口
        </label>
        <label className="check">
          分辨率
          <select
            className="select small"
            value={params.resolution}
            onChange={(e) => onChange({ resolution: Number(e.target.value) as 1080 | 720 })}
          >
            <option value={1080}>1080×1920</option>
            <option value={720}>720×1280</option>
          </select>
        </label>
        <label className="check">
          帧率
          <select
            className="select small"
            value={params.fps}
            onChange={(e) => onChange({ fps: Number(e.target.value) as 24 | 30 | 60 })}
          >
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </label>
      </div>
    </div>
  );
}

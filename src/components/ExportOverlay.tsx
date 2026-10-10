interface Props {
  progress: number;
  frames: number;
  totalFrames: number;
  onCancel: () => void;
}

export default function ExportOverlay({ progress, frames, totalFrames, onCancel }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h3>正在导出 MP4</h3>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="overlay-meta">
          <span>{pct}%</span>
          <span>
            第 {Math.min(frames + 1, totalFrames)} / {totalFrames} 帧
          </span>
        </div>
        <p className="overlay-tip">逐帧确定性渲染编码中，请勿关闭页面…</p>
        <button className="btn danger" onClick={onCancel}>
          取消导出
        </button>
      </div>
    </div>
  );
}

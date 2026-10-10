import { useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import ParamPanel, { type ParamState } from './components/ParamPanel';
import ExportOverlay from './components/ExportOverlay';
import { buildScene } from './render/scene';
import { exportMp4, downloadBlob, checkExportSupport } from './export/exporter';
import { filenameOf, type LanguageId } from './engine/languages';
import { SAMPLES } from './samples';

const DEFAULT_PARAMS: ParamState = {
  themeId: 'deepspace',
  filename: '',
  fontSize: 44,
  cps: 16,
  linePauseMs: 160,
  introMs: 800,
  outroMs: 1500,
  showLineNumbers: true,
  windowChrome: true,
  resolution: 1080,
  fps: 30,
};

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [code, setCode] = useState(SAMPLES[0].code);
  const [language, setLanguage] = useState<string>(SAMPLES[0].language);
  const [params, setParams] = useState<ParamState>(DEFAULT_PARAMS);

  // 导出状态
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFrames, setExportFrames] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const abortRef = useRef(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      await Promise.all([
        document.fonts.load('400 24px "JetBrains Mono"'),
        document.fonts.load('500 24px "JetBrains Mono"'),
        document.fonts.load('700 24px "JetBrains Mono"'),
      ]);
      setFontsReady(true);
    };
    void load();
  }, []);

  const scene = useMemo(() => {
    if (!fontsReady) return null;
    return buildScene(code, {
      language: language as LanguageId,
      themeId: params.themeId,
      filename: params.filename,
      fontSize: params.fontSize,
      cps: params.cps,
      linePauseMs: params.linePauseMs,
      introMs: params.introMs,
      outroMs: params.outroMs,
      showLineNumbers: params.showLineNumbers,
      windowChrome: params.windowChrome,
    });
  }, [fontsReady, code, language, params]);

  const patchParams = (patch: Partial<ParamState>) =>
    setParams((p) => ({ ...p, ...patch }));

  const pickSample = (sampleCode: string, lang: string) => {
    setCode(sampleCode);
    setLanguage(lang);
  };

  const startExport = async () => {
    if (!scene) return;
    setExportError(null);
    abortRef.current = false;

    const width = params.resolution;
    const height = params.resolution === 1080 ? 1920 : 1280;
    const fps = params.fps;
    const bitrate = Math.round(
      (params.resolution === 1080 ? 10_000_000 : 5_000_000) *
        (fps >= 60 ? 1.4 : fps >= 30 ? 1 : 0.8),
    );

    try {
      const codec = await checkExportSupport(width, height, fps);
      if (!codec) {
        setExportError('当前浏览器不支持 H.264 视频编码，请使用最新版 Chrome 或 Edge 打开本页面。');
        return;
      }

      const total = Math.max(1, Math.ceil(scene.timeline.duration * fps));
      setExportTotal(total);
      setExportFrames(0);
      setExportProgress(0);
      setExporting(true);

      const result = await exportMp4({
        scene,
        width,
        height,
        fps,
        bitrate,
        onProgress: (ratio) => {
          setExportProgress(ratio);
          setExportFrames(Math.round(ratio * total));
        },
        isAborted: () => abortRef.current,
      });

      downloadBlob(result.blob, `code-typing-${Date.now()}.mp4`);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // 用户取消，静默
      } else {
        setExportError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">&lt;/&gt;</span>
          <div>
            <h1>代码打字机</h1>
            <p>竖版科技感打字视频 · 本地生成 · 可直接发布短视频平台</p>
          </div>
        </div>
        <button className="btn primary" onClick={() => void startExport()} disabled={exporting || !scene}>
          ⬇ 导出 MP4
        </button>
      </header>

      {exportError && (
        <div className="error-bar">
          {exportError}
          <button className="btn ghost small" onClick={() => setExportError(null)}>
            关闭
          </button>
        </div>
      )}

      <main className="app-main">
        <section className="left-column">
          <CodeEditor code={code} onCodeChange={setCode} onSamplePick={pickSample} />
          <ParamPanel
            params={params}
            onChange={patchParams}
            autoFilename={filenameOf(language as LanguageId)}
          />
        </section>
        <PreviewPane scene={scene} language={language} onLanguageChange={setLanguage} />
      </main>

      {exporting && (
        <ExportOverlay
          progress={exportProgress}
          frames={exportFrames}
          totalFrames={exportTotal}
          onCancel={() => {
            abortRef.current = true;
          }}
        />
      )}
    </div>
  );
}

import { useRef } from 'react';
import { SAMPLES } from '../samples';

interface Props {
  code: string;
  onCodeChange: (code: string) => void;
  onSamplePick: (code: string, language: string) => void;
}

export default function CodeEditor({ code, onCodeChange, onSamplePick }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = async (file: File) => {
    const text = await file.text();
    onCodeChange(text);
  };

  return (
    <div className="code-editor">
      <div className="editor-toolbar">
        <span className="toolbar-title">代码输入</span>
        <div className="toolbar-actions">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              className="btn ghost"
              onClick={() => onSamplePick(s.code, s.language)}
            >
              {s.label}
            </button>
          ))}
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            打开文件…
          </button>
          <button className="btn ghost" onClick={() => onCodeChange('')}>
            清空
          </button>
        </div>
      </div>
      <textarea
        className="code-area"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={'在此粘贴代码，右侧将实时生成打字效果预览…\n\n支持缩进自动跳过、逐行停顿与滚动跟随。'}
        spellCheck={false}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.c,.h,.cpp,.cs,.rs,.php,.sql,.sh,.json,.css,.yml,.yaml,.txt,.md"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

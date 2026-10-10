/** 代码着色调色板：token 类型 → 颜色 */
export type CodePalette = Record<string, string>;

export interface Theme {
  id: string;
  label: string;
  bg: 'particles' | 'aurora' | 'matrix' | 'grid';
  windowFill: string;
  windowBorder: string;
  titleBarText: string;
  cursor: string;
  lineNumber: string;
  palette: CodePalette;
}

/** 通用 One-Dark 风格调色板，plain/punctuation 随主题微调 */
function palette(plain: string, punct: string, comment: string): CodePalette {
  return {
    plain,
    comment,
    keyword: '#c678dd',
    'keyword-control': '#c678dd',
    string: '#98c379',
    'string-regex': '#56b6c2',
    number: '#d19a66',
    boolean: '#d19a66',
    builtin: '#56b6c2',
    constant: '#56b6c2',
    function: '#61afef',
    'function-variable': '#61afef',
    'class-name': '#e5c07b',
    operator: punct,
    punctuation: punct,
    tag: '#e06c75',
    'attr-name': '#d19a66',
    'attr-value': '#98c379',
    property: '#e06c75',
    selector: '#e06c75',
    regex: '#56b6c2',
    char: '#98c379',
    variable: plain,
    'template-punctuation': punct,
    interpolation: '#e5c07b',
    escape: '#56b6c2',
    decorator: '#61afef',
    annotation: '#61afef',
    atrule: '#c678dd',
    url: '#56b6c2',
    'maybe-class-name': '#e5c07b',
    spread: '#c678dd',
    arrow: punct,
  };
}

export const THEMES: Theme[] = [
  {
    id: 'deepspace',
    label: '深空粒子',
    bg: 'particles',
    windowFill: 'rgba(12, 20, 40, 0.82)',
    windowBorder: 'rgba(96, 148, 255, 0.38)',
    titleBarText: 'rgba(190, 210, 245, 0.85)',
    cursor: '#6db3ff',
    lineNumber: 'rgba(150, 175, 220, 0.32)',
    palette: palette('#dce6f5', '#8fa3c4', '#66799c'),
  },
  {
    id: 'aurora',
    label: '霓虹极光',
    bg: 'aurora',
    windowFill: 'rgba(16, 13, 32, 0.76)',
    windowBorder: 'rgba(190, 120, 255, 0.35)',
    titleBarText: 'rgba(225, 210, 245, 0.85)',
    cursor: '#c084fc',
    lineNumber: 'rgba(200, 170, 240, 0.30)',
    palette: palette('#ece9f8', '#9b90b8', '#7a6f96'),
  },
  {
    id: 'matrix',
    label: '黑客矩阵',
    bg: 'matrix',
    windowFill: 'rgba(2, 10, 5, 0.84)',
    windowBorder: 'rgba(60, 220, 110, 0.40)',
    titleBarText: 'rgba(170, 235, 190, 0.85)',
    cursor: '#4dff88',
    lineNumber: 'rgba(90, 220, 130, 0.30)',
    palette: {
      ...palette('#baf7cd', '#4f9e6b', '#3d7a52'),
      keyword: '#4dff88',
      string: '#c2ff72',
      number: '#eaffb0',
      function: '#7ce7ff',
      'class-name': '#ffe28a',
      builtin: '#7ce7ff',
      constant: '#7ce7ff',
    },
  },
  {
    id: 'grid',
    label: '赛博网格',
    bg: 'grid',
    windowFill: 'rgba(20, 10, 38, 0.80)',
    windowBorder: 'rgba(255, 90, 200, 0.38)',
    titleBarText: 'rgba(235, 215, 250, 0.85)',
    cursor: '#ff5ec8',
    lineNumber: 'rgba(215, 175, 250, 0.30)',
    palette: palette('#eae2ff', '#a18fc4', '#74648f'),
  },
];

export function themeOf(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** token 类型 → 颜色（带简单回退与缓存） */
export function makeColorResolver(palette: CodePalette): (type: string) => string {
  const cache = new Map<string, string>();
  return (type: string) => {
    const hit = cache.get(type);
    if (hit) return hit;
    let color = palette[type];
    if (!color && type.includes('-')) {
      color = palette[type.split('-')[0]];
    }
    const resolved = color ?? palette.plain;
    cache.set(type, resolved);
    return resolved;
  };
}

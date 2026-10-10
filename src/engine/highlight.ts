import Prism from 'prismjs';

/** 一个带语法着色信息的文本区间（绝对字符下标，start 含 / end 不含） */
export interface TokenSpan {
  start: number;
  end: number;
  type: string;
}

/**
 * 将代码用 Prism 分词，展平为按绝对下标排列的着色区间。
 * 打字动画时按已显示字符数截取区间，颜色始终与最终成品一致。
 */
export function tokenizeToSpans(code: string, grammar: Prism.Grammar): TokenSpan[] {
  const tokens = Prism.tokenize(code, grammar);
  const spans: TokenSpan[] = [];

  const walk = (
    toks: (string | Prism.Token)[],
    parentType: string | undefined,
    offset: number,
  ): number => {
    let pos = offset;
    for (const tk of toks) {
      if (typeof tk === 'string') {
        if (tk.length > 0) {
          spans.push({ start: pos, end: pos + tk.length, type: parentType ?? 'plain' });
        }
        pos += tk.length;
      } else {
        const content: unknown = tk.content;
        if (typeof content === 'string') {
          spans.push({ start: pos, end: pos + content.length, type: tk.type });
          pos += content.length;
        } else if (Array.isArray(content)) {
          pos = walk(content as (string | Prism.Token)[], tk.type, pos);
        } else {
          pos = walk([content as Prism.Token], tk.type, pos);
        }
      }
    }
    return pos;
  };

  walk(tokens, undefined, 0);
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

/** 相对某一行的着色区间（start/end 为行内相对下标） */
export interface LineSpan {
  start: number;
  end: number;
  type: string;
}

/** 将绝对下标的着色区间按行切分，供逐行绘制 */
export function splitSpansByLine(
  spans: TokenSpan[],
  lines: string[],
): LineSpan[][] {
  const result: LineSpan[][] = lines.map(() => []);
  for (const span of spans) {
    let li = 0;
    // 找到 span.start 所在行
    let offset = 0;
    while (li < lines.length && offset + lines[li].length + 1 <= span.start) {
      offset += lines[li].length + 1;
      li++;
    }
    let pos = span.start;
    while (pos < span.end && li < lines.length) {
      const lineLen = lines[li].length;
      const relStart = pos - offset;
      const relEnd = Math.min(span.end - offset, lineLen);
      if (relEnd > relStart) {
        result[li].push({ start: relStart, end: relEnd, type: span.type });
      }
      offset += lineLen + 1;
      pos = offset;
      li++;
    }
  }
  return result;
}

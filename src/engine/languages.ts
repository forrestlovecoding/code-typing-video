import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-yaml';

export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', file: 'app.js' },
  { id: 'typescript', label: 'TypeScript', file: 'app.ts' },
  { id: 'tsx', label: 'React TSX', file: 'App.tsx' },
  { id: 'python', label: 'Python', file: 'main.py' },
  { id: 'java', label: 'Java', file: 'Main.java' },
  { id: 'go', label: 'Go', file: 'main.go' },
  { id: 'c', label: 'C', file: 'main.c' },
  { id: 'cpp', label: 'C++', file: 'main.cpp' },
  { id: 'csharp', label: 'C#', file: 'Program.cs' },
  { id: 'rust', label: 'Rust', file: 'main.rs' },
  { id: 'php', label: 'PHP', file: 'index.php' },
  { id: 'sql', label: 'SQL', file: 'query.sql' },
  { id: 'bash', label: 'Bash', file: 'run.sh' },
  { id: 'json', label: 'JSON', file: 'data.json' },
  { id: 'css', label: 'CSS', file: 'style.css' },
  { id: 'yaml', label: 'YAML', file: 'config.yml' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export function grammarOf(id: LanguageId): Prism.Grammar {
  const g = (Prism.languages as Record<string, Prism.Grammar | undefined>)[id];
  return g ?? Prism.languages.plain!;
}

export function filenameOf(id: LanguageId): string {
  return LANGUAGES.find((l) => l.id === id)?.file ?? 'main.txt';
}

import { cn } from '../../lib/cn';
import type { CodeSnippet } from '../../content/code-snippets';

interface CodeTerminalProps {
  readonly snippet: CodeSnippet;
  readonly className?: string;
}

const labelByLanguage: Record<CodeSnippet['language'], string> = {
  bash: 'shell',
  ts: 'typescript',
  json: 'json',
};

export function CodeTerminal({ snippet, className }: CodeTerminalProps) {
  return (
    <figure
      className={cn('surface-card overflow-hidden text-left shadow-card-elevated', className)}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-keeta/70" />
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          {snippet.title} · {labelByLanguage[snippet.language]}
        </div>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-6 text-zinc-200">
        <code>{snippet.code}</code>
      </pre>
      {snippet.caption ? (
        <figcaption className="border-t border-white/5 px-5 py-3 text-xs text-zinc-500">
          {snippet.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

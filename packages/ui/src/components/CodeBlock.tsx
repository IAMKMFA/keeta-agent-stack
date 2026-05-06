import { cn } from '../utils/cn.js';

export type CodeLanguage = 'bash' | 'ts' | 'tsx' | 'js' | 'json' | 'sh' | 'plain';

interface CodeBlockProps {
  readonly code: string;
  readonly language?: CodeLanguage;
  readonly inline?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

const languageLabel: Record<CodeLanguage, string> = {
  bash: 'shell',
  sh: 'shell',
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  json: 'json',
  plain: 'text',
};

/**
 * Lightweight, dependency-free code surface. The website does not bundle
 * a syntax highlighter today; copy is plain monospace with a subtle
 * gutter. Future phases can swap in a tree-shakeable highlighter without
 * changing the public prop surface.
 */
export function CodeBlock({
  code,
  language = 'plain',
  inline = false,
  className,
  ariaLabel,
}: CodeBlockProps) {
  if (inline) {
    return (
      <code
        aria-label={ariaLabel}
        className={cn(
          'rounded-sm bg-white/5 px-1.5 py-0.5 font-mono text-[12.5px] text-zinc-100',
          className
        )}
      >
        {code}
      </code>
    );
  }
  return (
    <pre
      aria-label={ariaLabel ?? `Code sample (${languageLabel[language]})`}
      className={cn(
        'overflow-x-auto rounded-md border border-white/10 bg-graphite/80 px-5 py-4 font-mono text-[12.5px] leading-6 text-zinc-200',
        className
      )}
    >
      <code>{code}</code>
    </pre>
  );
}

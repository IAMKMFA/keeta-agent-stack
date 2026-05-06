import type { ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface TerminalProps {
  readonly title?: ReactNode;
  readonly meta?: ReactNode;
  readonly caption?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Generic dark-mode terminal chrome (traffic-light dots, header, body,
 * caption). Pair with `<CodeBlock>` for syntax-highlighted content, or
 * pass arbitrary children for log streams and multi-line shell output.
 */
export function Terminal({ title, meta, caption, children, className }: TerminalProps) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-lg border border-white/10 bg-panel/85 text-left shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-keeta/70" />
        </div>
        {(title || meta) && (
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
            {title ? <span>{title}</span> : null}
            {meta ? <span className="text-zinc-600">{meta}</span> : null}
          </div>
        )}
      </div>
      <div className="px-5 py-4 font-mono text-[12.5px] leading-6 text-zinc-200">{children}</div>
      {caption ? (
        <figcaption className="border-t border-white/5 px-5 py-3 text-xs text-zinc-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

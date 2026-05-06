import type { ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export interface AccordionItem {
  readonly id: string;
  readonly question: ReactNode;
  readonly answer: ReactNode;
}

interface AccordionProps {
  readonly items: ReadonlyArray<AccordionItem>;
  readonly defaultOpenId?: string;
  readonly className?: string;
}

/**
 * Server-component-friendly accordion built on the native `<details>` /
 * `<summary>` elements. Keyboard, screen reader, and reduced-motion
 * behaviour come from the platform. Use this whenever a single open
 * item at a time is acceptable; for advanced patterns (e.g. multi-open
 * controlled state), build a client variant.
 */
export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  return (
    <div
      className={cn(
        'divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-panel/40',
        className
      )}
    >
      {items.map((item) => {
        const open = item.id === defaultOpenId;
        return (
          <details
            key={item.id}
            open={open || undefined}
            className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-6 text-left text-base font-semibold text-white outline-none focus-visible:text-keeta">
              <span>{item.question}</span>
              <span aria-hidden className="text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-3 text-sm leading-7 text-zinc-400">{item.answer}</div>
          </details>
        );
      })}
    </div>
  );
}

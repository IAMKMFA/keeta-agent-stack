'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export interface TabsItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

interface TabsProps {
  readonly items: ReadonlyArray<TabsItem>;
  readonly defaultId?: string;
  readonly className?: string;
  readonly listClassName?: string;
  readonly ariaLabel?: string;
}

export function Tabs({ items, defaultId, className, listClassName, ariaLabel }: TabsProps) {
  const baseId = useId();
  const initial = defaultId ?? items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? '';
  const [activeId, setActiveId] = useState(initial);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const currentIndex = enabled.findIndex((item) => item.id === activeId);
    if (currentIndex < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = enabled[(currentIndex + 1) % enabled.length];
      if (next) setActiveId(next.id);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = enabled[(currentIndex - 1 + enabled.length) % enabled.length];
      if (prev) setActiveId(prev.id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = enabled[0];
      if (first) setActiveId(first.id);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last) setActiveId(last.id);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'flex flex-wrap gap-1 rounded-md border border-white/10 bg-panel/60 p-1',
          listClassName
        )}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              onClick={() => setActiveId(item.id)}
              onKeyDown={onKey}
              className={cn(
                'inline-flex h-9 items-center rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                item.disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          className="mt-5"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

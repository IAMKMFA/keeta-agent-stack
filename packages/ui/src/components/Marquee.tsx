import type { ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface MarqueeProps {
  readonly children: ReactNode;
  readonly speedSeconds?: number;
  readonly direction?: 'left' | 'right';
  readonly fade?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

/**
 * Pure-CSS marquee. Two children copies are rendered side-by-side and
 * translated; the second copy provides the seamless loop without any
 * JavaScript. Animation respects `prefers-reduced-motion` because the
 * global stylesheet zeroes the duration when the OS flag is set.
 */
export function Marquee({
  children,
  speedSeconds = 28,
  direction = 'left',
  fade = true,
  className,
  ariaLabel,
}: MarqueeProps) {
  const animation = direction === 'left' ? 'keeta-ui-marquee-left' : 'keeta-ui-marquee-right';
  return (
    <div
      role="marquee"
      aria-label={ariaLabel}
      className={cn(
        'relative overflow-hidden',
        fade && '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className
      )}
    >
      <style>{`
        @keyframes keeta-ui-marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes keeta-ui-marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div
        className="flex w-max gap-12"
        style={{
          animation: `${animation} ${speedSeconds}s linear infinite`,
        }}
      >
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center gap-12">
          {children}
        </div>
      </div>
    </div>
  );
}

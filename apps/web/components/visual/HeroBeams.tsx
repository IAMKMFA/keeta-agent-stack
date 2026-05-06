import { cn } from '../../lib/cn';

interface HeroBeamsProps {
  readonly className?: string;
}

/**
 * Decorative SVG light-beams used behind the hero. Pure CSS animation;
 * paused automatically when `prefers-reduced-motion` is set via the
 * global stylesheet override.
 */
export function HeroBeams({ className }: HeroBeamsProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-radial-keeta opacity-90" />
      <div className="absolute inset-0 bg-radial-cyan opacity-90" />
      <svg
        className="absolute left-1/2 top-0 -translate-x-1/2"
        width="1280"
        height="640"
        viewBox="0 0 1280 640"
        fill="none"
      >
        <defs>
          <linearGradient
            id="beam-keeta"
            x1="640"
            y1="0"
            x2="640"
            y2="640"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#44f1a6" stopOpacity="0.45" />
            <stop offset="1" stopColor="#44f1a6" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="beam-cyan"
            x1="640"
            y1="0"
            x2="640"
            y2="640"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5ad7ff" stopOpacity="0.32" />
            <stop offset="1" stopColor="#5ad7ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="animate-beam">
          <path
            d="M -100 80 L 1380 320 L 1380 360 L -100 120 Z"
            fill="url(#beam-keeta)"
            opacity="0.55"
          />
          <path
            d="M 1380 80 L -100 320 L -100 360 L 1380 120 Z"
            fill="url(#beam-cyan)"
            opacity="0.55"
          />
        </g>
      </svg>
    </div>
  );
}

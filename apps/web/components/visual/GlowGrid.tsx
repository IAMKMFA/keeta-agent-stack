import { cn } from '../../lib/cn';

interface GlowGridProps {
  readonly className?: string;
}

export function GlowGrid({ className }: GlowGridProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 bg-grid-faint bg-grid-32 opacity-60',
        '[mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]',
        className
      )}
    />
  );
}

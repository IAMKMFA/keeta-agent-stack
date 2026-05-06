import { cn } from '../../lib/cn';

interface NetworkBackgroundProps {
  readonly className?: string;
  readonly density?: 'low' | 'medium' | 'high';
}

const NODE_COUNTS: Record<NonNullable<NetworkBackgroundProps['density']>, number> = {
  low: 16,
  medium: 28,
  high: 42,
};

/**
 * Decorative starfield + node graph used as a section backdrop. Static
 * SVG; no JS, no external assets, no copyrighted material.
 */
export function NetworkBackground({ className, density = 'medium' }: NetworkBackgroundProps) {
  const count = NODE_COUNTS[density];
  const nodes = Array.from({ length: count }, (_, index) => {
    const x = ((index * 73) % 100) + 0.5;
    const y = ((index * 41) % 100) + 0.5;
    const r = 1 + (index % 3) * 0.4;
    return { x, y, r, key: `node-${index}` };
  });

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden opacity-70', className)}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="net-fade" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#44f1a6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#44f1a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#net-fade)" />
        {nodes.map((node) => (
          <circle
            key={node.key}
            cx={node.x}
            cy={node.y}
            r={node.r * 0.18}
            fill="#5ad7ff"
            opacity={0.65}
          />
        ))}
        {nodes.slice(0, count - 1).map((node, index) => {
          const next = nodes[index + 1];
          if (!next) return null;
          return (
            <line
              key={`link-${node.key}`}
              x1={node.x}
              y1={node.y}
              x2={next.x}
              y2={next.y}
              stroke="#44f1a6"
              strokeOpacity="0.08"
              strokeWidth="0.15"
            />
          );
        })}
      </svg>
    </div>
  );
}

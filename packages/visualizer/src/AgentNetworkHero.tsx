import { motion } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface AgentNetworkHeroProps {
  readonly className?: string;
  readonly ariaLabel?: string;
}

interface AgentNode {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly label: string;
}

interface AgentLink {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly delay: number;
}

const NODES: ReadonlyArray<AgentNode> = [
  { id: 'agent-a', cx: 180, cy: 140, label: 'agent · ops' },
  { id: 'agent-b', cx: 520, cy: 90, label: 'agent · treasury' },
  { id: 'agent-c', cx: 860, cy: 170, label: 'agent · partner' },
  { id: 'rail-keeta', cx: 350, cy: 320, label: 'rail · keeta' },
  { id: 'rail-base', cx: 700, cy: 360, label: 'rail · base' },
  { id: 'audit', cx: 520, cy: 470, label: 'audit · ledger' },
];

const LINKS: ReadonlyArray<AgentLink> = [
  { id: 'l1', from: 'agent-a', to: 'rail-keeta', delay: 0.0 },
  { id: 'l2', from: 'agent-b', to: 'rail-keeta', delay: 0.6 },
  { id: 'l3', from: 'agent-b', to: 'rail-base', delay: 1.2 },
  { id: 'l4', from: 'agent-c', to: 'rail-base', delay: 1.8 },
  { id: 'l5', from: 'rail-keeta', to: 'audit', delay: 2.4 },
  { id: 'l6', from: 'rail-base', to: 'audit', delay: 3.0 },
];

function findNode(id: string): AgentNode {
  const found = NODES.find((n) => n.id === id);
  if (!found) throw new Error(`Unknown agent network node: ${id}`);
  return found;
}

/**
 * Decorative hero composition: agents (top), rails (middle), audit
 * ledger (bottom). Pulses travel along the connecting wires to suggest
 * value moving through the network.
 *
 * Decorative only — no semantic content. Pair with a real text hero.
 */
export function AgentNetworkHero({
  className,
  ariaLabel = 'Decorative diagram: autonomous agents moving value through Keeta rails to a shared audit ledger.',
}: AgentNetworkHeroProps) {
  const reduced = useReducedMotionSafe();

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox="0 0 1040 560"
      className={cn('h-full w-full text-keeta', className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="agent-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="agent-wire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {LINKS.map((link) => {
        const a = findNode(link.from);
        const b = findNode(link.to);
        const id = `wire-${link.id}`;
        return (
          <g key={link.id}>
            <path
              id={id}
              d={`M ${a.cx} ${a.cy} C ${a.cx} ${(a.cy + b.cy) / 2} ${b.cx} ${(a.cy + b.cy) / 2} ${b.cx} ${b.cy}`}
              fill="none"
              stroke="url(#agent-wire)"
              strokeWidth={1.25}
            />
            {!reduced && (
              <motion.circle
                r={3}
                fill="currentColor"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 4.2,
                  delay: link.delay,
                  repeat: Infinity,
                  repeatDelay: 1.4,
                  ease: 'easeInOut',
                }}
              >
                <animateMotion dur="4.2s" begin={`${link.delay}s`} repeatCount="indefinite">
                  <mpath href={`#${id}`} />
                </animateMotion>
              </motion.circle>
            )}
          </g>
        );
      })}

      {NODES.map((node) => (
        <g key={node.id}>
          <circle cx={node.cx} cy={node.cy} r={32} fill="url(#agent-glow)" />
          <circle cx={node.cx} cy={node.cy} r={6} fill="currentColor" opacity={0.85} />
          <circle
            cx={node.cx}
            cy={node.cy}
            r={14}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.25}
          />
          <text
            x={node.cx}
            y={node.cy + 38}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={11}
            fill="currentColor"
            fillOpacity={0.55}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

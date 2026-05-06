import type { SupportLevel } from '@keeta-agent-stack/types';
import { SupportLevelBadge } from './SupportLevelBadge';

const levels: SupportLevel[] = [
  'listed',
  'readable',
  'routable',
  'simulatable',
  'executable',
  'agent-ready',
];

export function SupportLevelLegend() {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <p className="mb-3 text-xs uppercase text-zinc-500">Support level legend</p>
      <div className="flex flex-wrap gap-2">
        {levels.map((level) => (
          <SupportLevelBadge key={level} level={level} />
        ))}
      </div>
    </div>
  );
}

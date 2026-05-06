import type { SupportLevel } from '@keeta-agent-stack/types';

export function DemoBadge({ supportLevel }: { supportLevel?: SupportLevel }) {
  if (supportLevel === 'executable' || supportLevel === 'agent-ready') return null;
  return (
    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-200">
      demo
    </span>
  );
}

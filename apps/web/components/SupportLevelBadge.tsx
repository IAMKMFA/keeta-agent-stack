import type { SupportLevel } from '@keeta-agent-stack/types';
import clsx from 'clsx';

const styles: Record<SupportLevel, string> = {
  listed: 'border-zinc-600 bg-zinc-900 text-zinc-300',
  readable: 'border-sky-900 bg-sky-950 text-sky-200',
  routable: 'border-cyan-900 bg-cyan-950 text-cyan-200',
  simulatable: 'border-keeta/30 bg-keeta/10 text-keeta',
  executable: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  'agent-ready': 'border-teal-300/50 bg-teal-300/15 text-teal-100',
};

export function SupportLevelBadge({ level }: { level?: SupportLevel }) {
  if (!level) return null;
  return (
    <span className={clsx('rounded-full border px-2 py-1 text-xs font-medium', styles[level])}>
      {level}
    </span>
  );
}

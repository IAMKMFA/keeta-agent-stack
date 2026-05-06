import Link from 'next/link';
import type { DemoPreset } from '../lib/presets';

export function PresetSelector({ presets, activeId }: { presets: DemoPreset[]; activeId: string }) {
  return (
    <div className="grid gap-2">
      {presets.map((preset) => (
        <Link
          key={preset.id}
          href={`?preset=${preset.id}`}
          className={
            preset.id === activeId
              ? 'rounded-md border border-keeta/40 bg-keeta/10 p-3 text-sm text-white'
              : 'rounded-md border border-white/10 bg-black/20 p-3 text-sm text-zinc-300'
          }
        >
          {preset.title}
        </Link>
      ))}
    </div>
  );
}

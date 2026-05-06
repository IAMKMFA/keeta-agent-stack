import type { SupportLevel, VenueKind } from '@keeta-agent-stack/types';
import { DemoBadge } from './DemoBadge';
import { SupportLevelBadge } from './SupportLevelBadge';

export interface ConnectivityRow {
  id: string;
  label: string;
  kind: VenueKind;
  supportLevel: SupportLevel;
  source: 'registered' | 'preset-only';
  features: string[];
}

export function ConnectivityTable({ rows }: { rows: ConnectivityRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-panel">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3">Rail</th>
            <th className="px-4 py-3">Kind</th>
            <th className="px-4 py-3">Support</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Features</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="px-4 py-3 font-medium text-white">{row.label}</td>
              <td className="px-4 py-3 text-zinc-300">{row.kind}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <SupportLevelBadge level={row.supportLevel} />
                  <DemoBadge supportLevel={row.supportLevel} />
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-400">{row.source}</td>
              <td className="px-4 py-3 text-zinc-400">{row.features.slice(0, 4).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

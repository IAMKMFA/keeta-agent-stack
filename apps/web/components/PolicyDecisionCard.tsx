import type { PolicyDecision } from '@keeta-agent-stack/types';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export function PolicyDecisionCard({ decision }: { decision?: PolicyDecision }) {
  const allowed = decision?.allowed === true;
  const Icon = allowed ? CheckCircle2 : ShieldAlert;
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <div className="flex items-start gap-3">
        <Icon className={allowed ? 'mt-1 h-5 w-5 text-keeta' : 'mt-1 h-5 w-5 text-amber-300'} />
        <div>
          <p className="text-xs uppercase text-zinc-500">Policy decision</p>
          <h2 className="mt-1 text-xl font-semibold">
            {allowed ? 'Approved' : 'Blocked or pending'}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">{decision?.summary ?? 'No policy result'}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {decision?.contributions.slice(0, 5).map((rule) => (
          <div
            key={rule.ruleId}
            className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2 text-sm"
          >
            <span className="text-zinc-300">{rule.ruleId}</span>
            <span className={rule.passed ? 'text-keeta' : 'text-amber-300'}>
              {rule.passed ? 'pass' : 'block'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

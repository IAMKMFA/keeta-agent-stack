export function StatusCard({
  title,
  value,
  hint,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'good'
      ? 'border-[rgba(50,149,144,0.45)]'
      : tone === 'warn'
        ? 'border-[rgba(204,147,56,0.48)]'
        : tone === 'danger'
          ? 'border-[rgba(190,63,67,0.4)]'
          : 'border-[var(--hub-line)]';

  return (
    <div className={`hub-soft-panel animate-rise px-4 py-4 shadow-sm ${toneClass}`}>
      <div className="hub-kicker">{title}</div>
      <div className="hub-heading mt-2 text-2xl font-semibold text-[var(--hub-ink)]">{value}</div>
      {hint ? <div className="mt-2 text-sm text-[var(--hub-muted)]">{hint}</div> : null}
    </div>
  );
}

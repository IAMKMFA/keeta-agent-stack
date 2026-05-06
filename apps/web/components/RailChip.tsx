export function RailChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-cyanline/30 px-3 py-1 text-xs text-cyanline">
      {label}
    </span>
  );
}

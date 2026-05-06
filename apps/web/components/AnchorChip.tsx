export function AnchorChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-keeta/30 px-3 py-1 text-xs text-keeta">
      {label}
    </span>
  );
}

export function RouteModeToggle({ modes }: { modes: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode, index) => (
        <span
          key={mode}
          className={
            index === 0
              ? 'rounded-md bg-keeta px-3 py-2 text-sm font-semibold text-black'
              : 'rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300'
          }
        >
          {mode}
        </span>
      ))}
    </div>
  );
}

import { Marquee } from '@keeta-agent-stack/ui';
import { trustStripItems } from '../../content/home';

/**
 * Twelve capability labels rendered as a continuously-scrolling marquee.
 * Each label cites the package or app that backs it. The marquee
 * respects `prefers-reduced-motion` (the global stylesheet zeroes the
 * animation duration) and falls back to a static strip on small
 * viewports where wrapping is more legible than scrolling.
 */
export function TrustStrip() {
  return (
    <section aria-label="Capabilities at a glance" className="border-y border-white/5 bg-panel/30">
      <div className="mx-auto hidden max-w-[88rem] px-3 py-5 md:block">
        <Marquee speedSeconds={42} fade ariaLabel="Capabilities at a glance">
          {trustStripItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-3 whitespace-nowrap">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-keeta/60" />
              <span className="text-sm font-semibold text-white">{item.label}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                {item.evidence}
              </span>
            </span>
          ))}
        </Marquee>
      </div>
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-3 px-5 py-6 text-xs sm:grid-cols-3 md:hidden">
        {trustStripItems.map((item) => (
          <li key={item.label} className="flex flex-col">
            <span className="text-sm font-semibold text-white">{item.label}</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              {item.evidence}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

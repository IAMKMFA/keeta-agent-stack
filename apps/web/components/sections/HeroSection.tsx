import Link from 'next/link';
import { ArrowRight, Github, Sparkles } from 'lucide-react';
import { heroContent } from '../../content/home';
import { siteConfig } from '../../lib/site-config';
import { HeroBeams } from '../visual/HeroBeams';
import { GlowGrid } from '../visual/GlowGrid';
import { LazyAgentNetworkHero } from '../visual/LazyAgentNetworkHero';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBeams />
      <GlowGrid />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] opacity-25 [mask-image:radial-gradient(closest-side,black,transparent)] motion-reduce:opacity-15"
      >
        <LazyAgentNetworkHero />
      </div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-keeta/30 bg-keeta/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-keeta">
            <Sparkles className="h-3.5 w-3.5" />
            {heroContent.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tightish text-white md:text-7xl">
            {heroContent.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-300">
            {heroContent.subheadline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={heroContent.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-md bg-keeta px-5 py-3 font-semibold text-black transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-keeta/70"
            >
              {heroContent.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={heroContent.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-medium text-zinc-100 transition-colors hover:border-keeta/40 hover:text-white focus-visible:ring-2 focus-visible:ring-keeta/70"
            >
              {heroContent.secondaryCta.label}
            </Link>
            <Link
              href={heroContent.tertiaryCta.href}
              className="inline-flex items-center gap-2 rounded-md px-5 py-3 font-medium text-zinc-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-keeta/70"
            >
              {heroContent.tertiaryCta.label}
            </Link>
            <Link
              href={siteConfig.repoUrl}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-keeta/70"
              aria-label="View source on GitHub"
            >
              <Github className="h-4 w-4" />
              <span className="font-mono">github.com/IAMKMFA/keeta-agent-stack</span>
            </Link>
          </div>
        </div>

        <div className="surface-card glow-field motion-surface relative p-6 shadow-card-elevated">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-keeta/60 to-transparent" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            execution pipeline
          </p>
          <div
            aria-hidden
            className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10 motion-reduce:hidden"
          >
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-keeta/20 via-keeta/70 to-cyanline/20" />
            <span className="pipeline-packet" />
          </div>
          <ol className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Intent', 'Typed schema'],
              ['Quote', 'Adapter price'],
              ['Route', 'Multi-hop plan'],
              ['Policy', 'Pack-driven gate'],
              ['Simulate', 'Pre-execute preview'],
              ['Execute', 'Worker-only signer'],
            ].map(([title, hint]) => (
              <li
                key={title}
                className="motion-surface rounded-md border border-line bg-black/30 p-4 transition-colors hover:border-keeta/30"
              >
                <p className="text-xs uppercase text-zinc-500">{title}</p>
                <p className="mt-1.5 text-sm text-zinc-200">{hint}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-zinc-500">
            Default site posture is demo mode. No live API call until both env flags are set.
          </p>
        </div>
      </div>
    </section>
  );
}

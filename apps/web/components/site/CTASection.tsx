import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

interface CTAActionLink {
  readonly label: string;
  readonly href: string;
}

interface CTASectionProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description: string;
  readonly primary: CTAActionLink;
  readonly secondary?: CTAActionLink;
  readonly className?: string;
}

export function CTASection({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  className,
}: CTASectionProps) {
  return (
    <section className={cn('mx-auto max-w-7xl px-5 py-16', className)}>
      <div className="surface-card relative overflow-hidden p-8 md:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-radial-keeta opacity-80"
        />
        <div className="relative">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-widest text-keeta">{eyebrow}</p>
          ) : null}
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold text-white md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-300">
            {description}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={primary.href}
              className="inline-flex items-center gap-2 rounded-md bg-keeta px-5 py-3 font-semibold text-black transition-transform hover:-translate-y-0.5"
            >
              {primary.label}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            {secondary ? (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-medium text-zinc-100 transition-colors hover:border-keeta/40 hover:text-white"
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

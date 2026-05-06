import type { Metadata } from 'next';
import { siteConfig } from './site-config';

interface BuildMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

const titleTemplate = (title?: string): string =>
  title ? `${title} · ${siteConfig.name}` : siteConfig.name;

export function buildMetadata(options: BuildMetadataOptions = {}): Metadata {
  const description = options.description ?? siteConfig.description;
  const url = options.path ? `${siteConfig.url}${options.path}` : siteConfig.url;

  return {
    title: titleTemplate(options.title),
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: siteConfig.name,
      title: titleTemplate(options.title),
      description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleTemplate(options.title),
      description,
      images: [siteConfig.ogImage],
    },
    robots: options.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export const defaultMetadata: Metadata = buildMetadata();

import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { MotionProvider } from '../components/motion/MotionProvider';
import { defaultMetadata } from '../lib/seo';
import { siteConfig } from '../lib/site-config';

export const metadata = defaultMetadata;

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-graphite text-zinc-100 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-keeta focus:px-3 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <MotionProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}

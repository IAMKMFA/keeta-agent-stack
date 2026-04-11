import type { Metadata } from 'next';
import { Inter, Fragment_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Shell } from '../components/Shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const mono = Fragment_Mono({ subsets: ['latin'], weight: '400', variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Keeta Agent Hub',
  description: 'Execution and payment intelligence control plane',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

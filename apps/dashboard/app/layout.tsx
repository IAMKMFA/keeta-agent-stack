import type { Metadata } from 'next';
import { Inter, Fragment_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Shell } from '../components/Shell';
import { getViewer } from '../lib/auth';
import { navForViewer } from '../lib/nav';
import { issueCsrfToken } from '../lib/csrf';
import { isDashboardV2Enabled } from '../lib/flags';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const mono = Fragment_Mono({ subsets: ['latin'], weight: '400', variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Keeta Agent Hub',
  description: 'Institutional execution and payment intelligence control plane',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const v2Enabled = isDashboardV2Enabled();
  const nav = navForViewer(viewer, { v2Enabled });
  void (await issueCsrfToken());

  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable}`}>
        <Shell
          viewer={{
            role: viewer.role,
            displayName: viewer.displayName,
            tenantId: viewer.tenantId,
          }}
          nav={nav}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}

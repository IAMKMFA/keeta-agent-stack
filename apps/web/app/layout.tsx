import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Nav } from '../components/Nav';

export const metadata: Metadata = {
  title: 'Keeta Agent Stack',
  description: 'Agent-ready Keeta execution rails, routing, policy, and simulated public demos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}

import { requireRole } from '../../../lib/auth';

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['admin', 'operator']);
  return <>{children}</>;
}

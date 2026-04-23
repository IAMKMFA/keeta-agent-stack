import { requireRole } from '../../../lib/auth';
import { requireV2Enabled } from '../../../lib/flags';

export default async function ExecLayout({ children }: { children: React.ReactNode }) {
  requireV2Enabled();
  await requireRole(['admin', 'operator', 'exec']);
  return <>{children}</>;
}

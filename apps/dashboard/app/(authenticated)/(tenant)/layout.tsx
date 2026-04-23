import { requireRole } from '../../../lib/auth';
import { requireV2Enabled } from '../../../lib/flags';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  requireV2Enabled();
  await requireRole(['admin', 'operator', 'tenant']);
  return <>{children}</>;
}

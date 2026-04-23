import { redirect } from 'next/navigation';
import { getViewer } from '../lib/auth';
import { roleHome } from '../lib/permissions';
import { isDashboardV2Enabled } from '../lib/flags';

export const dynamic = 'force-dynamic';

/**
 * Role-home router for `/`.
 *
 * - With V2 enabled: viewers land on their role-specific home
 *   (`/command-center`, `/overview`, `/home`, …).
 * - With V2 disabled: authenticated viewers land on the preserved legacy
 *   operator root so they never lose their fallback. Anonymous viewers
 *   still go to `/login` exactly as in the V2 case.
 */
export default async function RootRedirect() {
  const viewer = await getViewer();
  if (viewer.role === 'anonymous') {
    redirect('/login');
  }
  if (!isDashboardV2Enabled()) {
    redirect('/legacy');
  }
  redirect(roleHome(viewer.role));
}

import { killSwitchHandler } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return killSwitchHandler(req, 'disengage');
}

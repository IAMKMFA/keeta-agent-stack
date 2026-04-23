/**
 * Shared handler for both kill-switch mutation routes.
 *
 * Enforces the full CSRF / role / confirmation contract from the dashboard
 * v2 security addendum (A3) and then returns `501 Not Implemented` with a
 * structured error body. The proxy is intentionally incomplete until a
 * dedicated backend endpoint is designed (the existing Fastify surface has
 * no `/ops/kill-switch` POST). Fronting the real action with this guarded
 * placeholder ensures that when the backend lands we only need to change
 * the terminal fetch, not the full auth pipeline.
 */
import { requireScope } from '../../../../lib/auth';
import { requireSameOriginMutation, verifyCsrfToken } from '../../../../lib/csrf';
import { audit } from '../../../../lib/audit';

export type KillSwitchAction = 'engage' | 'disengage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function readConfirm(req: Request): Promise<string | null> {
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as unknown;
      if (body && typeof body === 'object' && 'confirm' in body) {
        const confirm = (body as { confirm?: unknown }).confirm;
        return typeof confirm === 'string' ? confirm : null;
      }
      return null;
    }
    const form = await req.formData();
    const confirm = form.get('confirm');
    return typeof confirm === 'string' ? confirm : null;
  } catch {
    return null;
  }
}

export async function killSwitchHandler(req: Request, action: KillSwitchAction): Promise<Response> {
  const originBlock = requireSameOriginMutation(req);
  if (originBlock) return originBlock;

  const csrfBlock = await verifyCsrfToken(req);
  if (csrfBlock) return csrfBlock;

  const viewer = await requireScope('kill_switch:write');

  const expected = action === 'engage' ? 'ENGAGE' : 'DISENGAGE';
  const confirm = await readConfirm(req);
  if (confirm !== expected) {
    await audit({
      actor: viewer.displayName ?? viewer.role,
      role: viewer.role,
      tenantId: viewer.tenantId,
      action: `kill_switch:${action}`,
      outcome: 'rejected_unconfirmed',
    });
    return jsonResponse(400, {
      error: {
        code: 'kill_switch_confirmation_required',
        message: `Confirmation field must equal "${expected}".`,
      },
    });
  }

  await audit({
    actor: viewer.displayName ?? viewer.role,
    role: viewer.role,
    tenantId: viewer.tenantId,
    action: `kill_switch:${action}`,
    outcome: 'pending_backend',
  });

  return jsonResponse(501, {
    error: {
      code: 'kill_switch_backend_pending',
      message:
        'Kill-switch mutation is guarded on the dashboard but the backend endpoint is not yet implemented.',
      action,
    },
  });
}

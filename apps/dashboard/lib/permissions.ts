export type Role = 'admin' | 'operator' | 'tenant' | 'exec' | 'anonymous';

export type Capability =
  | 'ops:read'
  | 'ops:write'
  | 'tenant:read'
  | 'tenant:write'
  | 'exec:read'
  | 'kill_switch:read'
  | 'kill_switch:write'
  | 'webhooks:read'
  | 'webhooks:write'
  | 'policy:read'
  | 'policy:write'
  | 'rails:read';

export interface Viewer {
  role: Role;
  displayName?: string;
  tenantId?: string;
  scopes: Capability[];
}

export const ANONYMOUS_VIEWER: Viewer = { role: 'anonymous', scopes: [] };

export function hasRole(viewer: Viewer, roles: readonly Role[]): boolean {
  return roles.includes(viewer.role);
}

export function hasScope(viewer: Viewer, scope: Capability): boolean {
  return viewer.scopes.includes(scope);
}

/**
 * Role-home routing: where a given viewer should land when they hit `/`.
 */
export function roleHome(role: Role): string {
  switch (role) {
    case 'admin':
    case 'operator':
      return '/command-center';
    case 'exec':
      return '/overview';
    case 'tenant':
      return '/home';
    case 'anonymous':
    default:
      return '/login';
  }
}

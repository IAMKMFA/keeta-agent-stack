/**
 * Error thrown when a runtime crosses a custody boundary it must not cross.
 *
 * Examples:
 *   - A non-worker runtime tries to materialise a Keeta signing `UserClient`.
 *   - A browser/dashboard bundle is found exporting a server-only secret name.
 *   - The MCP server is asked to consume an inline `seed` argument while
 *     `MCP_ALLOW_INLINE_SEEDS` is not explicitly enabled.
 *
 * The error includes a stable `code` so callers can branch on intent without
 * string matching, and an optional `detail` payload for telemetry.
 */
export class CustodyBoundaryError extends Error {
  readonly code: CustodyBoundaryErrorCode;
  readonly detail?: Record<string, unknown>;

  constructor(
    code: CustodyBoundaryErrorCode,
    message: string,
    detail?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CustodyBoundaryError';
    this.code = code;
    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}

export type CustodyBoundaryErrorCode =
  | 'WRONG_RUNTIME_FOR_SIGNING'
  | 'BROWSER_SECRET_EXPOSED'
  | 'INLINE_SEED_DISALLOWED'
  | 'PRIVILEGED_ENV_IN_PUBLIC_NAMESPACE'
  | 'PRIVILEGED_ENV_IN_NON_OWNER_RUNTIME';

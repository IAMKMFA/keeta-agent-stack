import { createHash, randomBytes } from 'node:crypto';
import pino from 'pino';
import type { Signer } from './signer.js';

const log = pino({ name: 'dev-signer' });

function assertDevSignerAllowed(): void {
  const prod = process.env.NODE_ENV === 'production';
  const allow = process.env.ALLOW_DEV_SIGNER === 'true' || process.env.ALLOW_DEV_SIGNER === '1';
  if (prod && !allow) {
    throw new Error('DevSigner is disabled in production unless ALLOW_DEV_SIGNER=true');
  }
}

/**
 * Deterministic dev-only signer — does not protect keys; never use in production workloads.
 */
export function createDevSigner(label = 'dev'): Signer {
  assertDevSignerAllowed();
  const salt = randomBytes(8).toString('hex');
  const publicId = `dev:${label}:${salt}`;

  log.warn({ publicId }, 'DevSigner active — not for production');

  return {
    publicId,
    async sign(message: Uint8Array): Promise<Uint8Array> {
      const h = createHash('sha256').update(message).update(publicId).digest();
      return new Uint8Array(h);
    },
  };
}

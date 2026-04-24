import type { Signer } from '@keeta-agent-stack/wallet';

/**
 * Bridge between Keeta transaction bytes and the wallet `Signer` interface.
 * TODO: map Keeta signing payloads once real SDK types exist.
 */
export async function signPayload(signer: Signer, payload: Uint8Array): Promise<Uint8Array> {
  return signer.sign(payload);
}

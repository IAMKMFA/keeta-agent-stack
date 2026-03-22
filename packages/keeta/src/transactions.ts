import type { Signer } from '@keeta-agent-sdk/wallet';

export interface UnsignedTransfer {
  to: string;
  assetId: string;
  amount: string;
  memo?: string;
}

export async function buildTransferTx(tx: UnsignedTransfer): Promise<Uint8Array> {
  void tx;
  // TODO: construct real Keeta transfer payload bytes
  return new Uint8Array([0]);
}

export async function submitTx(_signed: Uint8Array): Promise<{ txId: string }> {
  void _signed;
  // TODO: broadcast to Keeta network
  return { txId: '0xTODO' };
}

/** Uses Signer interface only — never raw private keys in this package. */
export async function signAndSubmit(
  tx: UnsignedTransfer,
  signer: Signer
): Promise<{ txId: string }> {
  const raw = await buildTransferTx(tx);
  const signed = await signer.sign(raw);
  return submitTx(signed);
}

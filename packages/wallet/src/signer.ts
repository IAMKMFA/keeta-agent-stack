/** Signing boundary — implementations live outside agent-runtime hot path. */
export interface Signer {
  readonly publicId: string;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

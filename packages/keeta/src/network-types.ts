import type { UserClient } from '@keetanetwork/keetanet-client';

/** Network alias accepted by `Client.fromNetwork` / `UserClient.fromNetwork` */
export type KeetaNetworkName = Parameters<typeof UserClient.fromNetwork>[0];

export interface BalanceEntry {
  assetId: string;
  amount: string;
}

export async function getBalances(_address: string): Promise<BalanceEntry[]> {
  // TODO: query Keeta ledger for balances
  return [];
}

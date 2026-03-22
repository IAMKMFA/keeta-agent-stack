export interface KeetaAccount {
  address: string;
  // TODO: extend with Keeta account fields
}

export class AccountManager {
  // TODO: inject real Keeta client
  async getAccount(address: string): Promise<KeetaAccount | null> {
    void address;
    return null;
  }
}

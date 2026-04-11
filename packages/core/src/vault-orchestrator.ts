import type { VaultOrchestrator } from './future-hooks.js';

/** In-memory registry of sub-accounts / vault roles for multi-account agent flows. */
export class InMemoryVaultOrchestrator implements VaultOrchestrator {
  private readonly subs = new Map<string, Record<string, unknown>>();

  registerSubAccount(id: string, meta: Record<string, unknown>): void {
    this.subs.set(id, meta);
  }

  /** Test / operator helpers — not part of the VaultOrchestrator interface. */
  getSubAccountMeta(id: string): Record<string, unknown> | undefined {
    return this.subs.get(id);
  }

  listSubAccountIds(): string[] {
    return [...this.subs.keys()];
  }
}

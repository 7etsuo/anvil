/**
 * Multi-currency wallet (gold, shards, keys, …).
 */

export type CurrencyId = string;

export type WalletSnapshot = Record<CurrencyId, number>;

export class Wallet {
  private bal = new Map<CurrencyId, number>();

  constructor(initial?: WalletSnapshot) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        this.bal.set(k, Math.max(0, Math.floor(v)));
      }
    }
  }

  get(currency: CurrencyId): number {
    return this.bal.get(currency) ?? 0;
  }

  set(currency: CurrencyId, amount: number): void {
    this.bal.set(currency, Math.max(0, Math.floor(amount)));
  }

  add(currency: CurrencyId, amount: number): number {
    const n = this.get(currency) + Math.floor(amount);
    this.set(currency, n);
    return this.get(currency);
  }

  /** Returns false if insufficient. */
  spend(currency: CurrencyId, amount: number): boolean {
    const a = Math.floor(amount);
    if (this.get(currency) < a) return false;
    this.set(currency, this.get(currency) - a);
    return true;
  }

  canAfford(costs: WalletSnapshot): boolean {
    for (const [k, v] of Object.entries(costs)) {
      if (this.get(k) < v) return false;
    }
    return true;
  }

  /** Spend multiple currencies; all-or-nothing. */
  spendMany(costs: WalletSnapshot): boolean {
    if (!this.canAfford(costs)) return false;
    for (const [k, v] of Object.entries(costs)) {
      this.spend(k, v);
    }
    return true;
  }

  snapshot(): WalletSnapshot {
    const out: WalletSnapshot = {};
    for (const [k, v] of this.bal) out[k] = v;
    return out;
  }

  serialize(): WalletSnapshot {
    return this.snapshot();
  }

  static deserialize(data: WalletSnapshot): Wallet {
    return new Wallet(data);
  }
}

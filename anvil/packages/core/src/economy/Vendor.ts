/**
 * Vendor / shop: buy & sell against a wallet + inventory hooks.
 */

import type { Wallet, WalletSnapshot } from "../rpg/Wallet.js";

export type VendorOffer = {
  id: string;
  /** Item def id granted on buy */
  itemId: string;
  qty?: number;
  /** Price in currencies */
  price: WalletSnapshot;
  /** Stock; undefined = infinite */
  stock?: number;
  /** Min player level */
  reqLevel?: number;
};

export type VendorDef = {
  id: string;
  name?: string;
  offers: VendorOffer[];
  /** Sell-back ratio of a notional gold price (0–1) */
  sellRatio?: number;
};

export type BuyResult =
  | { ok: true; offerId: string; itemId: string; qty: number }
  | { ok: false; reason: string };

export type SellResult =
  | { ok: true; currency: string; amount: number }
  | { ok: false; reason: string };

export class Vendor {
  readonly def: VendorDef;
  private stock = new Map<string, number>();

  constructor(def: VendorDef) {
    this.def = def;
    for (const o of def.offers) {
      if (o.stock != null) this.stock.set(o.id, o.stock);
    }
  }

  listOffers(): VendorOffer[] {
    return this.def.offers.map((o) => ({
      ...o,
      stock: this.stock.has(o.id) ? this.stock.get(o.id) : o.stock,
    }));
  }

  buy(
    offerId: string,
    wallet: Wallet,
    opts?: {
      level?: number;
      /** Called after payment to grant items */
      grant?: (itemId: string, qty: number) => boolean;
    },
  ): BuyResult {
    const offer = this.def.offers.find((o) => o.id === offerId);
    if (!offer) return { ok: false, reason: "missing" };
    if ((offer.reqLevel ?? 0) > (opts?.level ?? 99)) {
      return { ok: false, reason: "level" };
    }
    const stock = this.stock.has(offer.id)
      ? this.stock.get(offer.id)!
      : offer.stock;
    if (stock != null && stock <= 0) return { ok: false, reason: "stock" };
    if (!wallet.canAfford(offer.price)) return { ok: false, reason: "funds" };

    if (!wallet.spendMany(offer.price)) return { ok: false, reason: "funds" };
    const qty = offer.qty ?? 1;
    if (opts?.grant && !opts.grant(offer.itemId, qty)) {
      // refund
      for (const [c, a] of Object.entries(offer.price)) wallet.add(c, a);
      return { ok: false, reason: "grant_failed" };
    }
    if (this.stock.has(offer.id)) {
      this.stock.set(offer.id, (this.stock.get(offer.id) ?? 1) - 1);
    }
    return { ok: true, offerId, itemId: offer.itemId, qty };
  }

  /**
   * Sell item for gold (or primary currency).
   * `baseValue` is vendor's buy price before sellRatio.
   */
  sell(
    wallet: Wallet,
    baseValue: number,
    currency = "gold",
  ): SellResult {
    const ratio = this.def.sellRatio ?? 0.35;
    const amount = Math.max(1, Math.floor(baseValue * ratio));
    wallet.add(currency, amount);
    return { ok: true, currency, amount };
  }
}

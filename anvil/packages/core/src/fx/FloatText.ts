/**
 * Floating combat text / damage numbers (logic only; games render).
 */

export type FloatTextStyle =
  | "damage"
  | "crit"
  | "heal"
  | "mana"
  | "status"
  | "gold"
  | "info";

export type FloatText = {
  id: number;
  x: number;
  y: number;
  text: string;
  style: FloatTextStyle;
  /** Remaining life 0–1 */
  life: number;
  maxLife: number;
  /** Rise speed world units / sec */
  vy: number;
  color?: string;
};

export type FloatTextSpawn = {
  x: number;
  y: number;
  text: string | number;
  style?: FloatTextStyle;
  life?: number;
  vy?: number;
  color?: string;
};

let _id = 0;

export class FloatTextSystem {
  private items: FloatText[] = [];

  spawn(opts: FloatTextSpawn): FloatText {
    const maxLife = opts.life ?? 0.9;
    const t: FloatText = {
      id: ++_id,
      x: opts.x + (Math.random() - 0.5) * 8,
      y: opts.y,
      text: String(opts.text),
      style: opts.style ?? "damage",
      life: maxLife,
      maxLife,
      vy: opts.vy ?? 28,
      color: opts.color,
    };
    this.items.push(t);
    return t;
  }

  damage(x: number, y: number, amount: number, crit = false): FloatText {
    return this.spawn({
      x,
      y,
      text: amount,
      style: crit ? "crit" : "damage",
      color: crit ? "#ffdd44" : "#ff6666",
    });
  }

  heal(x: number, y: number, amount: number): FloatText {
    return this.spawn({
      x,
      y,
      text: `+${amount}`,
      style: "heal",
      color: "#66ff88",
    });
  }

  all(): readonly FloatText[] {
    return this.items;
  }

  /** dt in seconds */
  update(dt: number): void {
    const next: FloatText[] = [];
    for (const t of this.items) {
      t.life -= dt;
      t.y -= t.vy * dt;
      if (t.life > 0) next.push(t);
    }
    this.items = next;
  }

  clear(): void {
    this.items = [];
  }
}

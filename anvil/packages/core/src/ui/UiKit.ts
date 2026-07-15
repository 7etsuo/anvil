/**
 * Immediate-mode-ish UI kit for canvas games (inventory panels, buttons, tooltips).
 * Games draw via UiKit.draw(ctx) each frame after layout/input.
 */

export type UiRect = { x: number; y: number; w: number; h: number };

export interface UiPointer {
  x: number;
  y: number;
  down: boolean;
  clicked: boolean;
}

export interface UiTheme {
  panelBg: string;
  panelBorder: string;
  text: string;
  muted: string;
  accent: string;
  slotBg: string;
  slotBorder: string;
  font: string;
}

export const DEFAULT_UI_THEME: UiTheme = {
  panelBg: "rgba(12,10,8,0.92)",
  panelBorder: "rgba(201,164,108,0.45)",
  text: "#e8e0d4",
  muted: "#8a8274",
  accent: "#c9a46c",
  slotBg: "rgba(30,24,18,0.95)",
  slotBorder: "rgba(120,100,70,0.6)",
  font: "13px system-ui, sans-serif",
};

function hit(r: UiRect, p: UiPointer): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export class UiKit {
  theme: UiTheme;
  private pointer: UiPointer = { x: 0, y: 0, down: false, clicked: false };
  /** Last frame click consumed */
  private clickConsumed = false;

  constructor(theme: Partial<UiTheme> = {}) {
    this.theme = { ...DEFAULT_UI_THEME, ...theme };
  }

  setPointer(x: number, y: number, down: boolean): void {
    const was = this.pointer.down;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.down = down;
    this.pointer.clicked = down && !was;
  }

  beginFrame(): void {
    this.clickConsumed = false;
  }

  endFrame(): void {
    this.pointer.clicked = false;
  }

  panel(
    ctx: CanvasRenderingContext2D,
    r: UiRect,
    title?: string,
  ): void {
    const t = this.theme;
    ctx.fillStyle = t.panelBg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = t.panelBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (title) {
      ctx.fillStyle = t.accent;
      ctx.font = `bold ${t.font}`;
      ctx.fillText(title, r.x + 12, r.y + 22);
    }
  }

  /** Returns true if clicked this frame. */
  button(
    ctx: CanvasRenderingContext2D,
    id: string,
    r: UiRect,
    label: string,
  ): boolean {
    const t = this.theme;
    const hov = hit(r, this.pointer);
    const pressed = hov && this.pointer.down;
    void id;
    ctx.fillStyle = pressed ? "#2a2010" : hov ? "#1e1810" : t.slotBg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = hov ? t.accent : t.slotBorder;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.fillStyle = t.text;
    ctx.font = t.font;
    ctx.textAlign = "center";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 4);
    ctx.textAlign = "left";
    if (hov && this.pointer.clicked && !this.clickConsumed) {
      this.clickConsumed = true;
      return true;
    }
    return false;
  }

  /** Inventory grid; returns clicked slot index or -1. */
  inventoryGrid(
    ctx: CanvasRenderingContext2D,
    origin: { x: number; y: number },
    cols: number,
    rows: number,
    cell: number,
    gap: number,
    items: Array<{ label: string; icon?: string } | null>,
  ): number {
    let clicked = -1;
    const t = this.theme;
    for (let i = 0; i < cols * rows; i++) {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      const r: UiRect = {
        x: origin.x + cx * (cell + gap),
        y: origin.y + cy * (cell + gap),
        w: cell,
        h: cell,
      };
      const item = items[i] ?? null;
      const hov = hit(r, this.pointer);
      ctx.fillStyle = hov ? "#2a2218" : t.slotBg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = hov ? t.accent : t.slotBorder;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      if (item) {
        ctx.fillStyle = t.text;
        ctx.font = "11px system-ui";
        ctx.fillText(item.label.slice(0, 8), r.x + 4, r.y + r.h / 2 + 3);
      }
      if (hov && this.pointer.clicked && !this.clickConsumed) {
        this.clickConsumed = true;
        clicked = i;
      }
    }
    return clicked;
  }

  tooltip(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    y: number,
  ): void {
    if (!lines.length) return;
    const t = this.theme;
    ctx.font = t.font;
    const pad = 8;
    const w =
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const h = lines.length * 16 + pad * 2;
    ctx.fillStyle = t.panelBg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = t.panelBorder;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = t.text;
    lines.forEach((line, i) => {
      ctx.fillText(line, x + pad, y + pad + 12 + i * 16);
    });
  }

  label(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color?: string,
  ): void {
    ctx.fillStyle = color ?? this.theme.text;
    ctx.font = this.theme.font;
    ctx.fillText(text, x, y);
  }
}

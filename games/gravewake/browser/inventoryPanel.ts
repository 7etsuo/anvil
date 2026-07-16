import type {
  CharacterInventoryView,
  CharacterItemView,
  EquipSlot,
  Stats,
} from "@anvil/core";

type Rect = { x: number; y: number; w: number; h: number };

export type InventoryPanelAction =
  | { kind: "equip_best" }
  | { kind: "equip"; uid: string }
  | { kind: "unequip"; slot: EquipSlot }
  | { kind: "sell"; uid: string }
  | { kind: "sell_junk" };

export interface InventoryPanelModel {
  inventory: CharacterInventoryView;
  level: number;
  gold: number;
  stats: Stats;
  /** Per-uid sell prices (only bag items). */
  sellValues?: Record<string, number>;
  canSell?: boolean;
}

export interface InventoryPointer {
  x: number;
  y: number;
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  head: "Head",
  chest: "Chest",
  hands: "Hands",
  feet: "Feet",
  ring: "Ring",
  amulet: "Amulet",
  trinket: "Trinket",
};

const RARITY_COLOR: Record<string, string> = {
  common: "#b8b8b8",
  magic: "#7373ff",
  rare: "#f0c94c", // epic-tier yellow
  unique: "#c88648", // legendary orange
  set: "#48c868",
};

const RARITY_LABEL: Record<string, string> = {
  common: "COMMON",
  magic: "MAGIC",
  rare: "RARE / EPIC",
  unique: "LEGENDARY",
  set: "SET",
};

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function layout(viewW: number, viewH: number, capacity: number): {
  panel: Rect;
  dividerX: number;
  equipment: Record<EquipSlot, Rect>;
  bag: Rect[];
} {
  const w = Math.min(940, viewW - 24);
  const h = Math.min(590, viewH - 116);
  const panel = {
    x: (viewW - w) / 2,
    y: Math.max(10, (viewH - 100 - h) / 2),
    w,
    h,
  };
  const dividerX = panel.x + Math.max(285, panel.w * 0.47);
  const paperX = panel.x + 20;
  const paperW = dividerX - paperX - 12;
  const paperTop = panel.y + 86;
  const paperH = panel.h - 138;
  const slot = clamp(Math.floor(Math.min(paperW / 6.2, paperH / 5.3)), 34, 54);
  const cx = paperX + paperW / 2;
  const left = paperX + 8;
  const right = paperX + paperW - slot - 8;
  const center = cx - slot / 2;
  const y0 = paperTop;
  const y1 = paperTop + paperH * 0.27;
  const y2 = paperTop + paperH * 0.55;
  const y3 = paperTop + paperH - slot;

  const equipment: Record<EquipSlot, Rect> = {
    head: { x: center, y: y0, w: slot, h: slot },
    amulet: { x: right, y: y0 + slot * 0.45, w: slot, h: slot },
    weapon: { x: left, y: y1, w: slot, h: slot },
    chest: { x: center, y: y1, w: slot, h: slot },
    offhand: { x: right, y: y1, w: slot, h: slot },
    hands: { x: left, y: y2, w: slot, h: slot },
    ring: { x: right, y: y2, w: slot, h: slot },
    feet: { x: center, y: y3, w: slot, h: slot },
    trinket: { x: right, y: y3, w: slot, h: slot },
  };

  const cols = 4;
  const rows = Math.max(1, Math.ceil(capacity / cols));
  const gap = viewH < 600 ? 3 : 6;
  const bagLeft = dividerX + 18;
  const bagRight = panel.x + panel.w - 18;
  const bagTop = panel.y + 102;
  const bagBottom = panel.y + panel.h - 46;
  const cell = clamp(
    Math.floor(
      Math.min(
        (bagRight - bagLeft - gap * (cols - 1)) / cols,
        (bagBottom - bagTop - gap * (rows - 1)) / rows,
      ),
    ),
    22,
    54,
  );
  const gridW = cols * cell + (cols - 1) * gap;
  const gridX = bagLeft + Math.max(0, (bagRight - bagLeft - gridW) / 2);
  const bag = Array.from({ length: capacity }, (_, index) => ({
    x: gridX + (index % cols) * (cell + gap),
    y: bagTop + Math.floor(index / cols) * (cell + gap),
    w: cell,
    h: cell,
  }));

  return { panel, dividerX, equipment, bag };
}

function itemAt(
  view: CharacterInventoryView,
  viewW: number,
  viewH: number,
  x: number,
  y: number,
): { item: CharacterItemView; equippedSlot?: EquipSlot } | null {
  const l = layout(viewW, viewH, view.capacity);
  for (const [slot, rect] of Object.entries(l.equipment) as Array<[EquipSlot, Rect]>) {
    const item = view.equipment[slot];
    if (item && contains(rect, x, y)) return { item, equippedSlot: slot };
  }
  for (let index = 0; index < l.bag.length; index++) {
    const item = view.bag[index];
    if (item && contains(l.bag[index]!, x, y)) return { item };
  }
  return null;
}

export function inventoryPanelActionAt(
  view: CharacterInventoryView,
  viewW: number,
  viewH: number,
  x: number,
  y: number,
  opts?: { button?: number; shift?: boolean; canSell?: boolean },
): InventoryPanelAction | null {
  const l = layout(viewW, viewH, view.capacity);
  const bestBtn = inventoryEquipBestButton(viewW, viewH, view.capacity);
  if (contains(bestBtn, x, y)) return { kind: "equip_best" };
  // Sell-junk button (bottom-right of panel)
  const junkBtn: Rect = {
    x: l.panel.x + l.panel.w - 168,
    y: l.panel.y + l.panel.h - 52,
    w: 140,
    h: 26,
  };
  if (opts?.canSell !== false && contains(junkBtn, x, y)) {
    return { kind: "sell_junk" };
  }
  const hit = itemAt(view, viewW, viewH, x, y);
  if (!hit) return null;
  if (hit.equippedSlot) return { kind: "unequip", slot: hit.equippedSlot };
  // Right-click or Shift+click bag item → sell
  if (
    opts?.canSell !== false &&
    !hit.equippedSlot &&
    (opts?.button === 2 || opts?.shift)
  ) {
    return { kind: "sell", uid: hit.item.uid };
  }
  if (hit.item.slot && hit.item.canEquip) return { kind: "equip", uid: hit.item.uid };
  // Non-equippable bag items (gems/pots): right-click already handled; left no-op
  if (opts?.canSell !== false && !hit.item.slot) {
    return { kind: "sell", uid: hit.item.uid };
  }
  return null;
}

export function inventoryEquipBestButton(
  viewW: number,
  viewH: number,
  capacity: number,
): Rect {
  const l = layout(viewW, viewH, capacity);
  return {
    x: l.panel.x + l.panel.w - 320,
    y: l.panel.y + l.panel.h - 52,
    w: 140,
    h: 26,
  };
}

export function inventorySellJunkButton(
  viewW: number,
  viewH: number,
  capacity: number,
): Rect {
  const l = layout(viewW, viewH, capacity);
  return {
    x: l.panel.x + l.panel.w - 168,
    y: l.panel.y + l.panel.h - 52,
    w: 140,
    h: 26,
  };
}

function drawPanelFrame(ctx: CanvasRenderingContext2D, rect: Rect): void {
  const bg = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  bg.addColorStop(0, "rgba(20,16,12,0.98)");
  bg.addColorStop(1, "rgba(6,5,4,0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(211,174,108,0.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.strokeStyle = "rgba(105,79,44,0.65)";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 7.5, rect.y + 7.5, rect.w - 15, rect.h - 15);
}

function drawFallbackIcon(
  ctx: CanvasRenderingContext2D,
  item: CharacterItemView,
  rect: Rect,
): void {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const size = Math.min(rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = RARITY_COLOR[item.rarity] ?? "#bbb";
  ctx.fillStyle = RARITY_COLOR[item.rarity] ?? "#bbb";
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  if (item.defId.includes("gem")) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.2, cy);
    ctx.lineTo(cx, cy + size * 0.25);
    ctx.lineTo(cx - size * 0.2, cy);
    ctx.closePath();
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  } else if (item.defId.includes("potion")) {
    ctx.fillRect(cx - size * 0.11, cy - size * 0.2, size * 0.22, size * 0.08);
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.18, cy - size * 0.1, size * 0.36, size * 0.34, 4);
    ctx.fillStyle = "#9e2424";
    ctx.fill();
    ctx.stroke();
  } else if (item.slot === "ring") {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.font = `bold ${Math.max(10, Math.floor(size * 0.3))}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.name.slice(0, 2).toUpperCase(), cx, cy);
  }
  ctx.restore();
}

function resolveItemImage(
  item: CharacterItemView,
  images: ReadonlyMap<string, CanvasImageSource>,
): CanvasImageSource | undefined {
  const candidates: string[] = [];
  if (item.icon) {
    candidates.push(item.icon);
    // tolerate leading slash / assets/ prefix
    candidates.push(item.icon.replace(/^\/?assets\//, ""));
    candidates.push(item.icon.replace(/^\//, ""));
  }
  // Common conventions when icon field is missing or stale
  candidates.push(`icons/${item.defId}.png`);
  candidates.push(`gear/${item.defId}.png`);
  for (const key of candidates) {
    const img = images.get(key);
    if (img) return img;
  }
  return undefined;
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  item: CharacterItemView,
  rect: Rect,
  images: ReadonlyMap<string, CanvasImageSource>,
): void {
  const image = resolveItemImage(item, images);
  if (image) {
    const pad = Math.max(3, rect.w * 0.09);
    ctx.drawImage(image, rect.x + pad, rect.y + pad, rect.w - pad * 2, rect.h - pad * 2);
  } else {
    drawFallbackIcon(ctx, item, rect);
  }
  if (item.qty > 1) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(rect.x + rect.w - 22, rect.y + rect.h - 16, 20, 14);
    ctx.fillStyle = "#f2eadb";
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(String(item.qty), rect.x + rect.w - 4, rect.y + rect.h - 5);
    ctx.textAlign = "left";
  }
}

function drawSlot(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  item: CharacterItemView | null,
  hovered: boolean,
  images: ReadonlyMap<string, CanvasImageSource>,
): void {
  ctx.fillStyle = hovered ? "rgba(74,57,32,0.92)" : "rgba(28,23,18,0.96)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = item
    ? RARITY_COLOR[item.rarity] ?? "#aaa"
    : hovered
      ? "#c9a46c"
      : "rgba(113,91,61,0.75)";
  ctx.lineWidth = item ? 2 : 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  if (item) drawItem(ctx, item, rect, images);
  else {
    ctx.fillStyle = "#655b4f";
    ctx.font = `bold ${Math.max(8, Math.floor(rect.w * 0.17))}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(label.toUpperCase(), rect.x + rect.w / 2, rect.y + rect.h / 2 + 3);
    ctx.textAlign = "left";
  }
}

function statText(stats: Stats): string {
  return `LIFE ${Math.round(stats.maxHp ?? 0)}   DMG ${Math.round(stats.damage ?? 0)}   ARM ${Math.round(stats.armor ?? 0)}   CRIT ${Math.round((stats.critChance ?? 0) * 100)}%`;
}

function tooltipLines(
  item: CharacterItemView,
  equipped: boolean,
  view: CharacterInventoryView,
): string[] {
  const lines = [item.name];
  lines.push(
    `${RARITY_LABEL[item.rarity] ?? item.rarity.toUpperCase()}${item.itemLevel ? ` · ITEM LV ${item.itemLevel}` : ""}`,
  );
  for (const [key, value] of Object.entries(item.stats)) {
    if (typeof value !== "number" || value === 0) continue;
    const pct = key.toLowerCase().includes("crit") || key.toLowerCase().includes("resist");
    const shown = pct ? `${Math.round(value * 100)}%` : `${value > 0 ? "+" : ""}${Math.round(value)}`;
    lines.push(`${key.replace(/([A-Z])/g, " $1")} ${shown}`);
  }
  if (item.reqLevel && !item.canEquip) lines.push(`Requires level ${item.reqLevel}`);
  if (!equipped && item.slot) {
    const worn = view.equipment[item.slot];
    if (!worn) {
      lines.push(`${SLOT_LABEL[item.slot]} slot is empty`);
    } else {
      const keys = new Set([...Object.keys(item.stats), ...Object.keys(worn.stats)]);
      const deltas = [...keys]
        .map((key) => [key, Number(item.stats[key] ?? 0) - Number(worn.stats[key] ?? 0)] as const)
        .filter(([, delta]) => Math.abs(delta) > 0.0001)
        .slice(0, 3)
        .map(([key, delta]) => `${key} ${delta > 0 ? "+" : ""}${Math.round(delta * 100) / 100}`);
      lines.push(`vs ${worn.name}${deltas.length ? ` · ${deltas.join(" · ")}` : " · similar"}`);
    }
  }
  if (item.flavor) lines.push(item.flavor.slice(0, 46));
  if (item.slot) {
    lines.push(
      equipped
        ? "Click to move to backpack"
        : "Left-click equip · Right-click / Shift-click sell",
    );
  } else {
    lines.push("Click to sell (or right-click)");
  }
  return lines;
}

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  pointer: InventoryPointer,
  viewW: number,
  viewH: number,
): void {
  ctx.font = "12px system-ui";
  const width = Math.min(300, Math.max(210, ...lines.map((line) => ctx.measureText(line).width + 24)));
  const height = lines.length * 18 + 22;
  const x = Math.min(viewW - width - 8, pointer.x + 18);
  const y = Math.min(viewH - height - 8, pointer.y + 18);
  ctx.fillStyle = "rgba(5,4,3,0.98)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(211,174,108,0.75)";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? "#e8c878" : index === lines.length - 1 ? "#8fb98f" : "#c8c0b4";
    ctx.font = index === 0 ? "bold 13px Cinzel, Georgia, serif" : "12px system-ui";
    ctx.fillText(line, x + 12, y + 18 + index * 18);
  });
}

export function drawInventoryPanel(
  ctx: CanvasRenderingContext2D,
  model: InventoryPanelModel,
  images: ReadonlyMap<string, CanvasImageSource>,
  viewW: number,
  viewH: number,
  pointer: InventoryPointer,
): void {
  const view = model.inventory;
  const l = layout(viewW, viewH, view.capacity);
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  ctx.fillRect(0, 0, viewW, viewH);
  drawPanelFrame(ctx, l.panel);

  ctx.fillStyle = "#d1ad72";
  ctx.font = "bold 22px Cinzel, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("CHARACTER & INVENTORY", l.panel.x + l.panel.w / 2, l.panel.y + 34);
  ctx.fillStyle = "#8f8374";
  ctx.font = "12px system-ui";
  ctx.fillText(`Level ${model.level}  ·  Gold ${model.gold}  ·  I or Esc closes`, l.panel.x + l.panel.w / 2, l.panel.y + 55);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(118,90,51,0.55)";
  ctx.beginPath();
  ctx.moveTo(l.dividerX, l.panel.y + 68);
  ctx.lineTo(l.dividerX, l.panel.y + l.panel.h - 24);
  ctx.stroke();

  ctx.fillStyle = "#c9a46c";
  ctx.font = "bold 13px Cinzel, Georgia, serif";
  ctx.fillText("EQUIPMENT", l.panel.x + 24, l.panel.y + 78);
  ctx.fillText(
    `BACKPACK  ${view.used}/${view.capacity}`,
    l.dividerX + 20,
    l.panel.y + 78,
  );
  ctx.fillStyle = view.free > 0 ? "#7f9272" : "#b85c50";
  ctx.font = "11px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`${view.free} free`, l.panel.x + l.panel.w - 22, l.panel.y + 78);
  ctx.textAlign = "left";

  // A subdued body anchors the paper doll without competing with item icons.
  const body = images.get("actors/gravewarden_body.png") ?? images.get("actors/gravewarden_down.png");
  if (body) {
    const bodyW = Math.min(150, (l.dividerX - l.panel.x) * 0.36);
    const bodyH = Math.min(230, l.panel.h * 0.46);
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.drawImage(
      body,
      l.panel.x + (l.dividerX - l.panel.x) / 2 - bodyW / 2,
      l.panel.y + l.panel.h / 2 - bodyH / 2 + 12,
      bodyW,
      bodyH,
    );
    ctx.restore();
  }

  for (const [slot, rect] of Object.entries(l.equipment) as Array<[EquipSlot, Rect]>) {
    const hovered = contains(rect, pointer.x, pointer.y);
    drawSlot(ctx, rect, SLOT_LABEL[slot], view.equipment[slot], hovered, images);
    ctx.fillStyle = "#817566";
    ctx.font = "9px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(SLOT_LABEL[slot], rect.x + rect.w / 2, rect.y + rect.h + 11);
    ctx.textAlign = "left";
  }

  for (let index = 0; index < l.bag.length; index++) {
    const rect = l.bag[index]!;
    const item = view.bag[index] ?? null;
    drawSlot(ctx, rect, "", item, contains(rect, pointer.x, pointer.y), images);
  }

  ctx.fillStyle = "#9d9283";
  ctx.font = "bold 11px system-ui";
  ctx.fillText(statText(model.stats), l.panel.x + 24, l.panel.y + l.panel.h - 56);
  const best = inventoryEquipBestButton(viewW, viewH, view.capacity);
  const bestHovered = contains(best, pointer.x, pointer.y);
  ctx.fillStyle = bestHovered ? "rgba(54,104,62,0.98)" : "rgba(31,70,39,0.96)";
  ctx.fillRect(best.x, best.y, best.w, best.h);
  ctx.strokeStyle = bestHovered ? "#9bd49f" : "#6ca576";
  ctx.strokeRect(best.x + 0.5, best.y + 0.5, best.w - 1, best.h - 1);
  ctx.fillStyle = "#c9efc7";
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("EQUIP BEST", best.x + best.w / 2, best.y + 17);
  ctx.textAlign = "left";
  // Sell junk button
  if (model.canSell !== false) {
    const junk: Rect = {
      x: l.panel.x + l.panel.w - 168,
      y: l.panel.y + l.panel.h - 52,
      w: 140,
      h: 26,
    };
    const jh = contains(junk, pointer.x, pointer.y);
    ctx.fillStyle = jh ? "rgba(120,80,30,0.95)" : "rgba(70,50,20,0.95)";
    ctx.fillRect(junk.x, junk.y, junk.w, junk.h);
    ctx.strokeStyle = "#c9a46c";
    ctx.strokeRect(junk.x + 0.5, junk.y + 0.5, junk.w - 1, junk.h - 1);
    ctx.fillStyle = "#e8c878";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SELL JUNK", junk.x + junk.w / 2, junk.y + 17);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = "#756b5e";
  ctx.font = "10px system-ui";
  ctx.fillText(
    "Equip Best optimizes every slot · L-click equip · R-click / Shift sell",
    l.panel.x + 24,
    l.panel.y + l.panel.h - 18,
  );

  const hovered = itemAt(view, viewW, viewH, pointer.x, pointer.y);
  if (hovered) {
    drawTooltip(
      ctx,
      tooltipLines(hovered.item, !!hovered.equippedSlot, view),
      pointer,
      viewW,
      viewH,
    );
  }
}

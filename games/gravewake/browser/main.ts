/**
 * Gravewake — Diablo-like presentation layer on Anvil kernel.
 * Engine owns sim; this file owns look/feel.
 */
import {
  CanvasRenderFacade,
  createGame,
  observe,
} from "@anvil/core";
import { browserGravewakeModule, getBrowserGravewake } from "./browserModule.js";
import { embeddedAreas } from "./contentEmbed.js";
import type { FxEvent } from "../src/GravewakeGame.js";

const SCALE = 1.25;
/** Full-window logical resolution (updated on resize). */
let VIEW_W = 1280;
let VIEW_H = 720;

const ASSET_URLS: Record<string, string> = {
  "actors/gravewarden.png": "/assets/actors/gravewarden.png",
  "actors/gravewarden_down.png": "/assets/actors/gravewarden_down.png",
  "actors/gravewarden_up.png": "/assets/actors/gravewarden_up.png",
  "actors/gravewarden_right.png": "/assets/actors/gravewarden_right.png",
  "actors/scuttler.png": "/assets/actors/scuttler.png",
  "actors/scuttler_down.png": "/assets/actors/scuttler_down.png",
  "actors/scuttler_right.png": "/assets/actors/scuttler_right.png",
  "actors/wretch.png": "/assets/actors/wretch.png",
  "actors/wretch_down.png": "/assets/actors/wretch_down.png",
  "actors/wretch_right.png": "/assets/actors/wretch_right.png",
  "actors/crypt_guard.png": "/assets/actors/crypt_guard.png",
  "actors/crypt_guard_down.png": "/assets/actors/crypt_guard_down.png",
  "actors/crypt_guard_right.png": "/assets/actors/crypt_guard_right.png",
  "actors/bellwarden.png": "/assets/actors/bellwarden.png",
  "actors/bellwarden_down.png": "/assets/actors/bellwarden_down.png",
  "actors/bellwarden_right.png": "/assets/actors/bellwarden_right.png",
  "env/floor.png": "/assets/env/floor.png",
  "env/wall.png": "/assets/env/wall.png",
};

/** Visual aliases: mob types reuse art sheets with identity tints. */
const ACTOR_SHEET: Record<string, string> = {
  fallen: "scuttler",
  thrall: "scuttler",
  bone_hound: "scuttler",
  plague_scuttler: "scuttler",
  scuttler: "scuttler",
  shade: "wretch",
  wretch: "wretch",
  void_shade: "wretch",
  ash_ghoul: "wretch",
  crypt_archer: "wretch",
  raider: "crypt_guard",
  hell_raider: "crypt_guard",
  crypt_guard: "crypt_guard",
  bone_brute: "crypt_guard",
  death_knight: "bellwarden",
  bone_tyrant: "bellwarden",
  bellwarden: "bellwarden",
  gravewarden: "gravewarden",
};

const ACTOR_TINT: Record<string, string | null> = {
  fallen: "rgba(180,90,40,0.35)",
  thrall: "rgba(100,80,60,0.4)",
  bone_hound: "rgba(220,220,230,0.35)",
  plague_scuttler: "rgba(60,180,40,0.4)",
  scuttler: null,
  shade: "rgba(60,40,120,0.45)",
  wretch: null,
  void_shade: "rgba(40,20,90,0.55)",
  ash_ghoul: "rgba(160,80,40,0.4)",
  crypt_archer: "rgba(90,110,160,0.4)",
  raider: "rgba(120,40,40,0.3)",
  hell_raider: "rgba(200,40,20,0.45)",
  crypt_guard: null,
  bone_brute: "rgba(180,180,200,0.35)",
  death_knight: "rgba(40,0,60,0.4)",
  bone_tyrant: "rgba(200,160,40,0.35)",
  bellwarden: "rgba(80,60,20,0.2)",
  gravewarden: null,
};

const RARITY_COLOR: Record<string, string> = {
  common: "#d0d0d0",
  magic: "#6868ff",
  rare: "#ffcc00",
  unique: "#bf7f3f",
  set: "#00ff00",
};

/** 0=right, 1=down, 2=left, 3=up (canvas y+ is down). */
function dirFromFacing(facing: number): 0 | 1 | 2 | 3 {
  let a = facing;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  if (a >= -Math.PI / 4 && a < Math.PI / 4) return 0;
  if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) return 1;
  if (a >= (3 * Math.PI) / 4 || a < (-3 * Math.PI) / 4) return 2;
  return 3;
}

function dirFromString(d: unknown): 0 | 1 | 2 | 3 | null {
  if (d === "right") return 0;
  if (d === "down") return 1;
  if (d === "left") return 2;
  if (d === "up") return 3;
  return null;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  world?: boolean;
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  pct: number,
  hue: "blood" | "mana",
): void {
  const metal = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  metal.addColorStop(0, "#6a5a40");
  metal.addColorStop(0.4, "#d4b878");
  metal.addColorStop(0.7, "#3a3020");
  metal.addColorStop(1, "#a89060");
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  const fillH = radius * 2 * Math.max(0, Math.min(1, pct));
  const top = cy + radius - fillH;
  const grad = ctx.createLinearGradient(cx, top, cx, cy + radius);
  if (hue === "blood") {
    grad.addColorStop(0, "#e05050");
    grad.addColorStop(0.5, "#a01818");
    grad.addColorStop(1, "#4a0808");
  } else {
    grad.addColorStop(0, "#80c0ff");
    grad.addColorStop(0.5, "#2868c0");
    grad.addColorStop(1, "#0a2040");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, top, radius * 2, fillH);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(cx - radius * 0.7, top, radius * 1.4, 3);

  const hi = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, 2, cx, cy, radius);
  hi.addColorStop(0, "rgba(255,255,255,0.28)");
  hi.addColorStop(0.35, "rgba(255,255,255,0.05)");
  hi.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = hi;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawSkillSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  label: string,
  hotkey: string,
  ready: boolean,
  cdPct = 0,
  accent = "#e8c878",
): void {
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(x, y, size, size);
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, ready ? "#8a7040" : "#403830");
  g.addColorStop(1, ready ? "#3a2a18" : "#1a1510");
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  // icon wash
  ctx.fillStyle = ready ? accent : "#444";
  ctx.globalAlpha = ready ? 0.22 : 0.12;
  ctx.fillRect(x + 4, y + 4, size - 8, size - 18);
  ctx.globalAlpha = 1;
  ctx.fillStyle = ready ? accent : "#666";
  ctx.font = "bold 11px Cinzel, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + size / 2, y + size / 2 + 2);
  ctx.fillStyle = "#bbb";
  ctx.font = "bold 10px system-ui";
  ctx.fillText(hotkey, x + size / 2, y + size - 7);
  if (cdPct > 0.02) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, size, size * Math.min(1, cdPct));
    ctx.fillStyle = "#ccc";
    ctx.font = "bold 12px system-ui";
    ctx.fillText(`${Math.ceil(cdPct * 10) / 10}s`, x + size / 2, y + size / 2 + 4);
  }
  ctx.textAlign = "left";
}

function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "rgba(8,6,4,0.78)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(201,164,108,0.32)";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  if (!mount) throw new Error("#mount missing");

  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(ASSET_URLS).map(async ([key, url]) => {
      images.set(key, await loadImage(url));
    }),
  );

  VIEW_W = Math.max(640, window.innerWidth | 0);
  VIEW_H = Math.max(480, window.innerHeight | 0);

  const renderer = new CanvasRenderFacade(mount);
  await renderer.init(VIEW_W, VIEW_H);

  const handle = await createGame({
    root: "/",
    browser: true,
    headless: false,
    renderer,
    seed: 1,
    modules: [browserGravewakeModule],
    gameYaml: {
      id: "gravewake",
      title: "Gravewake",
      genre: "none",
      modules: [],
      entryScene: "main",
      seed: 1,
      version: "0.3.1",
      contentRoot: "content",
      assetsRoot: "assets",
      schemaVersion: 1,
    },
  });

  renderer.resize(VIEW_W, VIEW_H);

  for (const [path, img] of images) {
    const tex = handle.assets.getTexture(path);
    if (tex.kind === "texture") {
      tex.image = img;
      tex.width = img.naturalWidth;
      tex.height = img.naturalHeight;
    }
  }

  const canvas = renderer.getCanvas();
  if (canvas) {
    canvas.style.outline = "none";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.focus();
    mount.addEventListener("click", () => canvas.focus());
  }

  const applySize = () => {
    VIEW_W = Math.max(640, window.innerWidth | 0);
    VIEW_H = Math.max(480, window.innerHeight | 0);
    renderer.resize(VIEW_W, VIEW_H);
  };
  window.addEventListener("resize", applySize);
  applySize();

  const keysHeld = new Set<string>();
  const syncMove = () => {
    handle.input.setDown("move_up", keysHeld.has("KeyW") || keysHeld.has("ArrowUp"));
    handle.input.setDown("move_down", keysHeld.has("KeyS") || keysHeld.has("ArrowDown"));
    handle.input.setDown("move_left", keysHeld.has("KeyA") || keysHeld.has("ArrowLeft"));
    handle.input.setDown("move_right", keysHeld.has("KeyD") || keysHeld.has("ArrowRight"));
    handle.input.setDown("move_forward", keysHeld.has("KeyW") || keysHeld.has("ArrowUp"));
    handle.input.setDown("move_back", keysHeld.has("KeyS") || keysHeld.has("ArrowDown"));
  };
  window.addEventListener("keydown", (e) => {
    keysHeld.add(e.code);
    handle.input.handleKey(e.code, true);
    syncMove();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keysHeld.delete(e.code);
    handle.input.handleKey(e.code, false);
    syncMove();
  });

  let clickSlash = false;
  mount.addEventListener("mousedown", (e) => {
    if (e.button === 0) clickSlash = true;
  });

  const floor = images.get("env/floor.png")!;
  const wallTex = images.get("env/wall.png")!;

  const ash: Particle[] = [];
  for (let i = 0; i < 70; i++) {
    ash.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 12,
      vy: 8 + Math.random() * 22,
      life: 2 + Math.random() * 4,
      max: 4,
      r: 0.6 + Math.random() * 1.8,
      color: `rgba(${180 + Math.random() * 40},${160 + Math.random() * 30},120,`,
    });
  }
  const combatFx: Particle[] = [];

  let camX = 0;
  let camY = 0;
  let shakeX = 0;
  let shakeY = 0;
  let started = false;
  let lastPlayerX = 0;
  let lastPlayerY = 0;
  let last = performance.now();
  const seenFx = new Set<string>();

  function spawnHitSparks(wx: number, wy: number, n = 10, colorA = "rgba(255,80,60,", colorB = "rgba(255,200,80,"): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      combatFx.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.25 + Math.random() * 0.35,
        max: 0.5,
        r: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? colorA : colorB,
        world: true,
      });
    }
  }

  function actorBase(e: { tags: string[]; data: Record<string, unknown> }): string {
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return "gravewarden";
    for (const t of e.tags) {
      if (ACTOR_SHEET[t]) return t;
    }
    const id = String(e.data.actorId ?? "scuttler");
    return id;
  }

  function spriteForEntity(e: {
    tags: string[];
    data: Record<string, unknown>;
  }): { img: HTMLImageElement | null; flipX: boolean; tint: string | null } {
    const baseId = actorBase(e);
    const sheet = ACTOR_SHEET[baseId] ?? baseId;
    const tint = ACTOR_TINT[baseId] ?? null;
    const dir =
      dirFromString(e.data.dir) ??
      dirFromFacing(Number(e.data.facing ?? Math.PI / 2));

    if (dir === 3) {
      const up =
        images.get(`actors/${sheet}_up.png`) ??
        images.get(`actors/${sheet}_down.png`) ??
        images.get(`actors/${sheet}.png`);
      return { img: up ?? null, flipX: false, tint };
    }
    if (dir === 1) {
      const down =
        images.get(`actors/${sheet}_down.png`) ??
        images.get(`actors/${sheet}.png`);
      return { img: down ?? null, flipX: false, tint };
    }
    if (dir === 0) {
      const right =
        images.get(`actors/${sheet}_right.png`) ??
        images.get(`actors/${sheet}_down.png`);
      return { img: right ?? null, flipX: true, tint };
    }
    const right =
      images.get(`actors/${sheet}_right.png`) ??
      images.get(`actors/${sheet}_down.png`);
    return { img: right ?? null, flipX: false, tint };
  }

  function spriteSize(e: { tags: string[]; data: Record<string, unknown> }): number {
    const id = String(e.data.actorId ?? "");
    if (id === "bone_tyrant") return 148;
    if (id === "bellwarden" || id === "death_knight") return 132;
    if (id === "crypt_guard" || id === "bone_brute" || id === "hell_raider" || id === "raider")
      return 100;
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return 104;
    if (id === "fallen" || id === "bone_hound") return 68;
    if (id === "void_shade" || id === "shade" || id === "crypt_archer") return 84;
    if (e.data.elite) return 92;
    return 78;
  }

  function xpPct(level: number, xp: number): number {
    // progression xpToLevel: [0, 40, 100, ...] — need next threshold
    const table = [0, 40, 100, 180, 280, 400, 550, 750, 1000];
    const cur = table[Math.min(level, table.length - 1)] ?? 0;
    const next = table[Math.min(level + 1, table.length - 1)] ?? cur + 100;
    if (next <= cur) return 1;
    return Math.max(0, Math.min(1, (xp - cur) / (next - cur)));
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const ctx = renderer.getContext();
    if (!ctx) {
      requestAnimationFrame(frame);
      return;
    }

    // --- TITLE ---
    if (!started) {
      ctx.fillStyle = "#050408";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const rg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, 20, VIEW_W / 2, VIEW_H * 0.45, 380);
      rg.addColorStop(0, "#3a2418");
      rg.addColorStop(0.45, "#120e0c");
      rg.addColorStop(1, "#050408");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      for (const p of ash) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > VIEW_H) {
          p.y = -4;
          p.x = Math.random() * VIEW_W;
        }
        ctx.fillStyle = p.color + "0.45)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 64px Cinzel, Georgia, serif";
      ctx.shadowColor = "rgba(201,164,108,0.45)";
      ctx.shadowBlur = 24;
      ctx.fillText("GRAVEWAKE", VIEW_W / 2, VIEW_H / 2 - 48);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#9a8a70";
      ctx.font = "italic 18px Georgia, serif";
      ctx.fillText("The parish no longer answers the bells", VIEW_W / 2, VIEW_H / 2 - 4);
      ctx.fillStyle = "#e6dcc8";
      ctx.font = "bold 18px system-ui";
      ctx.fillText("Click or press any key to begin", VIEW_W / 2, VIEW_H / 2 + 48);
      ctx.fillStyle = "#888";
      ctx.font = "13px system-ui";
      ctx.fillText(
        "WASD move  ·  Space Slash  ·  2 Whirl  ·  3 Smite  ·  1 Potion  ·  F Loot  ·  I Inventory",
        VIEW_W / 2,
        VIEW_H / 2 + 86,
      );
      ctx.fillStyle = "#666";
      ctx.font = "12px system-ui";
      ctx.fillText(
        "Open Ashen Wastes  ·  Dungeons on the map  ·  Endless packs  ·  Hunt forever",
        VIEW_W / 2,
        VIEW_H / 2 + 112,
      );
      ctx.textAlign = "left";

      if (keysHeld.size || clickSlash) {
        started = true;
        clickSlash = false;
      }
      requestAnimationFrame(frame);
      return;
    }

    syncMove();
    if (clickSlash) {
      handle.input.setDown("shoot", true);
      handle.input.setDown("confirm", true);
    }
    handle.tick(dt);
    if (clickSlash) {
      clickSlash = false;
      handle.input.setDown("shoot", false);
      handle.input.setDown("confirm", false);
    }

    const gw = getBrowserGravewake();
    if (!gw) {
      requestAnimationFrame(frame);
      return;
    }

    const player = handle.world.get("player");
    const blob = gw.observeBlob();
    const area = embeddedAreas[String(blob.area)];
    const fx = gw.fx as FxEvent[];
    const cds = (blob.cds as Record<string, number>) ?? {};
    const stats = (blob.stats as {
      damage?: number;
      armor?: number;
      maxHp?: number;
      critChance?: number;
    }) ?? {};

    // camera lerp + shake
    const targetX = (player?.transform?.x ?? 0) * SCALE - VIEW_W / 2;
    const targetY = (player?.transform?.y ?? 0) * SCALE - VIEW_H / 2;
    camX += (targetX - camX) * Math.min(1, dt * 8);
    camY += (targetY - camY) * Math.min(1, dt * 8);
    shakeX *= 0.82;
    shakeY *= 0.82;
    for (const f of fx) {
      if (f.kind === "shake" && f.t > 0.08) {
        shakeX += (Math.random() - 0.5) * f.mag * 2.5;
        shakeY += (Math.random() - 0.5) * f.mag * 2.5;
      }
      if (f.kind === "hit" && f.t > 0.6) {
        const key = `hit-${f.x.toFixed(1)}-${f.y.toFixed(1)}-${f.t.toFixed(2)}`;
        if (!seenFx.has(key)) {
          seenFx.add(key);
          spawnHitSparks(
            f.x,
            f.y,
            f.crit ? 16 : 8,
            f.crit ? "rgba(255,220,80," : "rgba(255,80,60,",
            f.crit ? "rgba(255,255,200," : "rgba(255,200,80,",
          );
        }
      }
      if (f.kind === "kill" && f.t > 0.4) {
        const key = `kill-${f.x.toFixed(0)}-${f.y.toFixed(0)}`;
        if (!seenFx.has(key)) {
          seenFx.add(key);
          spawnHitSparks(f.x, f.y, 18, "rgba(255,180,60,", "rgba(200,40,40,");
        }
      }
    }
    if (seenFx.size > 80) {
      const arr = [...seenFx];
      seenFx.clear();
      for (const k of arr.slice(-40)) seenFx.add(k);
    }
    const viewCamX = camX + shakeX;
    const viewCamY = camY + shakeY;

    // foot dust
    if (player?.transform) {
      const dx = player.transform.x - lastPlayerX;
      const dy = player.transform.y - lastPlayerY;
      if (Math.hypot(dx, dy) > 0.4) {
        combatFx.push({
          x: player.transform.x + (Math.random() - 0.5) * 8,
          y: player.transform.y + 6,
          vx: (Math.random() - 0.5) * 20,
          vy: -10 - Math.random() * 20,
          life: 0.35,
          max: 0.35,
          r: 2 + Math.random() * 2,
          color: "rgba(140,120,90,",
          world: true,
        });
      }
      lastPlayerX = player.transform.x;
      lastPlayerY = player.transform.y;
    }

    // --- WORLD FLOOR ---
    ctx.save();
    ctx.translate(-viewCamX, -viewCamY);
    const pat = ctx.createPattern(floor, "repeat");
    if (pat && area) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, area.width * SCALE, area.height * SCALE);
    }
    if (area) {
      // zone mood wash
      if (blob.area === "crypt") {
        ctx.fillStyle = "rgba(10,8,30,0.35)";
      } else if (blob.area === "parish") {
        ctx.fillStyle = "rgba(40,15,8,0.22)";
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
      }
      ctx.fillRect(0, 0, area.width * SCALE, area.height * SCALE);
    }
    ctx.restore();

    // player light
    if (player?.transform) {
      const lx = player.transform.x * SCALE - viewCamX;
      const ly = player.transform.y * SCALE - viewCamY;
      const lightR = blob.area === "crypt" ? 220 : 300;
      const light = ctx.createRadialGradient(lx, ly, 20, lx, ly, lightR);
      light.addColorStop(0, "rgba(255,200,120,0.1)");
      light.addColorStop(0.35, "rgba(0,0,0,0)");
      light.addColorStop(1, blob.area === "crypt" ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.55)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // walls
    if (area) {
      for (const w of area.walls) {
        const x = w.x * SCALE - viewCamX;
        const y = w.y * SCALE - viewCamY;
        const ww = w.w * SCALE;
        const hh = w.h * SCALE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ww, hh);
        ctx.clip();
        const wp = ctx.createPattern(wallTex, "repeat");
        ctx.fillStyle = wp ?? "#3a3228";
        ctx.fillRect(x, y, ww, hh);
        ctx.restore();
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
        ctx.strokeStyle = "rgba(220,190,140,0.1)";
        ctx.strokeRect(x + 2, y + 2, Math.max(0, ww - 4), Math.max(0, hh - 4));
      }

      // dungeon / hub portals (rect markers)
      const portals = (blob.portals as Array<{
        x: number;
        y: number;
        w: number;
        h: number;
        label?: string;
        kind?: string;
      }>) ?? area.portals ?? [];
      for (const pr of portals) {
        const px = pr.x * SCALE - viewCamX;
        const py = pr.y * SCALE - viewCamY;
        const pw = pr.w * SCALE;
        const ph = pr.h * SCALE;
        const pulse = 0.35 + Math.sin(now / 320) * 0.2;
        let col = `rgba(201,164,108,${pulse})`;
        if (pr.kind === "dungeon") col = `rgba(100,140,255,${pulse})`;
        if (pr.kind === "boss") col = `rgba(220,80,40,${pulse + 0.1})`;
        if (pr.kind === "hub") col = `rgba(120,200,120,${pulse})`;
        // runic ring
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, pw, ph);
        ctx.fillStyle = col.replace(/[\d.]+\)$/, "0.15)");
        ctx.fillRect(px, py, pw, ph);
        // inner glow
        const g = ctx.createRadialGradient(
          px + pw / 2,
          py + ph / 2,
          4,
          px + pw / 2,
          py + ph / 2,
          Math.max(pw, ph),
        );
        g.addColorStop(0, col);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(px - 10, py - 10, pw + 20, ph + 20);
        if (pr.label) {
          ctx.font = "bold 13px Cinzel, Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#e8dcc0";
          ctx.fillText(pr.label, px + pw / 2, py - 8);
          ctx.textAlign = "left";
        }
      }
    }

    // LOOT piles (before actors so they sit on floor)
    for (const e of handle.world.query("transform")) {
      if (!e.tags.includes("loot") || !e.transform) continue;
      const loot = e.data.loot as { defId?: string; gold?: number; qty?: number } | undefined;
      const sx = e.transform.x * SCALE - viewCamX;
      const sy = e.transform.y * SCALE - viewCamY;
      const isGold = loot?.defId === "gold";
      const pulse = 0.55 + Math.sin(now / 180 + e.transform.x) * 0.35;
      // glow
      const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
      glow.addColorStop(0, isGold ? `rgba(255,210,60,${pulse})` : `rgba(120,160,255,${pulse * 0.8})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fill();
      // pile
      ctx.fillStyle = isGold ? "#e8c040" : "#6a8cff";
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isGold ? "#fff0a0" : "#c0d0ff";
      ctx.beginPath();
      ctx.arc(sx - 3, sy - 2, 3, 0, Math.PI * 2);
      ctx.arc(sx + 4, sy - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // label when near player
      if (player?.transform) {
        const d = Math.hypot(e.transform.x - player.transform.x, e.transform.y - player.transform.y);
        if (d < 90) {
          const name = isGold
            ? `${loot?.gold ?? 0} gold`
            : String(loot?.defId ?? "loot").replace(/_/g, " ");
          ctx.font = "bold 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillStyle = isGold ? "#fd4" : "#acf";
          ctx.fillText(name, sx, sy - 16);
          if (d < 48) {
            ctx.fillStyle = "#ccc";
            ctx.font = "10px system-ui";
            ctx.fillText("[F]", sx, sy - 28);
          }
          ctx.textAlign = "left";
        }
      }
    }

    // entities
    const entities = handle.world
      .query("transform")
      .filter(
        (e) =>
          !e.tags.includes("dead") &&
          !e.tags.includes("projectile") &&
          !e.tags.includes("loot"),
      )
      .sort((a, b) => (a.transform?.y ?? 0) - (b.transform?.y ?? 0));

    for (const e of entities) {
      const t = e.transform!;
      const sx = t.x * SCALE - viewCamX;
      const sy = t.y * SCALE - viewCamY;
      const size = spriteSize(e);
      const { img, flipX, tint } = spriteForEntity(e);
      const speed = Number(e.data.speed ?? 0);
      const attacking = e.data.attacking === true;
      const facing = Number(e.data.facing ?? Math.PI / 2);

      const phase = now / 90 + t.x * 0.2;
      const walk = speed > 8;
      const bob = walk ? Math.abs(Math.sin(phase)) * 5 : 0;
      const lean = walk ? Math.sin(phase) * 0.08 : 0;
      const attackLunge = attacking ? 10 : 0;
      const lungeX = Math.cos(facing) * attackLunge;
      const lungeY = Math.sin(facing) * attackLunge;
      const squash = attacking ? 1.08 : walk ? 1 + Math.sin(phase) * 0.04 : 1;
      const stretch = attacking ? 0.92 : walk ? 1 - Math.sin(phase) * 0.03 : 1;

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(
        sx + lungeX * 0.3,
        sy + size * 0.3,
        size * 0.34 * squash,
        size * 0.12,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (e.tags.includes("player")) {
        ctx.strokeStyle = "rgba(201,164,108,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy + size * 0.3, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (img) {
        const dw = size * squash;
        const dh = size * stretch;
        const drawY = sy - dh * 0.55 - bob + lungeY;
        ctx.save();
        ctx.translate(sx + lungeX, drawY);
        ctx.rotate(lean);
        if (flipX) {
          ctx.scale(-1, 1);
          ctx.drawImage(img, -dw / 2, 0, dw, dh);
        } else {
          ctx.drawImage(img, -dw / 2, 0, dw, dh);
        }
        ctx.restore();
        // identity wash for remapped mob types (fallen/raider/shade)
        if (tint) {
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.ellipse(
            sx + lungeX,
            drawY + dh * 0.45,
            dw * 0.32,
            dh * 0.38,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else {
        ctx.fillStyle = e.tags.includes("player") ? "#c9a46c" : "#a44";
        ctx.beginPath();
        ctx.arc(sx, sy - 10 - bob, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.health && e.tags.includes("enemy")) {
        const pct = Math.max(0, e.health.hp / e.health.max);
        const bx = sx - 32;
        const by = sy - size * 0.72 - bob;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(bx - 1, by - 1, 66, 9);
        ctx.fillStyle = "#2a1010";
        ctx.fillRect(bx, by, 64, 7);
        const hg = ctx.createLinearGradient(bx, by, bx, by + 7);
        hg.addColorStop(0, pct > 0.3 ? "#e06060" : "#ff4040");
        hg.addColorStop(1, "#601010");
        ctx.fillStyle = hg;
        ctx.fillRect(bx, by, 64 * pct, 7);
        const aid = String(e.data.actorId ?? "");
        const elite = e.data.elite === true;
        const showName =
          elite ||
          aid === "bellwarden" ||
          aid === "death_knight" ||
          aid === "bone_tyrant" ||
          aid === "bone_brute" ||
          aid === "hell_raider";
        if (showName) {
          const labels: Record<string, string> = {
            bellwarden: "Bellwarden",
            death_knight: "Death Knight",
            bone_tyrant: "Bone Tyrant",
            bone_brute: "Bone Brute",
            hell_raider: "Hell Raider",
            raider: "Ash Raider",
            crypt_guard: "Crypt Guard",
          };
          ctx.font = "bold 10px Cinzel, Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillStyle = elite
            ? "#f84"
            : aid === "bone_tyrant" || aid === "bellwarden"
              ? "#c9a46c"
              : "#ccc";
          ctx.fillText(
            (elite ? "Elite " : "") + (labels[aid] ?? aid.replace(/_/g, " ")),
            sx,
            by - 6,
          );
          ctx.textAlign = "left";
        }
      }
    }

    // projectiles
    for (const e of handle.world.query("transform")) {
      if (!e.tags.includes("projectile") || !e.transform) continue;
      const sx = e.transform.x * SCALE - viewCamX;
      const sy = e.transform.y * SCALE - viewCamY;
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 10);
      g.addColorStop(0, "rgba(180,140,255,0.95)");
      g.addColorStop(1, "rgba(80,40,160,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0d0ff";
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // combat particles (local)
    for (let i = combatFx.length - 1; i >= 0; i--) {
      const p = combatFx[i]!;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      if (p.life <= 0) {
        combatFx.splice(i, 1);
        continue;
      }
      const a = p.life / p.max;
      const sx = p.world ? p.x * SCALE - viewCamX : p.x;
      const sy = p.world ? p.y * SCALE - viewCamY : p.y;
      ctx.fillStyle = p.color + a + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // engine particles (world space)
    if (handle.particles?.particles) {
      for (const p of handle.particles.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        const sx = p.x * SCALE - viewCamX;
        const sy = p.y * SCALE - viewCamY;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * SCALE * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // slash / numbers / floats
    for (const f of fx) {
      const alpha = Math.min(1, f.t * 2.5);
      if (f.kind === "slash") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY;
        const skill = f.skill;
        if (skill === "whirl") {
          ctx.strokeStyle = `rgba(255,150,40,${alpha})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(sx, sy, 70 * (1.2 - f.t), 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,220,120,${alpha * 0.5})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, 50 * (1.15 - f.t * 0.4), 0.2, Math.PI * 1.6);
          ctx.stroke();
        } else if (skill === "smite") {
          ctx.strokeStyle = `rgba(120,180,255,${alpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 80);
          ctx.lineTo(sx + 6, sy - 20);
          ctx.lineTo(sx - 8, sy);
          ctx.stroke();
          ctx.fillStyle = `rgba(180,220,255,${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 28, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(255,210,120,${alpha})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(sx, sy, 55 * (1.15 - f.t * 0.5), -1.0, 1.1);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,220,${alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 40 * (1.15 - f.t * 0.5), -0.8, 0.9);
          ctx.stroke();
        }
      } else if (f.kind === "hit") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 48;
        const label = f.crit ? `CRIT ${f.dmg}` : `-${f.dmg}`;
        ctx.font = f.crit
          ? "bold 24px Cinzel, Georgia, serif"
          : "bold 20px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
        ctx.fillText(label, sx + 1, sy + 1);
        ctx.fillStyle = f.crit
          ? `rgba(255,220,80,${alpha})`
          : `rgba(255,230,120,${alpha})`;
        ctx.fillText(label, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "kill") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 36;
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,100,80,${alpha})`;
        ctx.fillText("SLAIN", sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "loot") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 30;
        ctx.font = "bold 13px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(160,200,255,${alpha})`;
        ctx.fillText(f.name, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "float") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 40;
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = f.color.startsWith("#")
          ? f.color
          : f.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(f.text, sx, sy);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      } else if (f.kind === "levelup") {
        ctx.font = "bold 36px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(160,210,255,${alpha})`;
        ctx.shadowColor = "rgba(100,160,255,0.6)";
        ctx.shadowBlur = 16;
        ctx.fillText("LEVEL UP", VIEW_W / 2, 130);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
      } else if (f.kind === "banner") {
        ctx.font = "bold 26px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.55})`;
        ctx.fillRect(VIEW_W / 2 - 220, 100, 440, 44);
        ctx.fillStyle = `rgba(201,164,108,${alpha})`;
        ctx.fillText(f.text, VIEW_W / 2, 130);
        ctx.textAlign = "left";
      }
    }

    // ambient ash
    for (const p of ash) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > VIEW_H) {
        p.y = -2;
        p.x = Math.random() * VIEW_W;
      }
      ctx.fillStyle = p.color + "0.35)";
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }

    // vignette
    const vig = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.12,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.82,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.65, "rgba(0,0,0,0.15)");
    vig.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // --- DIABLO HUD ---
    const hp = Number(blob.hp ?? player?.health?.hp ?? 0);
    const max = Number(blob.maxHp ?? player?.health?.max ?? 1);
    const hpPct = max > 0 ? hp / max : 0;
    const potPct = Math.min(1, Number(blob.potions ?? 0) / 5);

    const panelY = VIEW_H - 100;
    ctx.fillStyle = "rgba(8,6,4,0.88)";
    ctx.fillRect(0, panelY, VIEW_W, 100);
    // ornate top edge
    const edgeGrad = ctx.createLinearGradient(0, panelY, VIEW_W, panelY);
    edgeGrad.addColorStop(0, "rgba(80,60,30,0.2)");
    edgeGrad.addColorStop(0.5, "rgba(201,164,108,0.55)");
    edgeGrad.addColorStop(1, "rgba(80,60,30,0.2)");
    ctx.strokeStyle = edgeGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelY + 0.5);
    ctx.lineTo(VIEW_W, panelY + 0.5);
    ctx.stroke();

    drawOrb(ctx, 72, VIEW_H - 52, 36, hpPct, "blood");
    drawOrb(ctx, VIEW_W - 72, VIEW_H - 52, 36, potPct, "mana");

    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LIFE", 72, VIEW_H - 8);
    ctx.fillText("POTIONS", VIEW_W - 72, VIEW_H - 8);
    ctx.fillStyle = "#eee";
    ctx.font = "bold 13px system-ui";
    ctx.fillText(`${Math.ceil(hp)}/${Math.ceil(max)}`, 72, VIEW_H - 48);
    ctx.fillText(`${blob.potions ?? 0}`, VIEW_W - 72, VIEW_H - 48);

    // 4 skill slots
    const slot = 54;
    const gap = 10;
    const skills = [
      {
        id: "slash",
        label: "SLASH",
        key: "SPC",
        cdMax: 280,
        accent: "#e8c878",
      },
      {
        id: "whirl",
        label: "WHIRL",
        key: "2",
        cdMax: 850,
        accent: "#ff9a40",
      },
      {
        id: "smite",
        label: "SMITE",
        key: "3",
        cdMax: 650,
        accent: "#80c0ff",
      },
      {
        id: "potion",
        label: "POTION",
        key: "1",
        cdMax: 400,
        accent: "#e06060",
      },
    ] as const;
    const totalW = skills.length * slot + (skills.length - 1) * gap;
    const baseX = VIEW_W / 2 - totalW / 2;
    const sy = VIEW_H - 78;
    for (let i = 0; i < skills.length; i++) {
      const s = skills[i]!;
      const cdMs = Number(cds[s.id] ?? 0);
      const cdP = Math.min(1, cdMs / s.cdMax);
      const ready =
        s.id === "potion"
          ? Number(blob.potions ?? 0) > 0 && cdMs <= 0
          : cdMs <= 0;
      drawSkillSlot(
        ctx,
        baseX + i * (slot + gap),
        sy,
        slot,
        s.label,
        s.key,
        ready,
        cdP,
        s.accent,
      );
    }

    // mini stats under skills
    ctx.textAlign = "center";
    ctx.fillStyle = "#9a8a70";
    ctx.font = "11px system-ui";
    ctx.fillText(
      `DMG ${stats.damage ?? "—"}  ·  ARM ${stats.armor ?? "—"}  ·  CRIT ${Math.round((stats.critChance ?? 0) * 100)}%  ·  F loot  ·  I bag`,
      VIEW_W / 2,
      VIEW_H - 12,
    );

    // top-left character
    panel(ctx, 14, 12, 320, 102);
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 16px Cinzel, Georgia, serif";
    ctx.fillText(String(blob.areaName), 26, 36);
    ctx.fillStyle = "#d8d0c0";
    ctx.font = "13px system-ui";
    ctx.fillText(
      `Lv ${blob.level}   XP ${blob.xp}   Gold ${blob.gold}`,
      26,
      58,
    );
    ctx.fillText(
      `Kills ${blob.kills}   Foes ${blob.livingEnemies}`,
      26,
      78,
    );
    // XP bar
    ctx.fillStyle = "#1a1820";
    ctx.fillRect(26, 90, 290, 8);
    const xpp = xpPct(Number(blob.level ?? 1), Number(blob.xp ?? 0));
    const xg = ctx.createLinearGradient(26, 90, 26 + 290, 90);
    xg.addColorStop(0, "#3a6aa0");
    xg.addColorStop(1, "#80b0e0");
    ctx.fillStyle = xg;
    ctx.fillRect(26, 90, 290 * xpp, 8);
    ctx.strokeStyle = "rgba(201,164,108,0.35)";
    ctx.strokeRect(26.5, 90.5, 289, 7);

    // quest + threat
    panel(ctx, VIEW_W - 300, 12, 286, 88);
    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 11px Cinzel, Georgia, serif";
    ctx.fillText("QUEST — Wake of Ashes", VIEW_W - 288, 32);
    ctx.fillStyle = "#ddd";
    ctx.font = "13px system-ui";
    const questText =
      (blob.quest as string | null) ??
      (blob.area === "town"
        ? "Exit east into the Ashen Wastes"
        : "Hunt · delve · survive");
    const q = String(questText);
    ctx.fillText(q.length > 36 ? q.slice(0, 36) + "…" : q, VIEW_W - 288, 54);
    ctx.fillStyle = "#9ab";
    ctx.font = "12px system-ui";
    ctx.fillText(
      `Threat ${blob.threat ?? 0}  ·  Bosses ${blob.bossesKilled ?? 0}  ·  ${blob.areaKind ?? ""}`,
      VIEW_W - 288,
      76,
    );

    // mini-map
    const mapW = Number(blob.mapW ?? 0);
    const mapH = Number(blob.mapH ?? 0);
    if (mapW > 0 && mapH > 0 && player?.transform) {
      const mmW = 140;
      const mmH = 100;
      const mmX = VIEW_W - 16 - mmW;
      const mmY = 110;
      panel(ctx, mmX, mmY, mmW, mmH);
      ctx.fillStyle = "rgba(30,24,18,0.9)";
      ctx.fillRect(mmX + 4, mmY + 4, mmW - 8, mmH - 8);
      const sxm = (mmW - 8) / mapW;
      const sym = (mmH - 8) / mapH;
      // portals on mini
      for (const pr of (blob.portals as Array<{ x: number; y: number; w: number; h: number; kind?: string }>) ?? []) {
        ctx.fillStyle =
          pr.kind === "boss"
            ? "#e64"
            : pr.kind === "dungeon"
              ? "#68f"
              : "#6c6";
        ctx.fillRect(
          mmX + 4 + pr.x * sxm,
          mmY + 4 + pr.y * sym,
          Math.max(3, pr.w * sxm),
          Math.max(3, pr.h * sym),
        );
      }
      // player
      ctx.fillStyle = "#fc6";
      ctx.beginPath();
      ctx.arc(
        mmX + 4 + player.transform.x * sxm,
        mmY + 4 + player.transform.y * sym,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#888";
      ctx.font = "9px system-ui";
      ctx.fillText("MAP", mmX + 8, mmY + mmH - 6);
    }

    if (blob.exitHint) {
      ctx.fillStyle = "#e88";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(blob.exitHint), VIEW_W / 2, panelY - 14);
      ctx.textAlign = "left";
    }

    // equipped strip
    const equipped = (blob.equipped as Record<string, string | null>) ?? {};
    const eqParts = ["weapon", "head", "chest"]
      .map((s) => equipped[s])
      .filter(Boolean);
    if (eqParts.length) {
      ctx.fillStyle = "rgba(8,6,4,0.65)";
      ctx.fillRect(14, 122, 320, 28);
      ctx.fillStyle = "#aaa";
      ctx.font = "12px system-ui";
      ctx.fillText(`Gear: ${eqParts.join(" · ")}`, 26, 140);
    }

    // inventory panel
    if (blob.inventoryOpen) {
      const inv = (blob.inventory as Array<{
        defId: string;
        name: string;
        qty: number;
        rarity?: string;
        slot?: string;
      }>) ?? [];
      const iw = 340;
      const ih = 380;
      const ix = VIEW_W / 2 - iw / 2;
      const iy = VIEW_H / 2 - ih / 2 - 20;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, ix, iy, iw, ih);
      // gold border accent
      ctx.strokeStyle = "rgba(201,164,108,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(ix + 3, iy + 3, iw - 6, ih - 6);
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 20px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("INVENTORY", VIEW_W / 2, iy + 32);
      ctx.fillStyle = "#9a8a70";
      ctx.font = "12px system-ui";
      ctx.fillText(`Gold ${blob.gold}  ·  Press I to close  ·  Best gear auto-equips`, VIEW_W / 2, iy + 52);
      ctx.textAlign = "left";
      let row = 0;
      for (const item of inv) {
        const yy = iy + 72 + row * 28;
        if (yy > iy + ih - 40) break;
        const col = RARITY_COLOR[item.rarity ?? "common"] ?? "#ccc";
        ctx.fillStyle = row % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent";
        ctx.fillRect(ix + 16, yy - 16, iw - 32, 26);
        ctx.fillStyle = col;
        ctx.font = "bold 13px system-ui";
        const qty = item.qty > 1 ? ` ×${item.qty}` : "";
        const slot = item.slot ? `  [${item.slot}]` : "";
        ctx.fillText(`${item.name}${qty}${slot}`, ix + 28, yy);
        row++;
      }
      if (inv.length === 0) {
        ctx.fillStyle = "#666";
        ctx.font = "14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Empty — slay the dead for loot", VIEW_W / 2, iy + 160);
        ctx.textAlign = "left";
      }
    }

    // endless — never freeze on boss kill; banners come from FX
    if (blob.lost) {
      ctx.fillStyle = "rgba(30,0,0,0.78)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e88";
      ctx.font = "bold 36px Cinzel, Georgia, serif";
      ctx.fillText("You have fallen", VIEW_W / 2, VIEW_H / 2 - 8);
      ctx.fillStyle = "#ccc";
      ctx.font = "16px system-ui";
      ctx.fillText("Reload the page to rise again at the Lychgate", VIEW_W / 2, VIEW_H / 2 + 28);
      ctx.textAlign = "left";
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  (window as unknown as { anvilObserve: () => Promise<unknown> }).anvilObserve =
    () => observe(handle);
}

main().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre style="color:#f66;padding:24px;font:14px monospace">${String(e?.stack ?? e)}</pre>`;
});

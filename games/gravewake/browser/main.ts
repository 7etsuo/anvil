/**
 * Gravewake — Diablo-like presentation layer on Anvil kernel.
 * Engine owns sim; this file owns look/feel.
 */
import {
  CanvasRenderFacade,
  createGame,
  installGameAudio,
  observe,
} from "@anvil/core";
import audioContent from "../content/audio.json";
import { browserGravewakeModule, getBrowserGravewake } from "./browserModule.js";
import { embeddedAreas } from "./contentEmbed.js";
import type { FxEvent } from "../src/GravewakeGame.js";
import { ISO } from "./diabloView.js";
import {
  depthOf,
  drawIsoFloor,
  drawIsoWalls,
  type Cam,
} from "./diabloView.js";

/** Full-window logical resolution (updated on resize). */
let VIEW_W = 1280;
let VIEW_H = 720;

/** Sprite scale in iso view (characters smaller — Diablo proportions). */
const SPRITE_SCALE = 0.85;

/** Every Imagine-processed sprite identity (unique art — no palette-swap remaps). */
const ACTOR_IDS = [
  "gravewarden",
  "scuttler",
  "wretch",
  "crypt_guard",
  "bellwarden",
  "fallen",
  "thrall",
  "bone_hound",
  "plague_scuttler",
  "shade",
  "void_shade",
  "ash_ghoul",
  "crypt_archer",
  "raider",
  "hell_raider",
  "bone_brute",
  "death_knight",
  "bone_tyrant",
] as const;

const ASSET_URLS: Record<string, string> = {
  "env/floor.png": "/assets/env/floor.png",
  "env/floor_wastes.png": "/assets/env/floor_wastes.png",
  "env/floor_dungeon.png": "/assets/env/floor_dungeon.png",
  "env/wall.png": "/assets/env/wall.png",
  "env/ruin_pillar.png": "/assets/env/ruin_pillar.png",
  "env/ruin_arch.png": "/assets/env/ruin_arch.png",
  "fx/portal.png": "/assets/fx/portal.png",
  "fx/loot_pile.png": "/assets/fx/loot_pile.png",
  "gear/rusty_sword.png": "/assets/gear/rusty_sword.png",
  "gear/bone_cleaver.png": "/assets/gear/bone_cleaver.png",
  "gear/warden_blade.png": "/assets/gear/warden_blade.png",
  "gear/ash_mail.png": "/assets/gear/ash_mail.png",
  "gear/tyrant_plate.png": "/assets/gear/tyrant_plate.png",
  "gear/iron_helm.png": "/assets/gear/iron_helm.png",
};
for (const id of ACTOR_IDS) {
  ASSET_URLS[`actors/${id}.png`] = `/assets/actors/${id}.png`;
  ASSET_URLS[`actors/${id}_down.png`] = `/assets/actors/${id}_down.png`;
  ASSET_URLS[`actors/${id}_right.png`] = `/assets/actors/${id}_right.png`;
}
ASSET_URLS["actors/gravewarden_up.png"] = "/assets/actors/gravewarden_up.png";
ASSET_URLS["actors/gravewarden_body.png"] = "/assets/actors/gravewarden_body.png";

/** Identity map — each mob uses its own sheet. */
const ACTOR_SHEET: Record<string, string> = Object.fromEntries(
  ACTOR_IDS.map((id) => [id, id]),
);

/** Soft identity washes only when elite or missing art. */
const ACTOR_TINT: Record<string, string | null> = {
  gravewarden: null,
  scuttler: null,
  wretch: null,
  crypt_guard: null,
  bellwarden: null,
  fallen: null,
  thrall: null,
  bone_hound: null,
  plague_scuttler: null,
  shade: null,
  void_shade: null,
  ash_ghoul: null,
  crypt_archer: null,
  raider: null,
  hell_raider: null,
  bone_brute: null,
  death_knight: null,
  bone_tyrant: null,
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

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    console.warn("asset missing", url);
    return null;
  }
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
      const img = await loadImage(url);
      if (img) images.set(key, img);
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

  // CC0 pack cues + combat/UI/zone event → audio bridge
  const cues = (audioContent as { cues: Record<string, string> }).cues;
  installGameAudio(handle.events, handle.audio, cues);

  // Unlock audio on first input (browser autoplay policy)
  const unlockAudio = () => {
    handle.events.emit("audio:zone_music", { zone: "town" });
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  renderer.resize(VIEW_W, VIEW_H);
  // Belt-and-suspenders: browser paints the full frame
  handle.kernel.setSkipDefaultDraw(true);
  // Engine ViewCamera drives iso projection (shared service)
  handle.camera.setMode("iso");
  handle.camera.iso = { tileW: ISO.tileW, tileH: ISO.tileH };
  handle.camera.setViewSize(VIEW_W, VIEW_H);
  handle.camera.followLerp = 0.14;

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
    handle.camera.setViewSize(VIEW_W, VIEW_H);
  };
  window.addEventListener("resize", applySize);
  applySize();

  const keysHeld = new Set<string>();
  let clickSlash = false;
  /** Hoisted before any listeners — avoids TDZ / missed start clicks. */
  let started = false;
  /** Cam focus mirror for diabloView helpers (kept in sync with handle.camera). */
  let cam: Cam = { wx: 200, wy: 320 };

  const syncCamFromEngine = () => {
    cam = { wx: handle.camera.wx, wy: handle.camera.wy };
  };

  const ensureGame = (): boolean => {
    if (getBrowserGravewake()) return true;
    try {
      // Scene may have failed to push; re-enter main
      handle.scenes.replace("main");
    } catch (err) {
      console.error("ensureGame replace failed", err);
    }
    return !!getBrowserGravewake();
  };

  /** Leave title and start the sim immediately (do not wait for rAF). */
  const beginPlay = () => {
    if (started) return true;
    if (!ensureGame()) {
      console.error("Gravewake game module not ready");
      return false;
    }
    started = true;
    clickSlash = false;
    const p0 = handle.world.get("player");
    if (p0?.transform) {
      handle.camera.snap(p0.transform.x, p0.transform.y);
      syncCamFromEngine();
    } else {
      // Still no player — snap to default town spawn
      handle.camera.snap(200, 320);
      syncCamFromEngine();
    }
    // Kick audio + one tick so first frame is live
    try {
      handle.events.emit("audio:zone_music", { zone: "town" });
      handle.tick(1 / 60);
    } catch (err) {
      console.warn("beginPlay tick", err);
    }
    return true;
  };

  const syncMove = () => {
    handle.input.setDown("move_up", keysHeld.has("KeyW") || keysHeld.has("ArrowUp"));
    handle.input.setDown("move_down", keysHeld.has("KeyS") || keysHeld.has("ArrowDown"));
    handle.input.setDown("move_left", keysHeld.has("KeyA") || keysHeld.has("ArrowLeft"));
    handle.input.setDown("move_right", keysHeld.has("KeyD") || keysHeld.has("ArrowRight"));
    handle.input.setDown("move_forward", keysHeld.has("KeyW") || keysHeld.has("ArrowUp"));
    handle.input.setDown("move_back", keysHeld.has("KeyS") || keysHeld.has("ArrowDown"));
  };

  window.addEventListener("keydown", (e) => {
    if (!started) {
      beginPlay();
      // Don't treat the start key as a combat input on the same press
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        return;
      }
    }
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

  /** Screen → world click via engine ViewCamera. */
  const onWorldClick = (clientX: number, clientY: number, button: number) => {
    const gw = getBrowserGravewake();
    if (!gw || !started) return;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || !canvas) return;
    const sx = ((clientX - rect.left) / rect.width) * VIEW_W;
    const sy = ((clientY - rect.top) / rect.height) * VIEW_H;
    const w = handle.camera.unproject(sx, sy);
    if (button === 0) {
      gw.clickWorld(w.x, w.y);
    } else if (button === 2) {
      clickSlash = true;
    }
  };

  // One pointer path avoids duplicate canvas/mount events and suppresses the
  // title click instead of also turning it into a world move.
  mount.addEventListener("pointerdown", (e) => {
    if (!started) {
      beginPlay();
      e.preventDefault();
      return;
    }
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      onWorldClick(e.clientX, e.clientY, e.button);
    }
  });
  mount.addEventListener("contextmenu", (e) => e.preventDefault());

  // Periodic run save while playing
  setInterval(() => {
    if (!started) return;
    try {
      getBrowserGravewake()?.saveRun(handle.getSeed());
    } catch {
      /* ignore */
    }
  }, 15000);

  const floorSrc = images.get("env/floor.png") ?? null;
  const wallTex = images.get("env/wall.png") ?? null;
  const portalImg = images.get("fx/portal.png") ?? null;
  const lootImg = images.get("fx/loot_pile.png") ?? null;
  const ruinPillar = images.get("env/ruin_pillar.png") ?? null;
  const ruinArch = images.get("env/ruin_arch.png") ?? null;

  // Ground: prefer full Imagine floor tile, softly blended
  const groundPlate = document.createElement("canvas");
  groundPlate.width = 512;
  groundPlate.height = 512;
  {
    const g = groundPlate.getContext("2d")!;
    g.fillStyle = "#3a3228";
    g.fillRect(0, 0, 512, 512);
    if (floorSrc) {
      g.drawImage(floorSrc, 0, 0, 512, 512);
    }
    // soft multi-scale noise to break seams
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 40;
      g.fillStyle = `rgba(20,16,12,${0.03 + Math.random() * 0.06})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const floor = groundPlate;

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
    // Elite affix tint (Diablo champion) overrides soft identity wash
    let eliteTint: string | null = null;
    if (e.data.elite === true) {
      const raw = String(e.data.eliteTint ?? "#ff8822");
      eliteTint = raw.startsWith("#")
        ? raw.length === 7
          ? raw + "59"
          : raw
        : raw;
    }
    const baseTint = ACTOR_TINT[baseId];
    const tint = eliteTint ?? baseTint;
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

  function frame(now: number): void {
    try {
      frameInner(now);
    } catch (err) {
      console.error("frame error", err);
    }
    requestAnimationFrame(frame);
  }

  function frameInner(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const ctx = renderer.getContext();
    if (!ctx) {
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
      // Big hit target
      ctx.fillStyle = "rgba(201,164,108,0.15)";
      ctx.fillRect(VIEW_W / 2 - 180, VIEW_H / 2 + 28, 360, 44);
      ctx.strokeStyle = "rgba(201,164,108,0.6)";
      ctx.strokeRect(VIEW_W / 2 - 180, VIEW_H / 2 + 28, 360, 44);
      ctx.fillStyle = "#e6dcc8";
      ctx.font = "bold 20px system-ui";
      ctx.fillText("CLICK ANYWHERE TO BEGIN", VIEW_W / 2, VIEW_H / 2 + 58);
      ctx.fillStyle = "#888";
      ctx.font = "13px system-ui";
      ctx.fillText(
        "LMB move  ·  Space slash  ·  2/3 skills  ·  1 potion  ·  F loot  ·  I bag  ·  C stats",
        VIEW_W / 2,
        VIEW_H / 2 + 100,
      );
      ctx.fillStyle = "#666";
      ctx.font = "12px system-ui";
      ctx.fillText(
        "WASD also works  ·  Click enemies to chase  ·  Delve dungeons  ·  Endless hunt",
        VIEW_W / 2,
        VIEW_H / 2 + 126,
      );
      ctx.textAlign = "left";

      // Safety net: keys held while on title (e.g. held before focus)
      if (keysHeld.size > 0) {
        beginPlay();
      }
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
      ctx.fillStyle = "#200";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#f88";
      ctx.font = "16px monospace";
      ctx.fillText("Waiting for game module…", 24, 40);
      return;
    }

    const player = handle.world.get("player");
    const blob = gw.observeBlob();
    // Prefer live procgen geometry from game; fall back to embedded content
    const embedded = embeddedAreas[blob.area];
    const liveWalls = blob.walls;
    const area = embedded
      ? {
          ...embedded,
          width: blob.mapW || embedded.width,
          height: blob.mapH || embedded.height,
          walls: liveWalls.length ? liveWalls : embedded.walls,
        }
      : null;
    const fx: FxEvent[] = gw.fx;
    const cds = blob.cds;
    const stats = blob.stats;

    // engine ViewCamera follow + shake
    const tcx = player?.transform?.x ?? handle.camera.wx;
    const tcy = player?.transform?.y ?? handle.camera.wy;
    if (Math.hypot(tcx - handle.camera.wx, tcy - handle.camera.wy) > 400) {
      handle.camera.snap(tcx, tcy);
    } else {
      handle.camera.follow(tcx, tcy, dt);
    }
    handle.camera.update(dt);
    syncCamFromEngine();
    for (const f of fx) {
      if (f.kind === "shake" && f.t > 0.08) {
        handle.camera.shake(f.mag * 2.5, 0.12);
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

    // --- ISOMETRIC WORLD (Diablo presentation) ---
    const mood =
      blob.areaKind === "dungeon"
        ? "dungeon"
        : blob.areaKind === "overworld" || blob.area === "wastes"
          ? "overworld"
          : "hub";
    const floorTex =
      mood === "dungeon"
        ? images.get("env/floor_dungeon.png") ?? floor
        : mood === "overworld"
          ? images.get("env/floor_wastes.png") ?? floor
          : floor;

    if (area) {
      drawIsoFloor(ctx, area, cam, VIEW_W, VIEW_H, floorTex, mood);
      drawIsoWalls(ctx, area, cam, VIEW_W, VIEW_H, wallTex, 42);
    } else {
      ctx.fillStyle = "#1a1510";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // click path + destination (iso)
    {
      const sim = gw.getSim();
      const path = sim?.getPlayerPath() ?? [];
      const tgt = sim?.getMoveTarget();
      if (path.length > 1) {
        ctx.strokeStyle = "rgba(80,220,100,0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const p = path[i]!;
          const s = handle.camera.project(p.x, p.y);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (tgt) {
        const s = handle.camera.project(tgt.x, tgt.y);
        ctx.strokeStyle = "rgba(120,255,140,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          s.x,
          s.y,
          14 + Math.sin(now / 120) * 2,
          7 + Math.sin(now / 120),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }

    // props + portals + shrine (iso)
    if (area) {
      const decor =
        blob.area === "town"
          ? [
              { x: 380, y: 180, kind: "arch" as const },
              { x: 520, y: 420, kind: "pillar" as const },
            ]
          : blob.area === "wastes"
            ? [
                { x: 600, y: 900, kind: "pillar" as const },
                { x: 1400, y: 700, kind: "arch" as const },
                { x: 2000, y: 1400, kind: "pillar" as const },
                { x: 1100, y: 1600, kind: "arch" as const },
                { x: 2500, y: 1100, kind: "pillar" as const },
              ]
            : [
                { x: 300, y: 200, kind: "pillar" as const },
                { x: 700, y: 400, kind: "arch" as const },
              ];
      for (const d of decor) {
        const img = d.kind === "arch" ? ruinArch : ruinPillar;
        if (!img) continue;
        const s = handle.camera.project(d.x, d.y);
        const sx = s.x;
        const sy = s.y;
        if (sx < -100 || sy < -100 || sx > VIEW_W + 100 || sy > VIEW_H + 100)
          continue;
        const sz = d.kind === "arch" ? 100 : 84;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(img, sx - sz / 2, sy - sz * 0.9, sz, sz);
        ctx.globalAlpha = 1;
      }

      if (blob.area === "town") {
        const s = handle.camera.project(220, 160);
        const sx = s.x;
        const sy = s.y;
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 50);
        g.addColorStop(0, "rgba(255,160,60,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e8c878";
        ctx.font = "bold 12px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText("Ash Shrine", sx, sy - 28);
        ctx.fillStyle = "#bbb";
        ctx.font = "11px system-ui";
        ctx.fillText("F · Potion 25g", sx, sy + 22);
        ctx.textAlign = "left";
      }

      const portals = blob.portals.length ? blob.portals : (area.portals ?? []);
      for (const pr of portals) {
        const s = handle.camera.project(pr.x + pr.w / 2, pr.y + pr.h / 2);
        const cx = s.x;
        const cy = s.y;
        const pw = 88;
        const ph = 100;
        const pulse = 0.8 + Math.sin(now / 280) * 0.15;
        if (portalImg) {
          ctx.save();
          ctx.globalAlpha = pulse;
          if (pr.kind === "boss") ctx.filter = "hue-rotate(-30deg) saturate(1.4)";
          else if (pr.kind === "hub") ctx.filter = "hue-rotate(90deg) saturate(0.9)";
          ctx.drawImage(portalImg, cx - pw / 2, cy - ph * 0.75, pw, ph);
          ctx.filter = "none";
          ctx.restore();
        }
        if (pr.label) {
          ctx.font = "bold 13px Cinzel, Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(cx - 50, cy - ph * 0.85 - 8, 100, 18);
          ctx.fillStyle = "#e8dcc0";
          ctx.fillText(pr.label, cx, cy - ph * 0.85 + 5);
          ctx.textAlign = "left";
        }
      }
    }

    const wp = (wx: number, wy: number) => handle.camera.project(wx, wy);

    // LOOT piles — Imagine prop + glow
    for (const e of handle.world.query("transform")) {
      if (!e.tags.includes("loot") || !e.transform) continue;
      const loot = e.data.loot as { defId?: string; gold?: number; qty?: number } | undefined;
      const { x: sx, y: sy } = wp(e.transform.x, e.transform.y);
      const isGold = loot?.defId === "gold";
      const pulse = 0.55 + Math.sin(now / 180 + e.transform.x) * 0.35;
      const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 28);
      glow.addColorStop(0, isGold ? `rgba(255,210,60,${pulse})` : `rgba(120,160,255,${pulse * 0.8})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fill();
      if (lootImg) {
        const s = isGold ? 36 : 44;
        ctx.drawImage(lootImg, sx - s / 2, sy - s * 0.65, s, s);
      } else {
        ctx.fillStyle = isGold ? "#e8c040" : "#6a8cff";
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (player?.transform) {
        const d = Math.hypot(e.transform.x - player.transform.x, e.transform.y - player.transform.y);
        if (d < 90) {
          const name = isGold
            ? `${loot?.gold ?? 0} gold`
            : String(loot?.defId ?? "loot").replace(/_/g, " ");
          ctx.font = "bold 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillStyle = isGold ? "#fd4" : "#acf";
          ctx.fillText(name, sx, sy - 28);
          if (d < 48) {
            ctx.fillStyle = "#ccc";
            ctx.font = "10px system-ui";
            ctx.fillText("[F]", sx, sy - 40);
          }
          ctx.textAlign = "left";
        }
      }
    }

    // entities (iso depth sort)
    const entities = handle.world
      .query("transform")
      .filter(
        (e) =>
          !e.tags.includes("dead") &&
          !e.tags.includes("projectile") &&
          !e.tags.includes("loot"),
      )
      .sort(
        (a, b) =>
          depthOf(a.transform?.x ?? 0, a.transform?.y ?? 0) -
          depthOf(b.transform?.x ?? 0, b.transform?.y ?? 0),
      );

    for (const e of entities) {
      const t = e.transform!;
      const { x: sx, y: sy } = wp(t.x, t.y);
      const size = spriteSize(e) * SPRITE_SCALE;
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
        // Diablo paper-doll: small slot-scaled layers (never full-body size)
        if (e.tags.includes("player")) {
          const layers = blob.visualLayers;
          for (const layer of layers) {
            const gimg = images.get(layer.sprite);
            if (!gimg) continue;
            const sc = Math.min(0.55, Math.max(0.12, layer.scale ?? 0.35));
            const gw = dw * sc;
            const gh = dh * sc;
            // Anchor: body local space (0,0)=top-center of sprite draw
            // ox/oy are fractions of *body* size toward hand/head
            const ox = layer.ox * dw;
            const oy = dh * 0.5 + layer.oy * dh - gh / 2;
            ctx.drawImage(gimg, -gw / 2 + ox, oy, gw, gh);
          }
        }
        ctx.restore();
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
        // bright fallback — never invisible
        ctx.fillStyle = e.tags.includes("player") ? "#e8c878" : "#e06060";
        ctx.beginPath();
        ctx.arc(sx, sy - 14 - bob, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
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
        const isBoss =
          aid === "bellwarden" ||
          aid === "death_knight" ||
          aid === "bone_tyrant";
        const showName =
          elite ||
          isBoss ||
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
          const affixes = (e.data.eliteAffixes as string[] | undefined) ?? [];
          const affixStr =
            affixes.length > 0
              ? affixes.map((a) => a.replace(/_/g, " ")).join(" · ")
              : "";
          const title =
            (elite ? "★ " : isBoss ? "☠ " : "") +
            (labels[aid] ?? aid.replace(/_/g, " "));
          // Diablo nameplate plate
          ctx.font = "bold 11px Cinzel, Georgia, serif";
          const tw = ctx.measureText(title).width;
          const plateW = Math.max(70, tw + 16);
          const plateX = sx - plateW / 2;
          const plateY = by - 22;
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillRect(plateX, plateY, plateW, affixStr ? 28 : 16);
          ctx.strokeStyle = elite
            ? "rgba(255,140,40,0.85)"
            : isBoss
              ? "rgba(201,164,108,0.9)"
              : "rgba(180,180,180,0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(plateX + 0.5, plateY + 0.5, plateW - 1, affixStr ? 27 : 15);
          ctx.textAlign = "center";
          ctx.fillStyle = elite
            ? "#ffaa44"
            : isBoss
              ? "#e8c878"
              : "#ddd";
          ctx.fillText(title, sx, plateY + 12);
          if (affixStr) {
            ctx.font = "9px system-ui";
            ctx.fillStyle = "#f84";
            ctx.fillText(affixStr, sx, plateY + 24);
          }
          ctx.textAlign = "left";
        }
      }
    }

    // Engine projectile system (holy smite bolts etc.)
    for (const p of handle.projectiles.all()) {
      const { x: sx, y: sy } = wp(p.x, p.y);
      const holy = p.damageType === "holy";
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 14);
      g.addColorStop(
        0,
        holy ? "rgba(200,230,255,0.98)" : "rgba(180,140,255,0.95)",
      );
      g.addColorStop(
        1,
        holy ? "rgba(80,120,220,0)" : "rgba(80,40,160,0)",
      );
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = holy ? "#eef6ff" : "#e0d0ff";
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // World interactables (chests / shrines) markers
    for (const it of blob.interactables) {
      if (it.used && it.kind === "chest") continue;
      const { x: sx, y: sy } = wp(it.x, it.y);
      ctx.save();
      if (it.kind === "chest") {
        ctx.fillStyle = "rgba(180,140,40,0.9)";
        ctx.fillRect(sx - 10, sy - 12, 20, 14);
        ctx.fillStyle = "#fc6";
        ctx.fillRect(sx - 10, sy - 14, 20, 4);
      } else if (it.kind === "shrine") {
        ctx.strokeStyle = "rgba(120,180,255,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 22);
        ctx.lineTo(sx + 8, sy - 4);
        ctx.lineTo(sx - 8, sy - 4);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = "rgba(100,160,255,0.35)";
        ctx.fill();
      }
      ctx.restore();
    }

    // legacy tag projectiles
    for (const e of handle.world.query("transform")) {
      if (!e.tags.includes("projectile") || !e.transform) continue;
      const { x: sx, y: sy } = wp(e.transform.x, e.transform.y);
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 10);
      g.addColorStop(0, "rgba(180,140,255,0.95)");
      g.addColorStop(1, "rgba(80,40,160,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
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
      const scr = p.world ? wp(p.x, p.y) : { x: p.x, y: p.y };
      ctx.fillStyle = p.color + a + ")";
      ctx.beginPath();
      ctx.arc(scr.x, scr.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // engine particles (world space)
    if (handle.particles?.particles) {
      for (const p of handle.particles.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        const scr = wp(p.x, p.y);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // slash / numbers / floats
    for (const f of fx) {
      const alpha = Math.min(1, f.t * 2.5);
      if (f.kind === "slash") {
        const { x: sx, y: sy } = wp(f.x, f.y);
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
        const p = wp(f.x, f.y);
        const sx = p.x;
        const sy = p.y - (1 - f.t) * 48;
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
        const p = wp(f.x, f.y);
        const sx = p.x;
        const sy = p.y - (1 - f.t) * 36;
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,100,80,${alpha})`;
        ctx.fillText("SLAIN", sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "loot") {
        const p = wp(f.x, f.y);
        const sx = p.x;
        const sy = p.y - (1 - f.t) * 30;
        ctx.font = "bold 13px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(160,200,255,${alpha})`;
        ctx.fillText(f.name, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "float") {
        const p = wp(f.x, f.y);
        const sx = p.x;
        const sy = p.y - (1 - f.t) * 40;
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

    // Soft vignette — keep readable (was crushing the scene to black)
    if (player?.transform) {
      const lp = wp(player.transform.x, player.transform.y);
      const core = ctx.createRadialGradient(lp.x, lp.y, 40, lp.x, lp.y, 420);
      core.addColorStop(0, "rgba(255,200,120,0.06)");
      core.addColorStop(0.55, "rgba(0,0,0,0)");
      core.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const vig = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.2,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 1.05,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.8, "rgba(0,0,0,0.12)");
    vig.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // --- DIABLO HUD ---
    const hp = Number(blob.hp ?? player?.health?.hp ?? 0);
    const max = Number(blob.maxHp ?? player?.health?.max ?? 1);
    const hpPct = max > 0 ? hp / max : 0;

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

    const mana = Number(blob.mana ?? 0);
    const manaMax = Number(blob.manaMax ?? 50) || 50;
    const stamina = Number(blob.stamina ?? 0);
    const staminaMax = Number(blob.staminaMax ?? 100) || 100;
    const manaPct = manaMax > 0 ? mana / manaMax : 0;

    drawOrb(ctx, 72, VIEW_H - 52, 36, hpPct, "blood");
    drawOrb(ctx, VIEW_W - 72, VIEW_H - 52, 36, manaPct, "mana");

    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LIFE", 72, VIEW_H - 8);
    ctx.fillText("MANA", VIEW_W - 72, VIEW_H - 8);
    ctx.fillStyle = "#eee";
    ctx.font = "bold 13px system-ui";
    ctx.fillText(`${Math.ceil(hp)}/${Math.ceil(max)}`, 72, VIEW_H - 48);
    ctx.fillText(`${Math.ceil(mana)}/${Math.ceil(manaMax)}`, VIEW_W - 72, VIEW_H - 48);

    // Stamina bar (above panel)
    const stY = panelY - 14;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(VIEW_W / 2 - 120, stY, 240, 8);
    ctx.fillStyle = "#c8a040";
    ctx.fillRect(VIEW_W / 2 - 120, stY, 240 * Math.min(1, stamina / staminaMax), 8);
    ctx.fillStyle = "#aaa";
    ctx.font = "10px system-ui";
    ctx.fillText(`STA ${Math.ceil(stamina)}  ·  pots ${blob.potions ?? 0}`, VIEW_W / 2, stY - 4);

    // Engine float combat text (do NOT name this `cam` — shadows outer cam → TDZ crash)
    for (const ft of handle.floatText.all()) {
      const sp = handle.camera.project(ft.x, ft.y);
      const a = Math.max(0, ft.life / ft.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = ft.color ?? (ft.style === "crit" ? "#ffdd44" : "#ff6666");
      ctx.font = ft.style === "crit" ? "bold 18px system-ui" : "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, sp.x, sp.y);
      ctx.globalAlpha = 1;
    }

    // Zone transition fade (only while active — never leave a stuck black frame)
    const tr = handle.transitions.state;
    if (tr.phase !== "idle" && tr.alpha > 0.02) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, tr.alpha)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (tr.label && (tr.phase === "hold" || tr.phase === "out")) {
        ctx.fillStyle = "#c9a46c";
        ctx.font = "bold 28px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(tr.label, VIEW_W / 2, VIEW_H / 2);
      }
    }

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
      `DMG ${stats.damage ?? "—"}  ·  ARM ${stats.armor ?? "—"}  ·  SPD ${Math.round(Number(stats.speed ?? 0))}  ·  CRIT ${Math.round((stats.critChance ?? 0) * 100)}%  ·  Esc close  ·  I bag  ·  C char  ·  T skills  ·  K craft  ·  X trade  ·  Y socket`,
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
      `Lv ${blob.level}   XP ${blob.xp}   Gold ${blob.gold}   Shards ${blob.shards ?? 0}`,
      26,
      58,
    );
    ctx.fillText(
      `Kills ${blob.kills}   Foes ${blob.livingEnemies}   T skills${blob.pendingSkillChoice ? " !" : ""}`,
      26,
      78,
    );
    // XP bar
    ctx.fillStyle = "#1a1820";
    ctx.fillRect(26, 90, 290, 8);
    const xpp = blob.xpProgress.ratio;
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
      blob.quest ??
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

    // mini-map (fog of war from engine MinimapFog sample)
      const mapW = blob.mapW;
      const mapH = blob.mapH;
    if (mapW > 0 && mapH > 0 && player?.transform) {
      const mmW = 148;
      const mmH = 118;
      const mmX = VIEW_W - 16 - mmW;
      const mmY = 110;
      panel(ctx, mmX, mmY, mmW, mmH);
      ctx.fillStyle = "rgba(8,6,4,0.95)";
      ctx.fillRect(mmX + 4, mmY + 4, mmW - 8, mmH - 8);
      const fog = blob.fog;
      const innerW = mmW - 8;
      const innerH = mmH - 20;
      if (fog && fog.length > 0) {
        const rows = fog.length;
        const cols = fog[0]!.length;
        const cw = innerW / cols;
        const ch = innerH / rows;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const cell = fog[y]![x] ?? 0;
            if (cell === 0) ctx.fillStyle = "#0a0806";
            else if (cell === 1) ctx.fillStyle = "#2a2418";
            else ctx.fillStyle = "#4a4030";
            ctx.fillRect(mmX + 4 + x * cw, mmY + 4 + y * ch, cw + 0.5, ch + 0.5);
          }
        }
      }
      const sxm = innerW / mapW;
      const sym = innerH / mapH;
      // portals on mini
      for (const pr of blob.portals) {
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
      // enemies as red pips (approx)
      for (const e of handle.world.query("transform")) {
        if (!e.tags.includes("enemy") || !e.transform || !e.health) continue;
        if (e.health.hp <= 0) continue;
        const elite = e.data.elite === true;
        ctx.fillStyle = elite ? "#f84" : "#c44";
        ctx.fillRect(
          mmX + 4 + e.transform.x * sxm - 1.5,
          mmY + 4 + e.transform.y * sym - 1.5,
          elite ? 4 : 3,
          elite ? 4 : 3,
        );
      }
      // player
      ctx.fillStyle = "#fc6";
      ctx.beginPath();
      ctx.arc(
        mmX + 4 + player.transform.x * sxm,
        mmY + 4 + player.transform.y * sym,
        3.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 9px Cinzel, Georgia, serif";
      ctx.fillText("MAP", mmX + 8, mmY + mmH - 6);
      ctx.fillStyle = "#888";
      ctx.font = "9px system-ui";
      ctx.fillText(
        `shards ${blob.shards ?? 0}`,
        mmX + mmW - 58,
        mmY + mmH - 6,
      );
    }

    if (blob.exitHint) {
      ctx.fillStyle = "#e88";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(blob.exitHint), VIEW_W / 2, panelY - 14);
      ctx.textAlign = "left";
    }

    // equipped strip
    const equipped = blob.equipped;
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

    // Only one modal at a time (game already enforces; draw order safety)
    // inventory panel
    if (blob.inventoryOpen && !blob.statsOpen && !blob.skillsOpen && !blob.craftOpen && !blob.vendorOpen) {
      const inv = blob.inventory;
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
        const can = item.canEquip !== false;
        ctx.fillStyle = can ? col : "#666";
        ctx.font = "bold 13px system-ui";
        const qty = item.qty > 1 ? ` ×${item.qty}` : "";
        const slot = item.slot ? ` [${item.slot}]` : "";
        const lv =
          item.itemLevel != null ? ` L${item.itemLevel}` : "";
        const req =
          !can && item.reqLevel != null ? `  (need Lv ${item.reqLevel})` : "";
        ctx.fillText(`${item.name}${lv}${qty}${slot}${req}`, ix + 28, yy);
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

    // Loot compare toast
    const lc = blob.lootCompare;
    if (lc && lc.t > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(VIEW_W / 2 - 180, 120, 360, 36);
      ctx.strokeStyle = lc.color;
      ctx.strokeRect(VIEW_W / 2 - 180, 120, 360, 36);
      ctx.fillStyle = lc.color;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(lc.text, VIEW_W / 2, 144);
      ctx.textAlign = "left";
    }

    // Craft panel (K)
    if (blob.craftOpen && !blob.vendorOpen && !blob.skillsOpen && !blob.statsOpen) {
      const cp = blob.craftPanel;
      const iw = 480;
      const ih = 360;
      const ix = VIEW_W / 2 - iw / 2;
      const iy = VIEW_H / 2 - ih / 2 - 20;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, ix, iy, iw, ih);
      ctx.strokeStyle = "rgba(201,164,108,0.55)";
      ctx.strokeRect(ix + 3, iy + 3, iw - 6, ih - 6);
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 22px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("CRAFT / SOCKET", VIEW_W / 2, iy + 34);
      ctx.fillStyle = "#9a8a70";
      ctx.font = "12px system-ui";
      ctx.fillText("1–3 craft  ·  4 or Y socket gem  ·  K closes", VIEW_W / 2, iy + 56);
      ctx.textAlign = "left";
      const recipes = cp?.recipes ?? [];
      for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i]!;
        const yy = iy + 80 + i * 70;
        ctx.fillStyle = r.can ? "rgba(60,80,40,0.5)" : "rgba(20,18,16,0.55)";
        ctx.fillRect(ix + 20, yy, iw - 40, 60);
        ctx.strokeStyle = r.can ? "rgba(120,200,80,0.6)" : "rgba(80,70,60,0.4)";
        ctx.strokeRect(ix + 20.5, yy + 0.5, iw - 41, 59);
        ctx.fillStyle = r.can ? "#cf8" : "#888";
        ctx.font = "bold 15px Cinzel, Georgia, serif";
        ctx.fillText(`${i + 1}. ${r.name}`, ix + 36, yy + 24);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px system-ui";
        const ins = r.inputs.map((x) => `${x.qty}× ${x.itemId}`).join(" + ");
        const cost = r.cost?.gold != null ? `  ·  ${r.cost.gold}g` : "";
        ctx.fillText(`→ ${r.outputId}  (${ins})${cost}`, ix + 36, yy + 44);
      }
      ctx.fillStyle = "#c9a46c";
      ctx.font = "13px system-ui";
      ctx.fillText(
        "Y: socket first gem into worn weapon/chest (gems drop in wastes)",
        ix + 28,
        iy + ih - 24,
      );
    }

    // Vendor panel (X)
    if (blob.vendorOpen && !blob.craftOpen && !blob.skillsOpen && !blob.statsOpen) {
      const vp = blob.vendorPanel;
      const iw = 500;
      const ih = 420;
      const ix = VIEW_W / 2 - iw / 2;
      const iy = VIEW_H / 2 - ih / 2 - 20;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, ix, iy, iw, ih);
      ctx.strokeStyle = "rgba(201,164,108,0.55)";
      ctx.strokeRect(ix + 3, iy + 3, iw - 6, ih - 6);
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 22px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("ASH SHRINE — TRADE", VIEW_W / 2, iy + 34);
      ctx.fillStyle = "#9a8a70";
      ctx.font = "12px system-ui";
      ctx.fillText(
        "SPC sell junk  ·  1 sell first bag item  ·  2–4 buy  ·  X closes",
        VIEW_W / 2,
        iy + 56,
      );
      ctx.textAlign = "left";
      ctx.fillStyle = "#e8c878";
      ctx.font = "bold 13px Cinzel, Georgia, serif";
      ctx.fillText("Buy", ix + 28, iy + 84);
      const offers = vp?.offers ?? [];
      for (let i = 0; i < offers.length; i++) {
        const o = offers[i]!;
        const yy = iy + 100 + i * 28;
        ctx.fillStyle = "#ddd";
        ctx.font = "13px system-ui";
        ctx.fillText(
          `${i + 2}. ${o.name}  —  ${o.price.gold ?? "?"}g` +
            (o.stock != null ? `  (×${o.stock})` : ""),
          ix + 36,
          yy,
        );
      }
      ctx.fillStyle = "#e8c878";
      ctx.font = "bold 13px Cinzel, Georgia, serif";
      ctx.fillText("Your bag (sell values)", ix + 28, iy + 200);
      const sellable = vp?.sellable ?? [];
      for (let i = 0; i < Math.min(8, sellable.length); i++) {
        const s = sellable[i]!;
        const yy = iy + 220 + i * 22;
        const col = RARITY_COLOR[s.rarity] ?? "#ccc";
        ctx.fillStyle = col;
        ctx.font = "12px system-ui";
        ctx.fillText(
          `${s.name}${s.qty > 1 ? ` ×${s.qty}` : ""}  →  ${s.value}g`,
          ix + 36,
          yy,
        );
      }
      if (!sellable.length) {
        ctx.fillStyle = "#666";
        ctx.fillText("Nothing to sell", ix + 36, iy + 220);
      }
    }

    // Skill tree panel (T / level-up)
    if (blob.skillsOpen && !blob.craftOpen && !blob.vendorOpen) {
      const panelData = blob.skillPanel;
      const iw = 460;
      const ih = 400;
      const ix = VIEW_W / 2 - iw / 2;
      const iy = VIEW_H / 2 - ih / 2 - 20;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, ix, iy, iw, ih);
      ctx.strokeStyle = "rgba(201,164,108,0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(ix + 3, iy + 3, iw - 6, ih - 6);
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 22px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("SKILLS", VIEW_W / 2, iy + 36);
      ctx.fillStyle = panelData?.pending ? "#ffcc66" : "#9a8a70";
      ctx.font = "13px system-ui";
      ctx.fillText(
        panelData?.pending
          ? `Level up! ${panelData.points} point(s) — press 1–4 to learn · T closes`
          : `Points ${panelData?.points ?? 0}  ·  T closes  ·  1–4 unlock`,
        VIEW_W / 2,
        iy + 58,
      );
      ctx.textAlign = "left";
      const nodes = panelData?.nodes ?? [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const yy = iy + 88 + i * 68;
        const can = n.canUnlock;
        ctx.fillStyle = can
          ? "rgba(80,60,20,0.55)"
          : "rgba(20,18,16,0.55)";
        ctx.fillRect(ix + 20, yy, iw - 40, 58);
        ctx.strokeStyle = can
          ? "rgba(255,180,60,0.7)"
          : n.rank > 0
            ? "rgba(201,164,108,0.4)"
            : "rgba(80,70,60,0.4)";
        ctx.strokeRect(ix + 20.5, yy + 0.5, iw - 41, 57);
        ctx.fillStyle = can ? "#ffcc66" : n.rank > 0 ? "#c9a46c" : "#777";
        ctx.font = "bold 15px Cinzel, Georgia, serif";
        ctx.fillText(
          `${i + 1}. ${n.name}  [${n.rank}/${n.maxRank}]`,
          ix + 36,
          yy + 24,
        );
        ctx.fillStyle = "#aaa";
        ctx.font = "12px system-ui";
        ctx.fillText(
          `${n.description}  ·  req Lv ${n.reqLevel}` +
            (n.requires.length ? `  ·  needs ${n.requires.join(", ")}` : ""),
          ix + 36,
          yy + 44,
        );
      }
    }

    // Character stats: base + gear = final
    if (blob.statsOpen && !blob.inventoryOpen && !blob.skillsOpen && !blob.craftOpen && !blob.vendorOpen) {
      const bd = blob.statBreakdown;
      const iw = 420;
      const ih = 420;
      const ix = VIEW_W / 2 - iw / 2;
      const iy = VIEW_H / 2 - ih / 2 - 20;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, ix, iy, iw, ih);
      ctx.strokeStyle = "rgba(201,164,108,0.55)";
      ctx.strokeRect(ix + 3, iy + 3, iw - 6, ih - 6);
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 20px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("CHARACTER", VIEW_W / 2, iy + 32);
      ctx.fillStyle = "#9a8a70";
      ctx.font = "12px system-ui";
      ctx.fillText(
        `Level ${blob.level}  ·  XP ${blob.xp}  ·  C closes  ·  I inventory`,
        VIEW_W / 2,
        iy + 52,
      );
      ctx.textAlign = "left";
      const keys = ["maxHp", "damage", "armor", "speed", "critChance", "critMult"] as const;
      const labels: Record<string, string> = {
        maxHp: "Life",
        damage: "Damage",
        armor: "Armor",
        speed: "Speed",
        critChance: "Crit %",
        critMult: "Crit ×",
      };
      ctx.font = "bold 12px system-ui";
      ctx.fillStyle = "#888";
      ctx.fillText("Stat", ix + 24, iy + 80);
      ctx.fillText("Base", ix + 140, iy + 80);
      ctx.fillText("Gear", ix + 220, iy + 80);
      ctx.fillText("Total", ix + 310, iy + 80);
      let row = 0;
      for (const k of keys) {
        const yy = iy + 104 + row * 26;
        const base = bd?.base?.[k] ?? 0;
        const gear = bd?.gear?.[k] ?? 0;
        const fin = bd?.final?.[k] ?? stats[k as keyof typeof stats] ?? 0;
        const fmt = (n: number) =>
          k === "critChance"
            ? `${Math.round(n * 100)}%`
            : k === "critMult"
              ? n.toFixed(1)
              : String(Math.round(n));
        ctx.fillStyle = row % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent";
        ctx.fillRect(ix + 16, yy - 16, iw - 32, 24);
        ctx.fillStyle = "#ddd";
        ctx.font = "13px system-ui";
        ctx.fillText(labels[k] ?? k, ix + 24, yy);
        ctx.fillStyle = "#aaa";
        ctx.fillText(fmt(base), ix + 140, yy);
        ctx.fillStyle = gear > 0 ? "#8c8" : gear < 0 ? "#c88" : "#666";
        ctx.fillText(gear === 0 ? "—" : `+${fmt(gear)}`, ix + 220, yy);
        ctx.fillStyle = "#e8c878";
        ctx.font = "bold 13px system-ui";
        ctx.fillText(fmt(Number(fin)), ix + 310, yy);
        row++;
      }
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 12px Cinzel, Georgia, serif";
      ctx.fillText("Equipped gear", ix + 24, iy + 280);
      let gr = 0;
      for (const g of bd?.bySlot ?? []) {
        const yy = iy + 304 + gr * 22;
        if (yy > iy + ih - 24) break;
        const bits = Object.entries(g.stats)
          .filter(([, v]) => typeof v === "number" && v !== 0)
          .map(([k, v]) => `${k} ${v! > 0 ? "+" : ""}${v}`)
          .join("  ");
        const lv =
          g.itemLevel != null
            ? ` L${g.itemLevel}`
            : "";
        ctx.fillStyle = "#ccc";
        ctx.font = "12px system-ui";
        ctx.fillText(`${g.name}${lv} [${g.slot}]  ${bits}`, ix + 24, yy);
        gr++;
      }
      if (!bd?.bySlot?.length) {
        ctx.fillStyle = "#666";
        ctx.fillText("No gear equipped", ix + 24, iy + 304);
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
  }

  requestAnimationFrame(frame);
  (window as unknown as { anvilObserve: () => Promise<unknown> }).anvilObserve =
    () => observe(handle);
}

main().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre style="color:#f66;padding:24px;font:14px monospace">${String(e?.stack ?? e)}</pre>`;
});

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

const SCALE = 1.2;
const VIEW_W = 1120;
const VIEW_H = 680;

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

/** 0=right, 1=down, 2=left, 3=up (canvas y+ is down). */
function dirFromFacing(facing: number): 0 | 1 | 2 | 3 {
  let a = facing;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  // Prefer cardinal by dominant axis via angle sectors
  if (a >= -Math.PI / 4 && a < Math.PI / 4) return 0; // right
  if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) return 1; // down
  if (a >= (3 * Math.PI) / 4 || a < (-3 * Math.PI) / 4) return 2; // left
  return 3; // up
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
  // outer metal ring
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

  // glass bowl
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

  // liquid surface shine
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(cx - radius * 0.7, top, radius * 1.4, 3);

  // glass highlight
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
): void {
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(x, y, size, size);
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, ready ? "#8a7040" : "#403830");
  g.addColorStop(1, ready ? "#3a2a18" : "#1a1510");
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = ready ? "#e8c878" : "#666";
  ctx.font = "bold 11px Cinzel, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + size / 2, y + size / 2 + 4);
  ctx.fillStyle = "#aaa";
  ctx.font = "10px system-ui";
  ctx.fillText(hotkey, x + size / 2, y + size - 8);
  if (cdPct > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, size, size * cdPct);
  }
  ctx.textAlign = "left";
}

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  const hudEl = document.getElementById("hud");
  const loading = document.getElementById("loading");
  if (!mount) throw new Error("#mount missing");

  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(ASSET_URLS).map(async ([key, url]) => {
      images.set(key, await loadImage(url));
    }),
  );

  const renderer = new CanvasRenderFacade(mount);
  await renderer.init(VIEW_W, VIEW_H);
  loading?.classList.add("hidden");

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
      version: "0.3.0",
      contentRoot: "content",
      assetsRoot: "assets",
      schemaVersion: 1,
    },
  });

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
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();
    mount.addEventListener("click", () => canvas.focus());
  }

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
  mount.addEventListener("mousedown", () => {
    clickSlash = true;
  });

  const floor = images.get("env/floor.png")!;
  const wallTex = images.get("env/wall.png")!;

  // ambient ash particles (screen space)
  const ash: Particle[] = [];
  for (let i = 0; i < 60; i++) {
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

  function spawnHitSparks(wx: number, wy: number, n = 10): void {
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
        color: Math.random() > 0.5 ? "rgba(255,80,60," : "rgba(255,200,80,",
        world: true,
      });
    }
  }

  function actorBase(e: { tags: string[]; data: Record<string, unknown> }): string {
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return "gravewarden";
    if (e.tags.includes("bellwarden")) return "bellwarden";
    if (e.tags.includes("crypt_guard")) return "crypt_guard";
    if (e.tags.includes("wretch")) return "wretch";
    if (e.tags.includes("scuttler")) return "scuttler";
    const id = String(e.data.actorId ?? e.tags.find((t) => t !== "enemy" && t !== "actor" && t !== "player") ?? "scuttler");
    return id;
  }

  function spriteForEntity(e: {
    tags: string[];
    data: Record<string, unknown>;
  }): { img: HTMLImageElement | null; flipX: boolean } {
    const base = actorBase(e);
    // Prefer sim's dominant-axis dir (more stable than continuous angle)
    const dir =
      dirFromString(e.data.dir) ??
      dirFromFacing(Number(e.data.facing ?? Math.PI / 2));

    // Art sheets face: down, up, right. Left = flip RIGHT sheet.
    // If go-right looked left before, the right sheet faces left → flip when moving RIGHT.
    if (dir === 3) {
      const up =
        images.get(`actors/${base}_up.png`) ??
        images.get(`actors/${base}_down.png`) ??
        images.get(`actors/${base}.png`);
      return { img: up ?? null, flipX: false };
    }
    if (dir === 1) {
      const down =
        images.get(`actors/${base}_down.png`) ??
        images.get(`actors/${base}.png`);
      return { img: down ?? null, flipX: false };
    }
    if (dir === 0) {
      // moving right
      const right =
        images.get(`actors/${base}_right.png`) ??
        images.get(`actors/${base}_down.png`);
      // invert: many AI "right" sheets face left of frame
      return { img: right ?? null, flipX: true };
    }
    // left
    const right =
      images.get(`actors/${base}_right.png`) ??
      images.get(`actors/${base}_down.png`);
    return { img: right ?? null, flipX: false };
  }

  function spriteSize(e: { tags: string[] }): number {
    if (e.tags.includes("bellwarden")) return 128;
    if (e.tags.includes("crypt_guard")) return 92;
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return 104;
    return 78;
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

      // floating ash on title
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
      ctx.fillText("GRAVEWAKE", VIEW_W / 2, VIEW_H / 2 - 36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#9a8a70";
      ctx.font = "italic 18px 'IM Fell English', Georgia, serif";
      ctx.fillText("The parish no longer answers the bells", VIEW_W / 2, VIEW_H / 2 + 8);
      ctx.fillStyle = "#e6dcc8";
      ctx.font = "bold 18px system-ui";
      ctx.fillText("Click or press any key", VIEW_W / 2, VIEW_H / 2 + 70);
      ctx.fillStyle = "#666";
      ctx.font = "14px system-ui";
      ctx.fillText("WASD  ·  Space to slash  ·  Clear the Parish  ·  Kill the Bellwarden", VIEW_W / 2, VIEW_H / 2 + 104);
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
      if (f.kind === "hit" && f.t > 0.55) {
        spawnHitSparks(f.x, f.y, 8);
      }
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

    // --- WORLD ---
    ctx.save();
    ctx.translate(-viewCamX, -viewCamY);
    const pat = ctx.createPattern(floor, "repeat");
    if (pat && area) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, area.width * SCALE, area.height * SCALE);
    }
    // darken floor slightly for mood
    if (area) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, area.width * SCALE, area.height * SCALE);
    }
    ctx.restore();

    // player light
    if (player?.transform) {
      const lx = player.transform.x * SCALE - viewCamX;
      const ly = player.transform.y * SCALE - viewCamY;
      const light = ctx.createRadialGradient(lx, ly, 20, lx, ly, 280);
      light.addColorStop(0, "rgba(255,200,120,0.08)");
      light.addColorStop(0.4, "rgba(0,0,0,0)");
      light.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

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
        // bevel
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
        ctx.strokeStyle = "rgba(220,190,140,0.1)";
        ctx.strokeRect(x + 2, y + 2, Math.max(0, ww - 4), Math.max(0, hh - 4));
      }

      // Edge exits: subtle doorway light on open wall gaps (not arcade portals)
      for (const ex of area.exits ?? []) {
        const locked =
          ex.requireClear && (blob.livingEnemies as number) > 0;
        const pulse = 0.4 + 0.3 * Math.sin(now / 400);
        let x = 0;
        let y = 0;
        let ww = 18;
        let hh = 80;
        if (ex.edge === "east") {
          x = area.width * SCALE - 18 - viewCamX;
          y = area.height * SCALE * 0.5 - 50 - viewCamY;
          ww = 16;
          hh = 100;
        } else if (ex.edge === "west") {
          x = 2 - viewCamX;
          y = area.height * SCALE * 0.5 - 50 - viewCamY;
          ww = 16;
          hh = 100;
        } else if (ex.edge === "north") {
          x = area.width * SCALE * 0.5 - 50 - viewCamX;
          y = 2 - viewCamY;
          ww = 100;
          hh = 16;
        } else {
          x = area.width * SCALE * 0.5 - 50 - viewCamX;
          y = area.height * SCALE - 18 - viewCamY;
          ww = 100;
          hh = 16;
        }
        ctx.fillStyle = locked
          ? `rgba(120,30,30,${0.15 + pulse * 0.1})`
          : `rgba(200,160,80,${0.12 + pulse * 0.12})`;
        ctx.fillRect(x, y, ww, hh);
      }
    }

    // entities
    const entities = handle.world
      .query("transform")
      .filter((e) => !e.tags.includes("dead") && !e.tags.includes("projectile"))
      .sort((a, b) => (a.transform?.y ?? 0) - (b.transform?.y ?? 0));

    for (const e of entities) {
      const t = e.transform!;
      const sx = t.x * SCALE - viewCamX;
      const sy = t.y * SCALE - viewCamY;
      const size = spriteSize(e);
      const { img, flipX } = spriteForEntity(e);
      const speed = Number(e.data.speed ?? 0);
      const attacking = e.data.attacking === true;
      const facing = Number(e.data.facing ?? Math.PI / 2);

      // walk cycle: bob + slight lean (feels alive, not a stamped block)
      const phase = now / 90 + t.x * 0.2;
      const walk = speed > 8;
      const bob = walk ? Math.abs(Math.sin(phase)) * 5 : 0;
      const lean = walk ? Math.sin(phase) * 0.08 : 0;
      const attackLunge = attacking ? 10 : 0;
      const lungeX = Math.cos(facing) * attackLunge;
      const lungeY = Math.sin(facing) * attackLunge;
      const squash = attacking ? 1.08 : walk ? 1 + Math.sin(phase) * 0.04 : 1;
      const stretch = attacking ? 0.92 : walk ? 1 - Math.sin(phase) * 0.03 : 1;

      // ground blob shadow
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

      // selection ring under player
      if (e.tags.includes("player")) {
        ctx.strokeStyle = "rgba(201,164,108,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy + size * 0.3, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (img) {
        const dw = size * squash;
        const dh = size * stretch;
        ctx.save();
        ctx.translate(sx + lungeX, sy - dh * 0.55 - bob + lungeY);
        ctx.rotate(lean);
        if (flipX) {
          ctx.scale(-1, 1);
          ctx.drawImage(img, -dw / 2, 0, dw, dh);
        } else {
          ctx.drawImage(img, -dw / 2, 0, dw, dh);
        }
        ctx.restore();
      } else {
        // never leave a naked block — colored body placeholder
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
      }
    }

    // combat particles
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

    // slash / numbers
    for (const f of fx) {
      const alpha = Math.min(1, f.t * 2.5);
      if (f.kind === "slash") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY;
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
      } else if (f.kind === "hit") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 48;
        ctx.font = "bold 20px Cinzel, Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
        ctx.fillText(`-${f.dmg}`, sx + 1, sy + 1);
        ctx.fillStyle = `rgba(255,230,120,${alpha})`;
        ctx.fillText(`-${f.dmg}`, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "kill") {
        const sx = f.x * SCALE - viewCamX;
        const sy = f.y * SCALE - viewCamY - (1 - f.t) * 36;
        ctx.font = "bold 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,210,100,${alpha})`;
        ctx.fillText(`+${f.gold} gold`, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "levelup") {
        ctx.font = "bold 32px Cinzel, Georgia, serif";
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
        ctx.fillRect(VIEW_W / 2 - 200, 100, 400, 44);
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
    const hp = player?.health?.hp ?? 0;
    const max = player?.health?.max ?? 1;
    const hpPct = max > 0 ? hp / max : 0;
    // potion as fake mana
    const potPct = Math.min(1, (blob.potions as number) / 5);

    // bottom panel bar
    const panelY = VIEW_H - 92;
    ctx.fillStyle = "rgba(8,6,4,0.82)";
    ctx.fillRect(0, panelY, VIEW_W, 92);
    ctx.strokeStyle = "rgba(201,164,108,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, panelY + 0.5);
    ctx.lineTo(VIEW_W, panelY + 0.5);
    ctx.stroke();

    drawOrb(ctx, 70, VIEW_H - 48, 34, hpPct, "blood");
    drawOrb(ctx, VIEW_W - 70, VIEW_H - 48, 34, potPct, "mana");

    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LIFE", 70, VIEW_H - 8);
    ctx.fillText("POTIONS", VIEW_W - 70, VIEW_H - 8);
    ctx.fillStyle = "#eee";
    ctx.font = "bold 12px system-ui";
    ctx.fillText(`${Math.ceil(hp)}`, 70, VIEW_H - 44);
    ctx.fillText(`${blob.potions}`, VIEW_W - 70, VIEW_H - 44);

    // skill slots center
    const slot = 52;
    const baseX = VIEW_W / 2 - (slot * 3 + 16) / 2;
    const sy = VIEW_H - 72;
    const cd = Math.min(1, (blob.meleeCdMs as number) / 380);
    drawSkillSlot(ctx, baseX, sy, slot, "SLASH", "SPC", cd < 0.05, cd);
    drawSkillSlot(ctx, baseX + slot + 8, sy, slot, "POTION", "1", (blob.potions as number) > 0, 0);
    drawSkillSlot(ctx, baseX + (slot + 8) * 2, sy, slot, "MOVE", "WASD", true, 0);

    // top-left quest + stats
    ctx.fillStyle = "rgba(8,6,4,0.72)";
    ctx.fillRect(16, 14, 300, 86);
    ctx.strokeStyle = "rgba(201,164,108,0.3)";
    ctx.strokeRect(16.5, 14.5, 299, 85);
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 15px Cinzel, Georgia, serif";
    ctx.fillText(String(blob.areaName), 28, 36);
    ctx.fillStyle = "#d8d0c0";
    ctx.font = "13px system-ui";
    ctx.fillText(`Level ${blob.level}   ·   XP ${blob.xp}   ·   Gold ${blob.gold}`, 28, 58);
    ctx.fillText(`Kills ${blob.kills}   ·   Foes remaining ${blob.livingEnemies}`, 28, 78);
    // thin XP bar
    ctx.fillStyle = "#1a1820";
    ctx.fillRect(28, 88, 260, 5);
    ctx.fillStyle = "#4a7ab0";
    ctx.fillRect(28, 88, 260 * 0.45, 5);

    // objective top-right
    ctx.fillStyle = "rgba(8,6,4,0.72)";
    ctx.fillRect(VIEW_W - 250, 14, 234, 64);
    ctx.strokeStyle = "rgba(201,164,108,0.28)";
    ctx.strokeRect(VIEW_W - 249.5, 14.5, 233, 63);
    ctx.fillStyle = "#c9a46c";
    ctx.font = "bold 11px Cinzel, Georgia, serif";
    ctx.fillText("QUEST", VIEW_W - 238, 34);
    ctx.fillStyle = "#ddd";
    ctx.font = "13px system-ui";
    let obj = "Silence the Bellwarden";
    if (blob.area === "town") obj = "Leave east into Cinder Parish";
    else if (blob.area === "parish") {
      obj =
        (blob.livingEnemies as number) > 0
          ? "Clear the parish of the dead"
          : "Exit east into Bellcrypt";
    }
    ctx.fillText(obj, VIEW_W - 238, 56);
    if (blob.exitHint) {
      ctx.fillStyle = "#e88";
      ctx.font = "12px system-ui";
      ctx.fillText(String(blob.exitHint), 28, panelY - 12);
    }

    if (blob.victory) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#c9a46c";
      ctx.font = "bold 48px Cinzel, Georgia, serif";
      ctx.shadowColor = "rgba(201,164,108,0.5)";
      ctx.shadowBlur = 20;
      ctx.fillText("BELLWARDEN FALLEN", VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ccc";
      ctx.font = "18px 'IM Fell English', Georgia, serif";
      ctx.fillText(`Gold ${blob.gold}  ·  Kills ${blob.kills}  ·  The bells are still.`, VIEW_W / 2, VIEW_H / 2 + 36);
      ctx.textAlign = "left";
    } else if (blob.lost) {
      ctx.fillStyle = "rgba(30,0,0,0.75)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e88";
      ctx.font = "bold 32px Cinzel, Georgia, serif";
      ctx.fillText("You have fallen", VIEW_W / 2, VIEW_H / 2 - 8);
      ctx.fillStyle = "#ccc";
      ctx.font = "16px system-ui";
      ctx.fillText("Press Space to rise in this place", VIEW_W / 2, VIEW_H / 2 + 28);
      ctx.textAlign = "left";
    }

    if (hudEl) {
      hudEl.textContent = `${blob.areaName} · ${blob.livingEnemies} foes · ${blob.gold} gold`;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  (window as unknown as { anvilObserve: () => Promise<unknown> }).anvilObserve =
    () => observe(handle);
}

main().catch((e) => {
  console.error(e);
  document.getElementById("loading")!.textContent = String(e);
});

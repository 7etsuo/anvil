import {
  CanvasRenderFacade,
  createGame,
  observe,
} from "@anvil/core";
import { browserGravewakeModule, getBrowserGravewake } from "./browserModule.js";
import { embeddedAreas } from "./contentEmbed.js";
import type { FxEvent } from "../src/GravewakeGame.js";

const SCALE = 1.15;
const VIEW_W = 1100;
const VIEW_H = 700;

const ASSET_URLS: Record<string, string> = {
  "actors/gravewarden.png": "/assets/actors/gravewarden.png",
  "actors/scuttler.png": "/assets/actors/scuttler.png",
  "actors/wretch.png": "/assets/actors/wretch.png",
  "actors/crypt_guard.png": "/assets/actors/crypt_guard.png",
  "actors/bellwarden.png": "/assets/actors/bellwarden.png",
  "env/floor.png": "/assets/env/floor.png",
  "env/wall.png": "/assets/env/wall.png",
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  const hudEl = document.getElementById("hud");
  if (!mount) throw new Error("#mount missing");
  if (hudEl) hudEl.textContent = "Loading…";

  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(ASSET_URLS).map(async ([key, url]) => {
      images.set(key, await loadImage(url));
    }),
  );

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
      version: "0.2.0",
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

  // Focus canvas so keyboard works immediately
  const canvas = renderer.getCanvas();
  if (canvas) {
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();
    mount.addEventListener("click", () => canvas.focus());
  }

  const keysHeld = new Set<string>();
  const syncMoveFromKeys = () => {
    // Direct movement actions every frame (bulletproof WASD)
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
    syncMoveFromKeys();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keysHeld.delete(e.code);
    handle.input.handleKey(e.code, false);
    syncMoveFromKeys();
  });

  let mouseShootPulse = false;
  mount.addEventListener("mousedown", () => {
    mouseShootPulse = true;
    handle.input.setDown("shoot", true);
    handle.input.setDown("confirm", true);
  });
  mount.addEventListener("mouseup", () => {
    handle.input.setDown("shoot", false);
    handle.input.setDown("confirm", false);
  });

  const floor = images.get("env/floor.png")!;
  const wallTex = images.get("env/wall.png")!;

  let shakeX = 0;
  let shakeY = 0;
  let started = false;
  let last = performance.now();

  function spriteFor(e: { tags: string[]; sprite?: { frames: string[] } }) {
    const frame = e.sprite?.frames?.[0];
    if (frame && images.has(frame)) return images.get(frame)!;
    for (const t of e.tags) {
      const p = `actors/${t}.png`;
      if (images.has(p)) return images.get(p)!;
    }
    return null;
  }

  function spriteSize(e: { tags: string[] }): number {
    if (e.tags.includes("bellwarden")) return 110;
    if (e.tags.includes("crypt_guard")) return 78;
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return 86;
    return 64;
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Title gate — first key/click starts “game feel”
    if (!started) {
      const ctx = renderer.getContext();
      if (ctx) {
        ctx.fillStyle = "#0c0a08";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const g = ctx.createRadialGradient(
          VIEW_W / 2,
          VIEW_H / 2,
          40,
          VIEW_W / 2,
          VIEW_H / 2,
          420,
        );
        g.addColorStop(0, "#2a1c14");
        g.addColorStop(1, "#0c0a08");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#c4a882";
        ctx.font = "bold 56px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText("GRAVEWAKE", VIEW_W / 2, VIEW_H / 2 - 40);
        ctx.fillStyle = "#a89880";
        ctx.font = "18px system-ui";
        ctx.fillText("Ashen Lychgate · Cinder Parish · Bellcrypt", VIEW_W / 2, VIEW_H / 2 + 8);
        ctx.fillStyle = "#e8e0d4";
        ctx.font = "bold 20px system-ui";
        ctx.fillText("Click or press any key to begin", VIEW_W / 2, VIEW_H / 2 + 70);
        ctx.font = "14px system-ui";
        ctx.fillStyle = "#888";
        ctx.fillText("WASD move · Space / click to slash · 1 potion · green portals", VIEW_W / 2, VIEW_H / 2 + 110);
        ctx.textAlign = "left";
      }
      if (keysHeld.size > 0 || mouseShootPulse) {
        started = true;
        mouseShootPulse = false;
        handle.input.setDown("shoot", false);
        handle.input.setDown("confirm", false);
      }
      requestAnimationFrame(frame);
      return;
    }

    syncMoveFromKeys();
    if (mouseShootPulse) {
      // one-frame edge for click slash
      handle.input.setDown("shoot", true);
      handle.input.setDown("confirm", true);
    }

    handle.tick(dt);

    if (mouseShootPulse) {
      mouseShootPulse = false;
      handle.input.setDown("shoot", false);
      handle.input.setDown("confirm", false);
    }

    const ctx = renderer.getContext();
    const gw = getBrowserGravewake();
    if (!ctx || !gw) {
      requestAnimationFrame(frame);
      return;
    }

    const player = handle.world.get("player");
    const blob = gw.observeBlob();
    const area = embeddedAreas[String(blob.area)];
    const fx = gw.fx as FxEvent[];

    // screen shake from fx
    shakeX *= 0.85;
    shakeY *= 0.85;
    for (const f of fx) {
      if (f.kind === "shake") {
        shakeX += (Math.random() - 0.5) * f.mag * 2;
        shakeY += (Math.random() - 0.5) * f.mag * 2;
      }
    }

    const px = (player?.transform?.x ?? 0) * SCALE;
    const py = (player?.transform?.y ?? 0) * SCALE;
    const camX = px - VIEW_W / 2 + shakeX;
    const camY = py - VIEW_H / 2 + shakeY;

    // floor
    ctx.save();
    ctx.translate(-camX, -camY);
    const pat = ctx.createPattern(floor, "repeat");
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, (area?.width ?? 800) * SCALE, (area?.height ?? 600) * SCALE);
    }
    ctx.restore();

    // dim
    ctx.fillStyle = "rgba(10,8,6,0.12)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (area) {
      for (const w of area.walls) {
        const x = w.x * SCALE - camX;
        const y = w.y * SCALE - camY;
        const ww = w.w * SCALE;
        const hh = w.h * SCALE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ww, hh);
        ctx.clip();
        const wp = ctx.createPattern(wallTex, "repeat");
        ctx.fillStyle = wp ?? "#4a4038";
        ctx.fillRect(x, y, ww, hh);
        ctx.restore();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, ww, hh);
        ctx.strokeStyle = "rgba(255,220,180,0.08)";
        ctx.strokeRect(x + 2, y + 2, ww - 4, hh - 4);
      }

      for (const p of area.portals ?? []) {
        const locked = p.requireClear && (blob.livingEnemies as number) > 0;
        const x = p.x * SCALE - camX;
        const y = p.y * SCALE - camY;
        const ww = p.w * SCALE;
        const hh = p.h * SCALE;
        const grd = ctx.createLinearGradient(x, y, x + ww, y);
        if (locked) {
          grd.addColorStop(0, "rgba(90,20,20,0.15)");
          grd.addColorStop(0.5, "rgba(200,60,60,0.5)");
          grd.addColorStop(1, "rgba(90,20,20,0.15)");
        } else {
          grd.addColorStop(0, "rgba(20,80,50,0.1)");
          grd.addColorStop(0.5, "rgba(60,230,140,0.45)");
          grd.addColorStop(1, "rgba(20,80,50,0.1)");
        }
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, ww, hh);
        ctx.shadowColor = locked ? "#f55" : "#5f8";
        ctx.shadowBlur = 22;
        ctx.strokeStyle = locked ? "#e77" : "#9fe";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, ww - 6, hh - 6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(locked ? "CLEAR FOES" : "ENTER", x + ww / 2, y + hh / 2 + 4);
        ctx.textAlign = "left";
      }
    }

    // entities
    const entities = handle.world
      .query("transform")
      .filter((e) => !e.tags.includes("dead") && !e.tags.includes("projectile"))
      .sort((a, b) => (a.transform?.y ?? 0) - (b.transform?.y ?? 0));

    for (const e of entities) {
      const t = e.transform!;
      const sx = t.x * SCALE - camX;
      const sy = t.y * SCALE - camY;
      const size = spriteSize(e);
      const img = spriteFor(e);
      const flip = e.data.flipX === true;

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + size * 0.3, size * 0.32, size * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      if (img) {
        ctx.save();
        if (flip) {
          ctx.translate(sx, sy - size * 0.55);
          ctx.scale(-1, 1);
          ctx.drawImage(img, -size / 2, 0, size, size);
        } else {
          ctx.drawImage(img, sx - size / 2, sy - size * 0.55, size, size);
        }
        ctx.restore();
      }

      if (e.health && e.tags.includes("enemy")) {
        const pct = Math.max(0, e.health.hp / e.health.max);
        const bx = sx - 30;
        const by = sy - size * 0.65;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(bx, by, 60, 7);
        ctx.fillStyle = pct > 0.3 ? "#d44" : "#f33";
        ctx.fillRect(bx, by, 60 * pct, 7);
      }
    }

    // FX: slash arcs, damage numbers, gold
    for (const f of fx) {
      const alpha = Math.min(1, f.t * 3);
      if (f.kind === "slash") {
        const sx = f.x * SCALE - camX;
        const sy = f.y * SCALE - camY;
        ctx.strokeStyle = `rgba(255,200,120,${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, 48 * (1.2 - f.t), -0.8, 0.9);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 36 * (1.2 - f.t), -0.6, 0.7);
        ctx.stroke();
      } else if (f.kind === "hit") {
        const sx = f.x * SCALE - camX;
        const sy = f.y * SCALE - camY - (1 - f.t) * 40;
        ctx.fillStyle = `rgba(255,220,80,${alpha})`;
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`-${f.dmg}`, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "kill") {
        const sx = f.x * SCALE - camX;
        const sy = f.y * SCALE - camY - (1 - f.t) * 30;
        ctx.fillStyle = `rgba(255,210,100,${alpha})`;
        ctx.font = "bold 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`+${f.gold} gold`, sx, sy);
        ctx.textAlign = "left";
      } else if (f.kind === "levelup") {
        ctx.fillStyle = `rgba(180,220,255,${alpha})`;
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL UP", VIEW_W / 2, 120);
        ctx.textAlign = "left";
      }
    }

    // vignette
    const vig = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.15,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.78,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // HUD panel
    const hp = player?.health?.hp ?? 0;
    const max = player?.health?.max ?? 1;
    ctx.fillStyle = "rgba(6,4,2,0.78)";
    ctx.fillRect(16, 16, 340, 108);
    ctx.strokeStyle = "rgba(196,168,130,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16.5, 16.5, 339, 107);
    ctx.fillStyle = "#c4a882";
    ctx.font = "bold 17px Georgia, serif";
    ctx.fillText(String(blob.areaName), 28, 42);
    ctx.fillStyle = "#e8e0d4";
    ctx.font = "13px system-ui";
    ctx.fillText(
      `HP ${Math.ceil(hp)}/${max}   Lv ${blob.level}   XP ${blob.xp}   Kills ${blob.kills}`,
      28,
      66,
    );
    ctx.fillText(`Gold ${blob.gold}   Potions ${blob.potions}   Enemies left ${blob.livingEnemies}`, 28, 86);
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(28, 96, 240, 12);
    ctx.fillStyle = hp / max > 0.35 ? "#c33" : "#f44";
    ctx.fillRect(28, 96, 240 * Math.max(0, hp / max), 12);
    // XP bar
    ctx.fillStyle = "#1a1820";
    ctx.fillRect(28, 112, 240, 6);
    // rough xp into level
    ctx.fillStyle = "#68a";
    ctx.fillRect(28, 112, 240 * 0.4, 6);

    // minimap-ish objective
    ctx.fillStyle = "rgba(6,4,2,0.7)";
    ctx.fillRect(VIEW_W - 220, 16, 200, 70);
    ctx.fillStyle = "#c4a882";
    ctx.font = "bold 12px system-ui";
    ctx.fillText("OBJECTIVE", VIEW_W - 208, 36);
    ctx.fillStyle = "#ddd";
    ctx.font = "12px system-ui";
    const obj =
      blob.area === "town"
        ? "Leave east through the portal"
        : blob.area === "parish"
          ? "Slay the parish dead, then east"
          : "Destroy the Bellwarden";
    ctx.fillText(obj, VIEW_W - 208, 56);
    ctx.fillStyle = "#888";
    ctx.fillText("WASD · Space slash · 1 potion", VIEW_W - 208, 74);

    if (blob.victory) {
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#e8c070";
      ctx.font = "bold 44px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("BELLWARDEN FALLEN", VIEW_W / 2, VIEW_H / 2 - 16);
      ctx.fillStyle = "#ccc";
      ctx.font = "18px system-ui";
      ctx.fillText(`The parish bells go quiet.  Gold: ${blob.gold}  Kills: ${blob.kills}`, VIEW_W / 2, VIEW_H / 2 + 28);
      ctx.textAlign = "left";
    } else if (blob.lost) {
      ctx.fillStyle = "rgba(40,0,0,0.72)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#e88";
      ctx.font = "bold 30px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("You fall — press Space to rise again", VIEW_W / 2, VIEW_H / 2);
      ctx.textAlign = "left";
    }

    if (hudEl) {
      hudEl.textContent = `${blob.areaName} · enemies ${blob.livingEnemies} · gold ${blob.gold}`;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  (window as unknown as { anvilObserve: () => Promise<unknown> }).anvilObserve =
    () => observe(handle);
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f66;padding:12px;white-space:pre-wrap">${String(e?.stack ?? e)}</pre>`,
  );
});

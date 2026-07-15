import {
  CanvasRenderFacade,
  createGame,
  observe,
} from "@anvil/core";
import { browserGravewakeModule, getBrowserGravewake } from "./browserModule.js";
import { embeddedAreas } from "./contentEmbed.js";

/** World units → pixels (maps were designed small; scale up so it reads as a game) */
const SCALE = 2.2;
const VIEW_W = 960;
const VIEW_H = 640;

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
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  const hudEl = document.getElementById("hud");
  if (!mount) throw new Error("#mount missing");

  if (hudEl) hudEl.textContent = "Loading art…";

  // Load all art first — never show grey boxes
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
      version: "0.1.0",
      contentRoot: "content",
      assetsRoot: "assets",
      schemaVersion: 1,
    },
  });

  // Seed asset cache so Anvil paths resolve to loaded images
  for (const [path, img] of images) {
    const tex = handle.assets.getTexture(path);
    if (tex.kind === "texture") {
      tex.image = img;
      tex.width = img.naturalWidth;
      tex.height = img.naturalHeight;
    }
  }

  const onKey = (e: KeyboardEvent, down: boolean) => {
    handle.input.handleKey(e.code, down);
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  mount.addEventListener("mousedown", () => handle.input.setDown("shoot", true));
  mount.addEventListener("mouseup", () => handle.input.setDown("shoot", false));

  const floor = images.get("env/floor.png")!;
  const wallTex = images.get("env/wall.png")!;

  function spriteFor(e: {
    tags: string[];
    sprite?: { frames: string[] };
  }): HTMLImageElement | null {
    const frame = e.sprite?.frames?.[0];
    if (frame && images.has(frame)) return images.get(frame)!;
    for (const t of e.tags) {
      const p = `actors/${t}.png`;
      if (images.has(p)) return images.get(p)!;
    }
    return null;
  }

  function spriteSize(e: { tags: string[] }): number {
    if (e.tags.includes("bellwarden")) return 88;
    if (e.tags.includes("crypt_guard")) return 64;
    if (e.tags.includes("player") || e.tags.includes("gravewarden")) return 72;
    return 56;
  }

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    handle.tick(dt);

    const ctx = renderer.getContext();
    const gw = getBrowserGravewake();
    if (!ctx || !gw) {
      requestAnimationFrame(frame);
      return;
    }

    const player = handle.world.get("player");
    const blob = gw.observeBlob();
    const areaId = String(blob.area);
    const area = embeddedAreas[areaId];

    const px = (player?.transform?.x ?? 0) * SCALE;
    const py = (player?.transform?.y ?? 0) * SCALE;
    const camX = px - VIEW_W / 2;
    const camY = py - VIEW_H / 2;

    // --- GROUND (tiled floor, not solid color) ---
    const pattern = ctx.createPattern(floor, "repeat");
    ctx.save();
    ctx.translate(-camX, -camY);
    if (pattern) {
      ctx.fillStyle = pattern;
      const mw = (area?.width ?? 500) * SCALE;
      const mh = (area?.height ?? 400) * SCALE;
      ctx.fillRect(0, 0, mw, mh);
    } else {
      ctx.fillStyle = "#2a241c";
      ctx.fillRect(0, 0, VIEW_W + camX, VIEW_H + camY);
    }
    ctx.restore();

    // subtle vignette base
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (area) {
      // --- WALLS (textured stone, not Pong boxes) ---
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
        if (wp) {
          ctx.fillStyle = wp;
          ctx.fillRect(x, y, ww, hh);
        } else {
          ctx.fillStyle = "#4a4038";
          ctx.fillRect(x, y, ww, hh);
        }
        ctx.restore();
        // edge highlight + shadow so walls read as 3D slabs
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
        ctx.strokeStyle = "rgba(220,200,170,0.12)";
        ctx.strokeRect(x + 2, y + 2, Math.max(0, ww - 4), Math.max(0, hh - 4));
      }

      // --- PORTALS (glowing gateways) ---
      for (const p of area.portals ?? []) {
        const locked = p.requireClear && (blob.livingEnemies as number) > 0;
        const x = p.x * SCALE - camX;
        const y = p.y * SCALE - camY;
        const ww = p.w * SCALE;
        const hh = p.h * SCALE;
        const g = ctx.createLinearGradient(x, y, x + ww, y);
        if (locked) {
          g.addColorStop(0, "rgba(80,20,20,0.2)");
          g.addColorStop(0.5, "rgba(180,50,50,0.55)");
          g.addColorStop(1, "rgba(80,20,20,0.2)");
        } else {
          g.addColorStop(0, "rgba(20,60,40,0.15)");
          g.addColorStop(0.5, "rgba(80,220,140,0.45)");
          g.addColorStop(1, "rgba(20,60,40,0.15)");
        }
        ctx.fillStyle = g;
        ctx.fillRect(x, y, ww, hh);
        ctx.shadowColor = locked ? "#f44" : "#4f8";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = locked ? "#e66" : "#8fd";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, ww - 4, hh - 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = locked ? "rgba(255,180,180,0.85)" : "rgba(200,255,220,0.9)";
        ctx.font = "bold 12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          locked ? "LOCKED" : "ENTER →",
          x + ww / 2,
          y + hh / 2 + 4,
        );
        ctx.textAlign = "left";
      }
    }

    // --- ENTITIES (large sprites with drop shadows) ---
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

      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + size * 0.28, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
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
      } else {
        // should not happen after preload
        ctx.fillStyle = e.tags.includes("player") ? "#c4a882" : "#a44";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.health && e.tags.includes("enemy")) {
        const pct = Math.max(0, e.health.hp / e.health.max);
        const bx = sx - 28;
        const by = sy - size * 0.62;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(bx, by, 56, 6);
        ctx.fillStyle = pct > 0.35 ? "#c44" : "#f33";
        ctx.fillRect(bx, by, 56 * pct, 6);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.strokeRect(bx, by, 56, 6);
      }
    }

    // ambient vignette
    const vig = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.2,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.75,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // --- HUD ---
    const hp = player?.health?.hp ?? 0;
    const max = player?.health?.max ?? 1;
    ctx.fillStyle = "rgba(8,6,4,0.72)";
    ctx.fillRect(14, 14, 320, 100);
    ctx.strokeStyle = "rgba(196,168,130,0.35)";
    ctx.strokeRect(14.5, 14.5, 319, 99);
    ctx.fillStyle = "#c4a882";
    ctx.font = "bold 16px system-ui";
    ctx.fillText(String(blob.areaName), 26, 38);
    ctx.fillStyle = "#e8e0d4";
    ctx.font = "13px system-ui";
    ctx.fillText(
      `HP ${Math.ceil(hp)}/${max}   ·   Lv ${blob.level}   ·   XP ${blob.xp}`,
      26,
      60,
    );
    ctx.fillText(
      `Gold ${blob.gold}   ·   Potions ${blob.potions}   ·   Foes ${blob.livingEnemies}`,
      26,
      80,
    );
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(26, 92, 220, 10);
    ctx.fillStyle = "#b33";
    ctx.fillRect(26, 92, 220 * Math.max(0, hp / max), 10);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(26, 92, 220, 10);

    if (blob.victory) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#e8c070";
      ctx.font = "bold 40px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("BELLWARDEN FALLEN", VIEW_W / 2, VIEW_H / 2 - 12);
      ctx.fillStyle = "#ccc";
      ctx.font = "18px system-ui";
      ctx.fillText("The parish bells go quiet.", VIEW_W / 2, VIEW_H / 2 + 28);
      ctx.textAlign = "left";
    } else if (blob.lost) {
      ctx.fillStyle = "rgba(40,0,0,0.7)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#e88";
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("You fall — Space restarts the area", VIEW_W / 2, VIEW_H / 2);
      ctx.textAlign = "left";
    }

    if (hudEl) {
      hudEl.textContent = `${blob.areaName} · WASD move · Space / click slash · green portals travel`;
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

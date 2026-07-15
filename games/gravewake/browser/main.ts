import {
  CanvasRenderFacade,
  createGame,
  observe,
} from "@anvil/core";
import { browserGravewakeModule, getBrowserGravewake } from "./browserModule.js";
import { embeddedAreas } from "./contentEmbed.js";

const VIEW_W = 960;
const VIEW_H = 640;

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  const hudEl = document.getElementById("hud");
  if (!mount) throw new Error("#mount missing");

  const renderer = new CanvasRenderFacade(mount);

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

  // Preload sprite textures
  const paths = [
    "actors/gravewarden.png",
    "actors/scuttler.png",
    "actors/wretch.png",
    "actors/crypt_guard.png",
    "actors/bellwarden.png",
    "env/floor.png",
  ];
  for (const p of paths) handle.assets.getTexture(p);

  // Keyboard → Anvil input
  const onKey = (e: KeyboardEvent, down: boolean) => {
    handle.input.handleKey(e.code, down);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));

  // Mouse click = melee
  mount.addEventListener("mousedown", () => {
    handle.input.setDown("shoot", true);
  });
  mount.addEventListener("mouseup", () => {
    handle.input.setDown("shoot", false);
  });

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Camera follow player
    const player = handle.world.get("player");
    if (player?.transform) {
      const cx = player.transform.x - VIEW_W / 2 + 20;
      const cy = player.transform.y - VIEW_H / 2 + 20;
      renderer.setCamera(cx, cy);
    }

    // Sim step (also clears + draws entities once)
    handle.tick(dt);

    const ctx = renderer.getContext();
    const gw = getBrowserGravewake();
    if (ctx && gw) {
      const blob = gw.observeBlob();
      const areaId = blob.area as string;
      const area = embeddedAreas[areaId];
      const camX = player?.transform
        ? player.transform.x - VIEW_W / 2 + 20
        : 0;
      const camY = player?.transform
        ? player.transform.y - VIEW_H / 2 + 20
        : 0;

      // Rebuild frame: ground → walls → portals → entities → HUD
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      if (area) {
        ctx.fillStyle = "rgba(55,48,42,0.95)";
        for (const w of area.walls) {
          ctx.fillRect(w.x - camX, w.y - camY, w.w, w.h);
        }
        for (const p of area.portals ?? []) {
          const locked =
            p.requireClear && (blob.livingEnemies as number) > 0;
          ctx.fillStyle = locked
            ? "rgba(120,40,40,0.5)"
            : "rgba(60,140,100,0.5)";
          ctx.fillRect(p.x - camX, p.y - camY, p.w, p.h);
          ctx.strokeStyle = locked ? "#c66" : "#8c8";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x - camX + 1, p.y - camY + 1, p.w - 2, p.h - 2);
        }
      }

      // Entities on top of map
      for (const e of handle.world.query("transform")) {
        if (e.tags.includes("dead")) continue;
        const t = e.transform!;
        if (e.sprite?.frames?.length) {
          const frame =
            e.sprite.frames[
              Math.min(e.sprite.frame, e.sprite.frames.length - 1)
            ]!;
          const flip = e.data.flipX === true;
          renderer.drawSprite(frame, t.x - 20, t.y - 20, {
            scale: e.tags.includes("bellwarden") ? 1.4 : 1,
            flipX: flip,
          });
        } else {
          renderer.drawQuad(t.x - 8, t.y - 8, 16, 16, "#4a90d9", e.tags[0]);
        }
        // HP pip for enemies
        if (e.health && e.tags.includes("enemy")) {
          const pct = e.health.hp / e.health.max;
          const bx = t.x - camX - 16;
          const by = t.y - camY - 28;
          ctx.fillStyle = "#222";
          ctx.fillRect(bx, by, 32, 4);
          ctx.fillStyle = "#c44";
          ctx.fillRect(bx, by, 32 * pct, 4);
        }
      }

      // HUD
      const p = handle.world.get("player");
      const hp = p?.health?.hp ?? 0;
      const max = p?.health?.max ?? 1;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(12, 12, 300, 92);
      ctx.fillStyle = "#c4a882";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(String(blob.areaName), 20, 32);
      ctx.fillStyle = "#e8e0d4";
      ctx.font = "13px system-ui";
      ctx.fillText(
        `HP ${Math.ceil(hp)}/${max}   Lv ${blob.level}   XP ${blob.xp}`,
        20,
        54,
      );
      ctx.fillText(
        `Gold ${blob.gold}   Potions ${blob.potions}   Enemies ${blob.livingEnemies}`,
        20,
        74,
      );
      ctx.fillStyle = "#333";
      ctx.fillRect(20, 86, 200, 8);
      ctx.fillStyle = "#a33";
      ctx.fillRect(20, 86, 200 * Math.max(0, hp / max), 8);

      if (blob.victory) {
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#e8c070";
        ctx.font = "bold 36px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("BELLWARDEN FALLEN", VIEW_W / 2, VIEW_H / 2 - 10);
        ctx.fillStyle = "#ccc";
        ctx.font = "18px system-ui";
        ctx.fillText("The parish bells go quiet.", VIEW_W / 2, VIEW_H / 2 + 28);
        ctx.textAlign = "left";
      } else if (blob.lost) {
        ctx.fillStyle = "rgba(40,0,0,0.65)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#e88";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("You fall — Space restarts area", VIEW_W / 2, VIEW_H / 2);
        ctx.textAlign = "left";
      }
    }

    if (hudEl && gw) {
      const b = gw.observeBlob();
      hudEl.textContent = `${b.areaName} · tick ${handle.getTick()} · WASD move · Space slash`;
    }

    requestAnimationFrame(frame);
  }

  // Match canvas size
  renderer.resize(VIEW_W, VIEW_H);
  const c = renderer.getCanvas();
  if (c) {
    c.width = VIEW_W;
    c.height = VIEW_H;
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

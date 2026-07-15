import {
  CanvasRenderFacade,
  createGame,
  observe,
} from "@anvil/core";

async function main(): Promise<void> {
  const mount = document.getElementById("mount");
  const tickEl = document.getElementById("tick");

  const renderer = new CanvasRenderFacade(mount);

  const handle = await createGame({
    root: "/",
    browser: true,
    headless: false,
    renderer,
    gameYaml: {
      id: "hello-empty",
      title: "Hello Empty",
      genre: "none",
      modules: [],
      entryScene: "main",
      seed: 1,
      version: "0.0.0",
      contentRoot: "content",
      assetsRoot: "assets",
      schemaVersion: 1,
    },
  });

  handle.world.spawn({
    tags: ["demo"],
    transform: { x: 120, y: 100 },
    sprite: {
      frames: ["demo/a.png", "demo/b.png"],
      fps: 4,
      loop: true,
      frame: 0,
    },
  });
  handle.audio.setCues({ blip: "sfx/blip.ogg" });

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const e = handle.world.all()[0];
    if (e?.transform) {
      e.transform.x = 120 + Math.sin(handle.getTime() * 2) * 80;
      e.transform.y = 100 + Math.cos(handle.getTime() * 1.5) * 40;
    }
    handle.tick(dt);
    if (tickEl) tickEl.textContent = String(handle.getTick());
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
    `<pre style="color:#f66;padding:12px">${String(e)}</pre>`,
  );
});

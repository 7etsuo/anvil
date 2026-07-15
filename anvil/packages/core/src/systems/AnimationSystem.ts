import type { World } from "../world/World.js";

/** Advances sprite.frame from frames[] using fps (S-CORE anim). Priority 300. */
export function createAnimationSystem(world: World): (dt: number) => void {
  const accum = new Map<string, number>();

  return (dt: number) => {
    for (const e of world.query("sprite")) {
      const sp = e.sprite!;
      if (!sp.frames.length || sp.fps <= 0) continue;
      if (!sp.loop && sp.frame >= sp.frames.length - 1) continue;

      let t = accum.get(e.id) ?? 0;
      t += dt;
      const frameDur = 1 / sp.fps;
      while (t >= frameDur) {
        t -= frameDur;
        if (sp.loop) {
          sp.frame = (sp.frame + 1) % sp.frames.length;
        } else {
          sp.frame = Math.min(sp.frame + 1, sp.frames.length - 1);
        }
      }
      accum.set(e.id, t);
    }
  };
}

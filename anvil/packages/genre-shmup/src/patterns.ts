import type { BulletPattern } from "./types.js";

export function patternVelocities(
  pattern: BulletPattern,
  fromX: number,
  fromY: number,
  playerX: number,
  playerY: number,
): Array<{ vx: number; vy: number }> {
  if (pattern.kind === "down") {
    return [{ vx: 0, vy: pattern.speed }];
  }
  if (pattern.kind === "aim_player") {
    const dx = playerX - fromX;
    const dy = playerY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    return [{ vx: (dx / len) * pattern.speed, vy: (dy / len) * pattern.speed }];
  }
  // fan — centered on down (90°)
  const count = Math.max(1, pattern.count);
  const half = ((pattern.spreadDeg * Math.PI) / 180) / 2;
  const center = Math.PI / 2; // down
  const out: Array<{ vx: number; vy: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ang = center - half + t * half * 2;
    out.push({
      vx: Math.cos(ang) * pattern.speed,
      vy: Math.sin(ang) * pattern.speed,
    });
  }
  return out;
}

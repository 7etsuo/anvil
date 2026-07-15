/**
 * Shared combat feel primitives: hitstun, knockback, i-frames.
 * Games apply to entity.data or velocity each frame.
 */

export interface CombatBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitstunMs: number;
  iframeMs: number;
  dead?: boolean;
}

export function applyHitstun(body: CombatBody, ms: number): void {
  body.hitstunMs = Math.max(body.hitstunMs, ms);
}

export function applyIframes(body: CombatBody, ms: number): void {
  body.iframeMs = Math.max(body.iframeMs, ms);
}

/** Knock away from (fromX, fromY). */
export function applyKnockback(
  body: CombatBody,
  fromX: number,
  fromY: number,
  force: number,
): void {
  const dx = body.x - fromX;
  const dy = body.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  body.vx += (dx / len) * force;
  body.vy += (dy / len) * force;
}

/**
 * Tick combat timers; freezes velocity while in hitstun.
 * Returns true if body can act (not in hitstun / dead).
 */
export function tickCombatBody(body: CombatBody, dtMs: number): boolean {
  if (body.dead) return false;
  if (body.hitstunMs > 0) {
    body.hitstunMs = Math.max(0, body.hitstunMs - dtMs);
    // damp velocity during stun
    body.vx *= 0.85;
    body.vy *= 0.85;
    return false;
  }
  if (body.iframeMs > 0) {
    body.iframeMs = Math.max(0, body.iframeMs - dtMs);
  }
  return true;
}

export function canBeHit(body: CombatBody): boolean {
  return !body.dead && body.iframeMs <= 0;
}

/** Full hit package. */
export function registerHit(
  target: CombatBody,
  attackerX: number,
  attackerY: number,
  opts: { knockback?: number; hitstunMs?: number; iframeMs?: number } = {},
): void {
  if (!canBeHit(target)) return;
  applyKnockback(target, attackerX, attackerY, opts.knockback ?? 120);
  applyHitstun(target, opts.hitstunMs ?? 120);
  applyIframes(target, opts.iframeMs ?? 300);
}

/** Lightweight 2D particle system for combat / ambient VFX. */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity?: number;
  drag?: number;
}

export interface ParticleBurstOpts {
  x: number;
  y: number;
  count: number;
  speed?: number;
  life?: number;
  size?: number;
  color?: string;
  gravity?: number;
  spread?: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles: number;

  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
  }

  burst(opts: ParticleBurstOpts): void {
    const n = opts.count;
    const speed = opts.speed ?? 80;
    const life = opts.life ?? 0.4;
    const size = opts.size ?? 2;
    const color = opts.color ?? "rgba(255,200,80,1)";
    const gravity = opts.gravity ?? 120;
    const spread = opts.spread ?? Math.PI * 2;
    const baseAng = -Math.PI / 2;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();
      const a = baseAng + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: opts.x,
        y: opts.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        gravity,
        drag: 0.5,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= 1 - (p.drag ?? 0) * dt;
      p.vy *= 1 - (p.drag ?? 0) * dt;
      p.vy += (p.gravity ?? 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /** Draw in world space (caller applies camera). */
  draw(
    ctx: CanvasRenderingContext2D,
    camX = 0,
    camY = 0,
  ): void {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
  }
}

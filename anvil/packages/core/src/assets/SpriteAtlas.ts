/**
 * Sprite atlas / animation sheet helpers (frame math only).
 * Games load the image; engine computes source rects.
 */

export type AtlasFrame = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SpriteSheetDef = {
  /** Texture path / key */
  image: string;
  frameWidth: number;
  frameHeight: number;
  /** Optional margin / spacing */
  margin?: number;
  spacing?: number;
  columns?: number;
  rows?: number;
};

export type AnimClipDef = {
  name: string;
  /** Frame indices into sheet, or atlas frame names */
  frames: Array<number | string>;
  /** ms per frame */
  frameMs?: number;
  loop?: boolean;
};

/**
 * Grid sheet → list of frames left-to-right, top-to-bottom.
 */
export function sheetFrames(def: SpriteSheetDef): AtlasFrame[] {
  const margin = def.margin ?? 0;
  const spacing = def.spacing ?? 0;
  const cols = def.columns ?? 1;
  const rows = def.rows ?? 1;
  const frames: AtlasFrame[] = [];
  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = margin + col * (def.frameWidth + spacing);
      const y = margin + row * (def.frameHeight + spacing);
      frames.push({
        name: `frame_${i}`,
        x,
        y,
        w: def.frameWidth,
        h: def.frameHeight,
      });
      i++;
    }
  }
  return frames;
}

export function frameAt(def: SpriteSheetDef, index: number): AtlasFrame | null {
  const frames = sheetFrames(def);
  return frames[index] ?? null;
}

/**
 * Advance animation clip by dtMs; returns frame index into clip.frames.
 */
export function tickAnimClip(
  clip: AnimClipDef,
  state: { frame: number; accMs: number },
  dtMs: number,
): { frame: number; accMs: number; frameKey: number | string; finished: boolean } {
  const frameMs = clip.frameMs ?? 100;
  let { frame, accMs } = state;
  accMs += dtMs;
  let finished = false;
  while (accMs >= frameMs) {
    accMs -= frameMs;
    frame += 1;
    if (frame >= clip.frames.length) {
      if (clip.loop !== false) frame = 0;
      else {
        frame = clip.frames.length - 1;
        finished = true;
        break;
      }
    }
  }
  return {
    frame,
    accMs,
    frameKey: clip.frames[frame]!,
    finished,
  };
}

/**
 * Named atlas from explicit frame list (TexturePacker-style subset).
 */
export class SpriteAtlas {
  readonly image: string;
  private frames = new Map<string, AtlasFrame>();

  constructor(image: string, frames: AtlasFrame[]) {
    this.image = image;
    for (const f of frames) this.frames.set(f.name, f);
  }

  static fromSheet(def: SpriteSheetDef): SpriteAtlas {
    return new SpriteAtlas(def.image, sheetFrames(def));
  }

  get(name: string): AtlasFrame | undefined {
    return this.frames.get(name);
  }

  list(): AtlasFrame[] {
    return [...this.frames.values()];
  }
}

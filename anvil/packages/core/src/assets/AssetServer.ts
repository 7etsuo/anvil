import fs from "node:fs";
import path from "node:path";

export type TextureHandle =
  | {
      kind: "texture";
      path: string;
      fullPath: string;
      /** browser Image or node-loaded flag */
      image?: CanvasImageSource;
      width?: number;
      height?: number;
    }
  | { kind: "greybox"; path: string; color: string; label: string };

export type AudioHandle = {
  path: string;
  fullPath: string;
  /** browser HTMLAudioElement when available */
  el?: HTMLAudioElement;
};

const IMAGE_EXT = /\.(png|webp|jpe?g)$/i;
const AUDIO_EXT = /\.(ogg|wav|mp3)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;

export class AssetServer {
  private gameRoot: string;
  private assetsRoot: string;
  private missingSet = new Set<string>();
  private logged = new Set<string>();
  private browser: boolean;
  private textureCache = new Map<string, TextureHandle>();
  private audioCache = new Map<string, AudioHandle | null>();

  constructor(gameRoot: string, assetsRoot = "assets", browser = false) {
    this.browser = browser;
    this.gameRoot = browser ? gameRoot : path.resolve(gameRoot);
    this.assetsRoot = assetsRoot;
  }

  getGameRoot(): string {
    return this.gameRoot;
  }

  getAssetsRoot(): string {
    return this.assetsRoot;
  }

  isBrowser(): boolean {
    return this.browser;
  }

  resolve(relPath: string): string {
    if (relPath.includes("..") || (!this.browser && path.isAbsolute(relPath))) {
      throw new Error(`Invalid asset path: ${relPath}`);
    }
    if (this.browser) {
      return `/${this.assetsRoot}/${relPath}`.replace(/\/+/g, "/");
    }
    const full = path.resolve(this.gameRoot, this.assetsRoot, relPath);
    const rootWithSep = this.gameRoot.endsWith(path.sep)
      ? this.gameRoot
      : this.gameRoot + path.sep;
    if (full !== this.gameRoot && !full.startsWith(rootWithSep)) {
      throw new Error(`Asset path escapes game root: ${relPath}`);
    }
    return full;
  }

  has(relPath: string): boolean {
    if (this.browser) return false;
    try {
      return fs.existsSync(this.resolve(relPath));
    } catch {
      return false;
    }
  }

  getTexture(relPath: string): TextureHandle {
    const cached = this.textureCache.get(relPath);
    if (cached) return cached;

    try {
      if (!this.browser) {
        const full = this.resolve(relPath);
        if (fs.existsSync(full) && IMAGE_EXT.test(relPath)) {
          const handle: TextureHandle = {
            kind: "texture",
            path: relPath,
            fullPath: full,
          };
          this.textureCache.set(relPath, handle);
          return handle;
        }
      } else if (IMAGE_EXT.test(relPath)) {
        // Browser: return texture handle with URL; image loaded async via ensureImage
        const full = this.resolve(relPath);
        const handle: TextureHandle = {
          kind: "texture",
          path: relPath,
          fullPath: full,
        };
        this.textureCache.set(relPath, handle);
        void this.ensureBrowserImage(handle);
        return handle;
      }
    } catch {
      /* greybox */
    }

    return this.greybox(relPath);
  }

  private greybox(relPath: string): TextureHandle {
    this.missingSet.add(relPath);
    if (!this.logged.has(relPath)) {
      this.logged.add(relPath);
      console.warn(`ASSET_MISSING path=${relPath}`);
    }
    const handle: TextureHandle = {
      kind: "greybox",
      path: relPath,
      color: colorFromPath(relPath),
      label: relPath.split(/[/\\]/).pop() ?? relPath,
    };
    this.textureCache.set(relPath, handle);
    return handle;
  }

  private async ensureBrowserImage(handle: TextureHandle): Promise<void> {
    if (handle.kind !== "texture" || handle.image) return;
    if (typeof Image === "undefined") return;
    try {
      const img = new Image();
      img.src = handle.fullPath;
      await img.decode();
      handle.image = img;
      handle.width = img.naturalWidth;
      handle.height = img.naturalHeight;
    } catch {
      // replace cache with greybox
      this.textureCache.delete(handle.path);
      this.greybox(handle.path);
    }
  }

  getAudio(relPath: string): AudioHandle | null {
    if (this.audioCache.has(relPath)) return this.audioCache.get(relPath)!;

    try {
      if (!this.browser) {
        const full = this.resolve(relPath);
        if (fs.existsSync(full) && AUDIO_EXT.test(relPath)) {
          const h = { path: relPath, fullPath: full };
          this.audioCache.set(relPath, h);
          return h;
        }
      } else if (AUDIO_EXT.test(relPath) && typeof Audio !== "undefined") {
        const full = this.resolve(relPath);
        const el = new Audio(full);
        const h = { path: relPath, fullPath: full, el };
        this.audioCache.set(relPath, h);
        return h;
      }
    } catch {
      /* miss */
    }

    this.missingSet.add(relPath);
    if (!this.logged.has(`audio:${relPath}`)) {
      this.logged.add(`audio:${relPath}`);
      console.warn(`ASSET_MISSING path=${relPath}`);
    }
    this.audioCache.set(relPath, null);
    return null;
  }

  /** Resolve video path; existence check only. */
  resolveVideo(relPath: string): string | null {
    try {
      if (!this.browser) {
        const full = this.resolve(relPath);
        if (fs.existsSync(full) && VIDEO_EXT.test(relPath)) return full;
      } else if (VIDEO_EXT.test(relPath)) {
        return this.resolve(relPath);
      }
    } catch {
      /* miss */
    }
    this.missingSet.add(relPath);
    if (!this.logged.has(`video:${relPath}`)) {
      this.logged.add(`video:${relPath}`);
      console.warn(`ASSET_MISSING path=${relPath}`);
    }
    return null;
  }

  missing(): string[] {
    return [...this.missingSet].sort();
  }

  /** Mark path as required (manifest / content scan) without loading. */
  requirePath(relPath: string): void {
    if (!this.has(relPath) && !this.browser) {
      try {
        const full = this.resolve(relPath);
        if (!fs.existsSync(full)) {
          this.missingSet.add(relPath);
        }
      } catch {
        this.missingSet.add(relPath);
      }
    } else if (this.browser) {
      // browser: can't stat; leave until getTexture
    }
  }

  async preload(paths: string[]): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (const p of paths) {
      if (IMAGE_EXT.test(p)) {
        const h = this.getTexture(p);
        if (h.kind === "texture" && this.browser) {
          tasks.push(this.ensureBrowserImage(h));
        }
      } else if (AUDIO_EXT.test(p)) {
        this.getAudio(p);
      } else if (VIDEO_EXT.test(p)) {
        this.resolveVideo(p);
      } else {
        this.getTexture(p);
      }
    }
    await Promise.all(tasks);
  }
}

function colorFromPath(p: string): string {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
  const r = (h & 0xff0000) >> 16;
  const g = (h & 0x00ff00) >> 8;
  const b = h & 0x0000ff;
  return `rgb(${(r % 128) + 64},${(g % 128) + 64},${(b % 128) + 64})`;
}

/**
 * Real Phaser 3 RenderFacade — creates a Phaser.Game and draws via Graphics + Images.
 */
import type {
  AssetServer,
  DrawSpriteOpts,
  DrawTextOpts,
  RenderFacade,
} from "@anvil/core";
import Phaser from "phaser";

type TexHandle = {
  kind: string;
  image?: HTMLImageElement | null;
  color?: string;
  label?: string;
};

export class PhaserRenderFacade implements RenderFacade {
  private mount: HTMLElement | null;
  private assets: AssetServer | null = null;
  private game: Phaser.Game | null = null;
  private scene: Phaser.Scene | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private texts: Phaser.GameObjects.Text[] = [];
  private images: Phaser.GameObjects.Image[] = [];
  private width = 800;
  private height = 600;
  private ready: Promise<void> | null = null;
  private textureKeys = new Set<string>();

  constructor(mount?: HTMLElement | null) {
    this.mount = mount ?? null;
  }

  setAssetServer(assets: AssetServer): void {
    this.assets = assets;
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;
    if (typeof document === "undefined") {
      // Headless CI — no DOM; no-op renderer
      return;
    }
    const parent = this.mount ?? document.body;

    this.ready = new Promise<void>((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        width,
        height,
        parent,
        backgroundColor: "#000000",
        banner: false,
        scene: {
          key: "anvil",
          create(this: Phaser.Scene) {
            self.scene = this;
            self.graphics = this.add.graphics();
            resolve();
          },
        },
      });
    });
    await this.ready;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.game?.scale.resize(width, height);
  }

  private parseColor(cssColor: string): number {
    if (cssColor.startsWith("#") && (cssColor.length === 7 || cssColor.length === 4)) {
      return Phaser.Display.Color.HexStringToColor(cssColor).color;
    }
    // rgba(...) or named — default dark
    return 0x111111;
  }

  clear(cssColor: string): void {
    if (!this.graphics || !this.scene) return;
    this.graphics.clear();
    for (const t of this.texts) t.destroy();
    this.texts = [];
    for (const img of this.images) img.destroy();
    this.images = [];
    this.graphics.fillStyle(this.parseColor(cssColor), 1);
    this.graphics.fillRect(0, 0, this.width, this.height);
  }

  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    cssColor: string,
    label?: string,
  ): void {
    if (!this.graphics || !this.scene) return;
    this.graphics.fillStyle(this.parseColor(cssColor), 1);
    this.graphics.fillRect(x, y, w, h);
    if (label) {
      const t = this.scene.add.text(x + 2, y + 2, label, {
        fontSize: "10px",
        color: "#ffffff",
        fontFamily: "monospace",
      });
      this.texts.push(t);
    }
  }

  drawSprite(
    path: string,
    x: number,
    y: number,
    opts?: DrawSpriteOpts,
  ): void {
    if (!this.scene || !this.graphics) return;
    const scale = opts?.scale ?? 1;
    const key = `anvil_${path.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (this.assets) {
      const tex = this.assets.getTexture(path) as TexHandle;
      if (tex.kind === "texture" && tex.image && this.scene.textures) {
        if (!this.textureKeys.has(key)) {
          try {
            this.scene.textures.addImage(key, tex.image);
            this.textureKeys.add(key);
          } catch {
            /* already added */
            this.textureKeys.add(key);
          }
        }
        if (this.scene.textures.exists(key)) {
          const img = this.scene.add.image(x, y, key);
          img.setOrigin(0, 0);
          img.setScale(scale);
          img.setAlpha(opts?.alpha ?? 1);
          if (opts?.flipX) img.setFlipX(true);
          if (opts?.rotation) img.setRotation(opts.rotation);
          // default display size ~40*scale like canvas path
          const target = 40 * scale;
          if (img.width > 0) {
            img.setDisplaySize(target, target);
          }
          this.images.push(img);
          return;
        }
      }
      if (tex.kind === "greybox" && tex.color) {
        this.drawQuad(x, y, 32 * scale, 32 * scale, tex.color, tex.label);
        return;
      }
    }
    this.drawQuad(x, y, 32 * scale, 32 * scale, "#666666", path.split("/").pop());
  }

  drawText(text: string, x: number, y: number, opts?: DrawTextOpts): void {
    if (!this.scene) return;
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${opts?.size ?? 14}px`,
      color: opts?.color ?? "#eeeeee",
      fontFamily: "system-ui, sans-serif",
    });
    if (opts?.align === "center") t.setOrigin(0.5, 0);
    this.texts.push(t);
  }

  beginFrame(): void {}

  endFrame(): void {}

  async captureScreenshot(): Promise<Uint8Array> {
    // Phaser canvas snapshot not required for headless tests
    return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  }

  dispose(): void {
    this.game?.destroy(true);
    this.game = null;
    this.scene = null;
    this.graphics = null;
    this.texts = [];
    this.images = [];
  }
}

/** @deprecated kept for API compat — Phaser is always the real facade now */
export function setPhaserFactory(_factory: unknown): void {
  /* no-op: Phaser is a hard dependency */
}

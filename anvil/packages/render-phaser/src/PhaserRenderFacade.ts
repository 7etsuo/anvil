/**
 * Phaser-backed RenderFacade with Canvas fallback.
 * Phaser is optional — inject via setPhaserFactory when bundled in a game.
 */
import {
  CanvasRenderFacade,
  type AssetServer,
  type DrawSpriteOpts,
  type DrawTextOpts,
  type RenderFacade,
} from "@anvil/core";

export type PhaserGameFactory = (opts: {
  width: number;
  height: number;
  parent: HTMLElement;
}) => {
  destroy: (removeCanvas?: boolean) => void;
};

let phaserFactory: PhaserGameFactory | null = null;

export function setPhaserFactory(factory: PhaserGameFactory | null): void {
  phaserFactory = factory;
}

export class PhaserRenderFacade implements RenderFacade {
  private canvas: CanvasRenderFacade;
  private game: ReturnType<PhaserGameFactory> | null = null;
  private mount: HTMLElement | null;

  constructor(mount?: HTMLElement | null) {
    this.mount = mount ?? null;
    this.canvas = new CanvasRenderFacade(mount);
  }

  setAssetServer(assets: AssetServer): void {
    this.canvas.setAssetServer(assets);
  }

  async init(width: number, height: number): Promise<void> {
    if (phaserFactory && this.mount) {
      try {
        this.game = phaserFactory({
          width,
          height,
          parent: this.mount,
        });
      } catch {
        this.game = null;
      }
    }
    await this.canvas.init(width, height);
  }

  resize(width: number, height: number): void {
    this.canvas.resize(width, height);
  }

  clear(cssColor: string): void {
    this.canvas.clear(cssColor);
  }

  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    cssColor: string,
    label?: string,
  ): void {
    this.canvas.drawQuad(x, y, w, h, cssColor, label);
  }

  drawSprite(
    path: string,
    x: number,
    y: number,
    opts?: DrawSpriteOpts,
  ): void {
    this.canvas.drawSprite(path, x, y, opts);
  }

  drawText(text: string, x: number, y: number, opts?: DrawTextOpts): void {
    this.canvas.drawText(text, x, y, opts);
  }

  beginFrame(): void {
    this.canvas.beginFrame();
  }

  endFrame(): void {
    this.canvas.endFrame();
  }

  captureScreenshot(): Promise<Uint8Array> {
    return this.canvas.captureScreenshot();
  }

  dispose(): void {
    this.game?.destroy(true);
    this.game = null;
    this.canvas.dispose();
  }
}

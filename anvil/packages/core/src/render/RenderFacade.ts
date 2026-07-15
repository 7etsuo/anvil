export interface DrawSpriteOpts {
  originX?: number;
  originY?: number;
  scale?: number;
  rotation?: number;
  alpha?: number;
  flipX?: boolean;
}

export interface DrawTextOpts {
  size?: number;
  color?: string;
  align?: string;
}

export interface RenderFacade {
  init(width: number, height: number): Promise<void>;
  resize(width: number, height: number): void;
  clear(cssColor: string): void;
  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    cssColor: string,
    label?: string,
  ): void;
  drawSprite(
    path: string,
    x: number,
    y: number,
    opts?: DrawSpriteOpts,
  ): void;
  drawText(text: string, x: number, y: number, opts?: DrawTextOpts): void;
  beginFrame(): void;
  endFrame(): void;
  captureScreenshot(): Promise<Uint8Array>;
  dispose(): void;
}

/** Headless / test renderer — no-ops except minimal PNG. */
export class NullRenderFacade implements RenderFacade {
  async init(): Promise<void> {}
  resize(): void {}
  clear(): void {}
  drawQuad(): void {}
  drawSprite(): void {}
  drawText(): void {}
  beginFrame(): void {}
  endFrame(): void {}
  async captureScreenshot(): Promise<Uint8Array> {
    // 1x1 PNG
    return Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }
  dispose(): void {}
}

import type { AssetServer } from "../assets/AssetServer.js";
import type {
  DrawSpriteOpts,
  DrawTextOpts,
  RenderFacade,
} from "./RenderFacade.js";

/** Browser Canvas2D renderer (no Phaser — allowed in core). */
export class CanvasRenderFacade implements RenderFacade {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 800;
  private height = 600;
  private assets: AssetServer | null = null;
  private camX = 0;
  private camY = 0;

  constructor(private readonly mount?: HTMLElement | null) {}

  setAssetServer(assets: AssetServer): void {
    this.assets = assets;
  }

  /** World-space camera top-left (for top-down follow). */
  setCamera(x: number, y: number): void {
    this.camX = x;
    this.camY = y;
  }

  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.background = "#000";
    canvas.tabIndex = 0;
    const parent = this.mount ?? document.body;
    parent.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  clear(cssColor: string): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    cssColor: string,
    label?: string,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const sx = x - this.camX;
    const sy = y - this.camY;
    ctx.fillStyle = cssColor;
    ctx.fillRect(sx, sy, w, h);
    if (label) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(label, sx + 2, sy + 12);
    }
  }

  drawSprite(
    path: string,
    x: number,
    y: number,
    opts?: DrawSpriteOpts,
  ): void {
    const s = opts?.scale ?? 1;
    const ctx = this.ctx;
    if (!ctx) return;
    const sx = x - this.camX;
    const sy = y - this.camY;

    if (this.assets) {
      const tex = this.assets.getTexture(path);
      if (tex.kind === "texture" && tex.image) {
        // Fit game sprites to a consistent on-screen size (source may be large AI art)
        const iw = 40 * s;
        const ih = 40 * s;
        ctx.save();
        ctx.globalAlpha = opts?.alpha ?? 1;
        if (opts?.flipX) {
          ctx.translate(sx + iw, sy);
          ctx.scale(-1, 1);
          ctx.drawImage(tex.image, 0, 0, iw, ih);
        } else {
          ctx.drawImage(tex.image, sx, sy, iw, ih);
        }
        ctx.restore();
        return;
      }
      if (tex.kind === "greybox") {
        this.drawQuad(x, y, 32 * s, 32 * s, tex.color, tex.label);
        return;
      }
    }

    this.drawQuad(x, y, 32 * s, 32 * s, "#666", path.split("/").pop());
  }

  drawText(text: string, x: number, y: number, opts?: DrawTextOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // HUD texts are screen-space (no camera)
    ctx.fillStyle = opts?.color ?? "#eee";
    ctx.font = `${opts?.size ?? 14}px system-ui, sans-serif`;
    ctx.textAlign = (opts?.align as CanvasTextAlign) ?? "left";
    ctx.fillText(text, x, y);
  }

  beginFrame(): void {}
  endFrame(): void {}

  async captureScreenshot(): Promise<Uint8Array> {
    if (!this.canvas) return new Uint8Array();
    const blob = await new Promise<Blob | null>((res) =>
      this.canvas!.toBlob((b) => res(b), "image/png"),
    );
    if (!blob) return new Uint8Array();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  dispose(): void {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}

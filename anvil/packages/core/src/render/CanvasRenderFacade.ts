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

  constructor(private readonly mount?: HTMLElement | null) {}

  setAssetServer(assets: AssetServer): void {
    this.assets = assets;
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = "block";
    canvas.style.background = "#111";
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
    ctx.fillStyle = cssColor;
    ctx.fillRect(x, y, w, h);
    if (label) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(label, x + 2, y + 12);
    }
  }

  drawSprite(
    path: string,
    x: number,
    y: number,
    opts?: DrawSpriteOpts,
  ): void {
    const s = opts?.scale ?? 1;
    const w = 16 * s;
    const h = 16 * s;
    const ctx = this.ctx;
    if (!ctx) return;

    if (this.assets) {
      const tex = this.assets.getTexture(path);
      if (tex.kind === "texture" && tex.image) {
        ctx.save();
        ctx.globalAlpha = opts?.alpha ?? 1;
        if (opts?.flipX) {
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(tex.image, 0, 0, w, h);
        } else {
          ctx.drawImage(tex.image, x, y, w, h);
        }
        ctx.restore();
        return;
      }
      if (tex.kind === "greybox") {
        this.drawQuad(x, y, w, h, tex.color, tex.label);
        return;
      }
    }

    this.drawQuad(x, y, w, h, "#666", path.split("/").pop());
  }

  drawText(text: string, x: number, y: number, opts?: DrawTextOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.fillStyle = opts?.color ?? "#eee";
    ctx.font = `${opts?.size ?? 14}px monospace`;
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

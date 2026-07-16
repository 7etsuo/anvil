# Spec: Render Facade + `@anvil/render-phaser`

## Interface (complete)

```ts
export interface RenderFacade {
  init(width: number, height: number): Promise<void>
  resize(width: number, height: number): void
  clear(cssColor: string): void
  drawQuad(x: number, y: number, w: number, h: number, cssColor: string, label?: string): void
  drawSprite(path: string, x: number, y: number, opts?: {
    originX?: number; originY?: number; scale?: number; rotation?: number; alpha?: number; flipX?: boolean
  }): void
  drawText(text: string, x: number, y: number, opts?: { size?: number; color?: string; align?: string }): void
  beginFrame(): void
  endFrame(): void
  captureScreenshot(): Promise<Uint8Array>  // PNG
  dispose(): void
}
```

## Implementations and package rules

- `NullRenderFacade` (core) no-ops and returns a minimal 1×1 PNG.
- `CanvasRenderFacade` (core) owns/reuses an HTML canvas, supports a simple
  world-space top-left camera, draws through Canvas2D, and captures PNG.
- `PhaserRenderFacade` (`@anvil/render-phaser`) constructs a Phaser game and
  implements the same facade.
- Only `@anvil/render-phaser` may import `phaser`.

`createGame` defaults to `NullRenderFacade`; browser hosts must pass the canvas
or Phaser facade they want. Browser mode also tells the kernel to skip its
default draw so a title-owned presentation loop is not cleared/overdrawn.

## Coordinates

- Screen space pixels; origin top-left  
- World→screen conversion is genre/camera responsibility. Canvas facade quad
  and sprite calls apply its configured top-left camera; text remains HUD
  screen space. Consumers should not assume every renderer applies the same
  implicit camera—prefer `ViewCamera`/explicit projection in game presentation.

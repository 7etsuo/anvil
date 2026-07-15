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

## Phaser package rules

- ONLY package that may `import 'phaser'`  
- MUST implement full interface  
- Headless: NullRenderFacade implements no-ops except capture returns empty or minimal PNG  

## Coordinates

- Screen space pixels; origin top-left  
- World→screen conversion is genre/camera responsibility (pass already-transformed coords to draw*)  

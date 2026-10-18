import type { BodyShape, Grade, Tier } from '../core/types'
import type { PortraitRequest, Renderer } from './renderer'
import type { Agent, SceneView } from './scene'
import { eyeAt, fishPath, hashString, patternBands, patternSpots } from './shape'
import { spriteFor, type ThemeManifest } from './theme'

/** Identity-transform scratch context used only for point-in-path tests. */
const probe = document.createElement('canvas').getContext('2d')!

/**
 * Monochrome dot-matrix look. Every shape is sampled onto a fixed dot grid
 * and drawn as on/off cells, the way a segment LCD would show it. Shading is
 * faked with a checkerboard dither because the panel has exactly one ink.
 */
export class LcdRenderer implements Renderer {
  private readonly cell: number

  constructor(readonly manifest: ThemeManifest) {
    this.cell = Math.max(2, manifest.cell ?? 4)
  }

  scene(ctx: CanvasRenderingContext2D, view: SceneView): void {
    const { width: w, height: h } = view
    const s = this.manifest.scene

    ctx.fillStyle = s.waterTop
    ctx.fillRect(0, 0, w, h)

    this.dotGrid(ctx, w, h)
    this.waterline(ctx, w, view.time)
    this.floor(ctx, w, h)

    for (const a of view.agents) this.agent(ctx, a, view.time)

    // Panel border drawn in whole cells, like a bezel.
    ctx.fillStyle = s.ink
    const c = this.cell
    for (let x = 0; x < w; x += c) {
      ctx.fillRect(x, 0, c - 1, c - 1)
      ctx.fillRect(x, h - c, c - 1, c - 1)
    }
    for (let y = 0; y < h; y += c) {
      ctx.fillRect(0, y, c - 1, c - 1)
      ctx.fillRect(w - c, y, c - 1, c - 1)
    }
  }

  /** The unlit dots of the panel, faintly visible the way real LCDs are. */
  private dotGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const c = this.cell
    ctx.fillStyle = this.manifest.scene.decor
    for (let y = 0; y < h; y += c) {
      for (let x = 0; x < w; x += c) ctx.fillRect(x, y, c - 1, c - 1)
    }
  }

  private waterline(ctx: CanvasRenderingContext2D, w: number, t: number): void {
    const c = this.cell
    ctx.fillStyle = this.manifest.scene.ink
    for (let x = 0; x < w; x += c) {
      const y = Math.round((6 + Math.sin(x * 0.05 + t) * 2) / c) * c
      ctx.fillRect(x, y + c * 2, c - 1, c - 1)
    }
  }

  private floor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const c = this.cell
    ctx.fillStyle = this.manifest.scene.sand
    const rows = 3
    for (let r = 0; r < rows; r++) {
      const y = h - c * (r + 2)
      for (let x = 0; x < w; x += c) {
        // Lower rows are solid, the top row is dithered into the water.
        const lit = r > 0 || ((x / c) | 0) % 2 === 0
        if (lit) ctx.fillRect(x, y, c - 1, c - 1)
      }
    }
    ctx.fillStyle = this.manifest.scene.accent
    for (const base of [w * 0.15, w * 0.8]) {
      const bx = Math.round(base / c) * c
      for (let i = 0; i < 6; i++) {
        const y = h - c * (3 + i)
        const x = bx + (i % 2 === 0 ? 0 : c)
        ctx.fillRect(x, y, c - 1, c - 1)
      }
    }
  }

  private agent(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
    const len = a.species.body.length * 4.2 * a.scale
    const c = this.cell
    const x = Math.round((a.x - len / 2) / c) * c
    const y = Math.round((a.y + Math.sin(t * 2 + a.phase) * c) / c) * c
    ctx.save()
    ctx.translate(x, y)
    if (a.dir === -1) {
      ctx.translate(len, 0)
      ctx.scale(-1, 1)
    }
    this.body(ctx, a.species.body, len, a.fish.grade, a.fish.tier, a.fish.speciesId)
    ctx.restore()
  }

  portrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: PortraitRequest): void {
    const len = Math.min(w * 0.86, h * 1.65)
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.4
    ctx.translate(Math.round((w - len) / 2), Math.round(h / 2))
    this.body(ctx, req.species.body, len, req.grade, req.tier, req.species.id)
    ctx.restore()
  }

  private body(
    ctx: CanvasRenderingContext2D,
    bodyShape: BodyShape,
    len: number,
    grade: Grade,
    tier: Tier,
    speciesId: string,
  ): void {
    const height = len * bodyShape.depth
    const sprite = spriteFor(this.manifest, speciesId)
    if (sprite) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sprite, 0, -height / 2, len, height)
      return
    }

    const c = this.cell
    const { path } = fishPath(bodyShape, len)
    const ink = this.manifest.scene.ink
    const bands = patternBands(bodyShape, len)
    const spots = patternSpots(bodyShape, len, hashString(speciesId))

    ctx.fillStyle = ink
    for (let gy = -Math.ceil(height / 2 / c) * c - c; gy <= height / 2 + c; gy += c) {
      for (let gx = -c; gx <= len + c; gx += c) {
        const cx = gx + c / 2
        const cy = gy + c / 2
        if (!probe.isPointInPath(path, cx, cy)) continue

        // One ink, so interior detail has to be carved out by dithering.
        const onBand = bands.some((b) => Math.abs(cx - b.x) <= b.w / 2)
        const onSpot = spots.some((s) => Math.hypot(cx - s.x, cy - s.y) <= s.r)
        const checker = (((gx / c) | 0) + ((gy / c) | 0)) % 2 === 0
        const hollow = (onBand || onSpot) && checker
        // Low tiers read as outlines, high tiers fill in solid.
        const interiorOnly = tier <= 1 && !this.isEdge(path, cx, cy, c)
        if (hollow || interiorOnly) continue

        ctx.fillRect(gx, gy, c - 1, c - 1)
      }
    }

    // Grade is shown as a notch count on the flank, since colour is unavailable.
    if (grade > 1) {
      ctx.fillStyle = this.manifest.scene.accent
      for (let i = 0; i < grade - 1; i++) {
        ctx.fillRect(len * 0.3 + i * c * 1.5, -height * 0.1, c - 1, c - 1)
      }
    }

    const eye = eyeAt(bodyShape, len)
    ctx.fillStyle = this.manifest.scene.waterTop
    ctx.fillRect(Math.round(eye.x / c) * c, Math.round(eye.y / c) * c, c - 1, c - 1)
  }

  /** True when a neighbouring sample falls outside the body. */
  private isEdge(path: Path2D, cx: number, cy: number, c: number): boolean {
    return (
      !probe.isPointInPath(path, cx + c, cy) ||
      !probe.isPointInPath(path, cx - c, cy) ||
      !probe.isPointInPath(path, cx, cy + c) ||
      !probe.isPointInPath(path, cx, cy - c)
    )
  }
}

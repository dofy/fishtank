import type { BodyShape, DecorItem, Grade, Tier } from '../core/types'
import type { DecorPortraitRequest, PortraitRequest, Renderer } from './renderer'
import type { Agent, DecorNode, SceneView, SplashEffect } from './scene'
import { decorLayers, eyeAt, fishPath, hashString, patternBands, patternSpots } from './shape'
import { type SceneColors, type ThemeManifest, sceneColorsFor, spriteFor } from './theme'

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
    const night = Boolean(view.night)
    const s = sceneColorsFor(this.manifest, night)

    ctx.fillStyle = s.waterTop
    ctx.fillRect(0, 0, w, h)

    this.dotGrid(ctx, w, h, s)
    if (night) {
      this.lampCones(ctx, w, h, s)
    }
    this.waterline(ctx, w, view.time, s)
    this.floor(ctx, w, h, s)

    for (const d of view.decors) this.decorNode(ctx, d, h, view.time, s, night)
    for (const a of view.agents) this.agent(ctx, a, view.time, s)
    if (view.splashes) {
      for (const sp of view.splashes) this.splash(ctx, sp, s)
    }

    this.lampsFixture(ctx, w, s, night)

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

  private lampPositions(w: number): number[] {
    if (w < 380) return [w * 0.28, w * 0.72]
    return [w * 0.22, w * 0.5, w * 0.78]
  }

  /** Dot-matrix dithered light cones under the decorative lamps in night mode. */
  private lampCones(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneColors): void {
    const c = this.cell
    const lamps = this.lampPositions(w).map((x) => Math.round(x / c) * c)
    ctx.fillStyle = s.accent
    for (let y = c * 3; y < h - c * 4; y += c) {
      const progress = (y - c * 3) / Math.max(1, h - c * 7)
      const halfSpan = c * 2 + progress * (w * 0.14)
      for (const lx of lamps) {
        const startX = Math.max(c, Math.floor((lx - halfSpan) / c) * c)
        const endX = Math.min(w - c * 2, Math.ceil((lx + halfSpan) / c) * c)
        for (let x = startX; x <= endX; x += c) {
          const gx = (x / c) | 0
          const gy = (y / c) | 0
          // Sparse dither near the bottom, denser near the lamp
          const mask = progress < 0.45 ? (gx + gy) % 2 === 0 : gx % 2 === 0 && gy % 2 === 0
          if (mask) ctx.fillRect(x, y, c - 1, c - 1)
        }
      }
    }
  }

  /** Pixelated lamp hoods mounted along the top bezel. */
  private lampsFixture(
    ctx: CanvasRenderingContext2D,
    w: number,
    s: SceneColors,
    night: boolean,
  ): void {
    const c = this.cell
    const lamps = this.lampPositions(w).map((x) => Math.round(x / c) * c)
    for (const lx of lamps) {
      ctx.fillStyle = s.ink
      for (let dx = -c * 3; dx <= c * 3; dx += c) {
        ctx.fillRect(lx + dx, c, c - 1, c - 1)
      }
      if (night) {
        for (let dx = -c * 2; dx <= c * 2; dx += c) {
          ctx.fillRect(lx + dx, c * 2, c - 1, c - 1)
        }
      }
    }
  }

  /** The unlit dots of the panel, faintly visible the way real LCDs are. */
  private dotGrid(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneColors): void {
    const c = this.cell
    ctx.fillStyle = s.decor
    for (let y = 0; y < h; y += c) {
      for (let x = 0; x < w; x += c) ctx.fillRect(x, y, c - 1, c - 1)
    }
  }

  private waterline(ctx: CanvasRenderingContext2D, w: number, t: number, s: SceneColors): void {
    const c = this.cell
    ctx.fillStyle = s.ink
    for (let x = 0; x < w; x += c) {
      const y = Math.round((6 + Math.sin(x * 0.05 + t) * 2) / c) * c
      ctx.fillRect(x, y + c * 2, c - 1, c - 1)
    }
  }

  private floor(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneColors): void {
    const c = this.cell
    ctx.fillStyle = s.sand
    const rows = 3
    for (let r = 0; r < rows; r++) {
      const y = h - c * (r + 2)
      for (let x = 0; x < w; x += c) {
        // Lower rows are solid, the top row is dithered into the water.
        const lit = r > 0 || ((x / c) | 0) % 2 === 0
        if (lit) ctx.fillRect(x, y, c - 1, c - 1)
      }
    }
  }

  private decorNode(
    ctx: CanvasRenderingContext2D,
    node: DecorNode,
    tankH: number,
    t: number,
    s: SceneColors,
    night = false,
  ): void {
    const c = this.cell
    const isTop = node.item.mount === 'top'
    const anchorY = isTop
      ? Math.round((c * 2 + node.item.height) / c) * c
      : Math.round((tankH - c * 4) / c) * c
    const bx = Math.round(node.x / c) * c
    ctx.save()
    ctx.translate(bx, anchorY)

    if (isTop && night) {
      const hw = Math.ceil(node.item.width / 2 / c) * c
      const hh = Math.ceil(node.item.height / c) * c
      ctx.fillStyle = s.accent
      for (let y = -hh; y <= c * 3; y += c * 2) {
        for (let x = -hw; x <= hw; x += c * 2) {
          ctx.fillRect(x, y, c - 1, c - 1)
        }
      }
    }

    if (node.active) {
      const hw = Math.ceil(node.item.width / 2 / c) * c + c
      const hh = Math.ceil(node.item.height / c) * c + c
      ctx.fillStyle = s.ink
      for (let x = -hw; x <= hw; x += c * 2) {
        ctx.fillRect(x, -hh, c - 1, c - 1)
        ctx.fillRect(x, 0, c - 1, c - 1)
      }
      for (let y = -hh; y <= 0; y += c * 2) {
        ctx.fillRect(-hw, y, c - 1, c - 1)
        ctx.fillRect(hw, y, c - 1, c - 1)
      }
    }
    ctx.scale(node.flip, 1)
    this.drawDecor(ctx, node.item, node.item.width, node.item.height, t, s)
    ctx.restore()
  }

  decorPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: DecorPortraitRequest): void {
    const item = req.item
    const scale = Math.min((w * 0.72) / item.width, (h * 0.82) / item.height)
    const dw = item.width * scale
    const dh = item.height * scale
    const night = document.documentElement.dataset.mode !== 'light'
    const s = sceneColorsFor(this.manifest, night)
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.4
    ctx.translate(Math.round(w / 2), Math.round(h - (h - dh) / 2))
    this.drawDecor(ctx, item, dw, dh, 0, s)
    ctx.restore()
  }

  private drawDecor(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    w: number,
    h: number,
    t: number,
    s: SceneColors,
  ): void {
    const sprite = spriteFor(this.manifest, `decor-${item.id}`)
    if (sprite) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sprite, -w / 2, -h, w, h)
      return
    }

    const c = this.cell
    const layers = decorLayers(item.id, w, h, t)
    const secondary = layers.find((l) => l.role === 'secondary')?.path
    const primary = layers.find((l) => l.role === 'primary')?.path
    const detail = layers.find((l) => l.role === 'detail')?.path

    const halfW = Math.ceil(w / 2 / c) * c + c
    const topY = -Math.ceil(h / c) * c - c

    for (let gy = topY; gy <= 0; gy += c) {
      for (let gx = -halfW; gx <= halfW; gx += c) {
        const cx = gx + c / 2
        const cy = gy + c / 2
        const inDetail = detail ? probe.isPointInPath(detail, cx, cy) : false
        const inPrimary = primary ? probe.isPointInPath(primary, cx, cy) : false
        const inSecondary = secondary ? probe.isPointInPath(secondary, cx, cy) : false

        if (!inDetail && !inPrimary && !inSecondary) continue

        const checker = (((gx / c) | 0) + ((gy / c) | 0)) % 2 === 0
        if (inDetail) {
          if (checker) {
            ctx.fillStyle = s.waterTop
            ctx.fillRect(gx, gy, c - 1, c - 1)
          } else {
            ctx.fillStyle = s.ink
            ctx.fillRect(gx, gy, c - 1, c - 1)
          }
        } else if (inPrimary) {
          ctx.fillStyle = s.ink
          ctx.fillRect(gx, gy, c - 1, c - 1)
        } else if (inSecondary && checker) {
          ctx.fillStyle = s.accent
          ctx.fillRect(gx, gy, c - 1, c - 1)
        }
      }
    }
  }

  private splash(ctx: CanvasRenderingContext2D, sp: SplashEffect, s: SceneColors): void {
    const c = this.cell
    const p = Math.min(1, sp.age / sp.duration)
    const span = Math.round((8 + p * 26) / c) * c
    const bx = Math.round(sp.x / c) * c
    const by = Math.round(sp.y / c) * c
    ctx.fillStyle = s.ink
    ctx.fillRect(bx - span, by, c - 1, c - 1)
    ctx.fillRect(bx + span, by, c - 1, c - 1)
    if (p < 0.65) {
      const dy = Math.round((Math.sin(p * Math.PI) * 14) / c) * c
      ctx.fillRect(bx - span * 0.5, by - dy, c - 1, c - 1)
      ctx.fillRect(bx + span * 0.5, by - dy, c - 1, c - 1)
    }
  }

  private agent(ctx: CanvasRenderingContext2D, a: Agent, t: number, s: SceneColors): void {
    const len = a.species.body.length * 4.2 * a.scale
    const c = this.cell
    const x = Math.round((a.x - len / 2) / c) * c
    const y = Math.round((a.y + (a.dropping ? 0 : Math.sin(t * 2 + a.phase) * c)) / c) * c
    ctx.save()
    ctx.translate(x, y)
    if (a.dir === -1) {
      ctx.translate(len, 0)
      ctx.scale(-1, 1)
    }
    this.body(ctx, a.species.body, len, a.fish.grade, a.fish.tier, a.fish.speciesId, s, t + a.phase)
    ctx.restore()
  }

  portrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: PortraitRequest): void {
    const depth = Math.max(0.35, req.species.body.depth)
    const len = Math.min(w * 0.82, (h * 0.76) / depth)
    const night = document.documentElement.dataset.mode !== 'light'
    const s = sceneColorsFor(this.manifest, night)
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.4
    ctx.translate(Math.round((w - len) / 2), Math.round(h / 2))
    this.body(ctx, req.species.body, len, req.grade, req.tier, req.species.id, s, 0)
    ctx.restore()
  }

  private body(
    ctx: CanvasRenderingContext2D,
    bodyShape: BodyShape,
    len: number,
    grade: Grade,
    tier: Tier,
    speciesId: string,
    s: SceneColors,
    animPhase = 0,
  ): void {
    const height = len * bodyShape.depth
    const sprite = spriteFor(this.manifest, speciesId)
    if (sprite) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sprite, 0, -height / 2, len, height)
      return
    }

    const c = this.cell
    const { path } = fishPath(bodyShape, len, animPhase)
    const ink = s.ink
    const bands = patternBands(bodyShape, len)
    const spots = patternSpots(bodyShape, len, hashString(speciesId))

    ctx.fillStyle = ink
    for (let gy = -Math.ceil(height / 2 / c) * c - c; gy <= height / 2 + c; gy += c) {
      for (let gx = -c; gx <= len + c; gx += c) {
        const cx = gx + c / 2
        const cy = gy + c / 2
        if (!probe.isPointInPath(path, cx, cy)) continue

        const onBand = bands.some((b) => Math.abs(cx - b.x) <= b.w / 2)
        const onSpot = spots.some((sp) => Math.hypot(cx - sp.x, cy - sp.y) <= sp.r)
        const checker = (((gx / c) | 0) + ((gy / c) | 0)) % 2 === 0
        const hollow = (onBand || onSpot) && checker
        const interiorOnly = tier <= 1 && !this.isEdge(path, cx, cy, c)
        if (hollow || interiorOnly) continue

        ctx.fillRect(gx, gy, c - 1, c - 1)
      }
    }

    if (grade > 1) {
      ctx.fillStyle = s.accent
      for (let i = 0; i < grade - 1; i++) {
        ctx.fillRect(len * 0.3 + i * c * 1.5, -height * 0.1, c - 1, c - 1)
      }
    }

    if (bodyShape.form !== 'jellyfish') {
      const eye = eyeAt(bodyShape, len, animPhase)
      ctx.fillStyle = s.waterTop
      ctx.fillRect(Math.round(eye.x / c) * c, Math.round(eye.y / c) * c, c - 1, c - 1)
    }
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

import type { DecorItem, Grade, Tier } from '../core/types'
import type { DecorPortraitRequest, PortraitRequest, Renderer } from './renderer'
import type { Agent, DecorNode, SceneView } from './scene'
import { decorLayers, eyeAt, fishPath, hashString, patternBands, patternSpots } from './shape'
import { spriteFor, type ThemeManifest } from './theme'

/** Soft-shaded reef look: gradients, caustics, drifting bubbles. */
export class RealisticRenderer implements Renderer {
  constructor(readonly manifest: ThemeManifest) {}

  scene(ctx: CanvasRenderingContext2D, view: SceneView): void {
    const { width: w, height: h } = view
    const s = this.manifest.scene

    const water = ctx.createLinearGradient(0, 0, 0, h)
    water.addColorStop(0, s.waterTop)
    water.addColorStop(1, s.waterBottom)
    ctx.fillStyle = water
    ctx.fillRect(0, 0, w, h)

    this.caustics(ctx, w, h, view.time)
    this.sandFloor(ctx, w, h)

    for (const d of view.decors) this.decorNode(ctx, d, h, view.time)
    for (const a of view.agents) this.agent(ctx, a, view.time)

    this.bubbles(ctx, w, h, view.time)

    // Glass edge, so the tank reads as a container.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, w - 2, h - 2)
  }

  private caustics(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      const y = (h / 8) * (i + 0.5)
      for (let x = 0; x <= w; x += 12) {
        const wobble = Math.sin(x * 0.02 + t * 0.6 + i) * 6
        if (x === 0) ctx.moveTo(x, y + wobble)
        else ctx.lineTo(x, y + wobble)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  private sandFloor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const s = this.manifest.scene
    ctx.fillStyle = s.sand
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, h - 18)
    for (let x = 0; x <= w; x += 24) ctx.lineTo(x, h - 18 - Math.sin(x * 0.05) * 4)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }

  private decorNode(ctx: CanvasRenderingContext2D, node: DecorNode, tankH: number, t: number): void {
    const floorY = tankH - 14
    ctx.save()
    ctx.translate(node.x, floorY)
    if (node.active) {
      ctx.save()
      ctx.strokeStyle = this.manifest.scene.accent
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.strokeRect(
        -node.item.width / 2 - 4,
        -node.item.height - 4,
        node.item.width + 8,
        node.item.height + 6,
      )
      ctx.restore()
    }
    ctx.scale(node.flip, 1)
    this.drawDecor(ctx, node.item, node.item.width, node.item.height, t)
    ctx.restore()
  }

  decorPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: DecorPortraitRequest): void {
    const item = req.item
    const scale = Math.min((w * 0.72) / item.width, (h * 0.82) / item.height)
    const dw = item.width * scale
    const dh = item.height * scale
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.35
    ctx.translate(w / 2, h - (h - dh) / 2)
    this.drawDecor(ctx, item, dw, dh, 0)
    ctx.restore()
  }

  private drawDecor(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    w: number,
    h: number,
    t: number,
  ): void {
    const sprite = spriteFor(this.manifest, `decor-${item.id}`)
    if (sprite) {
      ctx.drawImage(sprite, -w / 2, -h, w, h)
      return
    }

    const layers = decorLayers(item.id, w, h, t)
    const primaryTop = `hsl(${item.hue} ${item.sat * 100}% ${Math.min(82, item.light * 115)}%)`
    const primaryBot = `hsl(${item.hue} ${item.sat * 100}% ${Math.max(18, item.light * 75)}%)`
    const secondaryFill = `hsl(${item.hue} ${Math.max(10, item.sat * 75)}% ${Math.max(14, item.light * 65)}%)`
    const detailFill = `hsl(${(item.hue + 38) % 360} 85% 74%)`

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2

    for (const layer of layers) {
      if (layer.role === 'secondary') {
        ctx.fillStyle = secondaryFill
      } else if (layer.role === 'primary') {
        const grad = ctx.createLinearGradient(0, -h, 0, 0)
        grad.addColorStop(0, primaryTop)
        grad.addColorStop(1, primaryBot)
        ctx.fillStyle = grad
      } else {
        ctx.fillStyle = detailFill
      }
      ctx.fill(layer.path)
    }
    ctx.restore()
  }

  private bubbles(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 14; i++) {
      const seed = hashString(`bubble${i}`)
      const x = (seed % w) + Math.sin(t + i) * 4
      const period = 6 + (seed % 5)
      const y = h - ((t * 18 + (seed % 400)) % (h + 40))
      const r = 1.5 + (seed % 3)
      ctx.beginPath()
      ctx.arc(x, y, r + Math.sin(t / period) * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private agent(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
    const len = a.species.body.length * 4.2 * a.scale
    ctx.save()
    ctx.translate(a.x, a.y + Math.sin(t * 2 + a.phase) * 3)
    ctx.scale(a.dir, 1)
    ctx.translate(-len / 2, 0)
    this.body(ctx, a.species.body, len, a.fish.grade, a.fish.tier, a.fish.speciesId)
    ctx.restore()
  }

  portrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: PortraitRequest): void {
    const len = Math.min(w * 0.86, h * 1.65)
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.35
    ctx.translate((w - len) / 2, h / 2)
    this.body(ctx, req.species.body, len, req.grade, req.tier, req.species.id)
    ctx.restore()
  }

  private body(
    ctx: CanvasRenderingContext2D,
    bodyShape: import('../core/types').BodyShape,
    len: number,
    grade: Grade,
    tier: Tier,
    speciesId: string,
  ): void {
    const sprite = spriteFor(this.manifest, speciesId)
    const height = len * bodyShape.depth
    if (sprite) {
      ctx.drawImage(sprite, 0, -height / 2, len, height)
      return
    }

    const { path } = fishPath(bodyShape, len)
    const sat = Math.min(1, bodyShape.sat + grade * 0.04)
    const light = Math.min(0.85, bodyShape.light + tier * 0.015)
    const main = `hsl(${bodyShape.hue} ${sat * 100}% ${light * 100}%)`
    const belly = `hsl(${bodyShape.hue} ${sat * 70}% ${Math.min(95, light * 135)}%)`

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 3
    const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2)
    grad.addColorStop(0, main)
    grad.addColorStop(1, belly)
    ctx.fillStyle = grad
    ctx.fill(path)
    ctx.restore()

    ctx.save()
    ctx.clip(path)
    ctx.fillStyle = `hsl(${bodyShape.hue} ${sat * 100}% ${Math.max(12, light * 55)}%)`
    for (const band of patternBands(bodyShape, len)) {
      ctx.fillRect(band.x - band.w / 2, -height / 2, band.w, height)
    }
    for (const spot of patternSpots(bodyShape, len, hashString(speciesId))) {
      ctx.beginPath()
      ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2)
      ctx.fill()
    }
    if (grade >= 4) {
      const sheen = ctx.createLinearGradient(0, -height / 2, 0, 0)
      sheen.addColorStop(0, 'rgba(255,255,255,0.55)')
      sheen.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = sheen
      ctx.fillRect(0, -height / 2, len, height / 2)
    }
    ctx.restore()

    const eye = eyeAt(bodyShape, len)
    ctx.fillStyle = '#f8f8f8'
    ctx.beginPath()
    ctx.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = this.manifest.scene.ink
    ctx.beginPath()
    ctx.arc(eye.x + eye.r * 0.2, eye.y, eye.r * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }
}

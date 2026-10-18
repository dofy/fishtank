import type { DecorItem, Grade, Tier } from '../core/types'
import type { DecorPortraitRequest, PortraitRequest, Renderer } from './renderer'
import type { Agent, DecorNode, FoodPellet, SceneView, SplashEffect } from './scene'
import { decorLayers, eyeAt, fishPath, hashString, patternBands, patternSpots } from './shape'
import { type SceneColors, type ThemeManifest, sceneColorsFor, spriteFor } from './theme'

/** Soft-shaded reef look: gradients, caustics, drifting bubbles, and night decorative lamps. */
export class RealisticRenderer implements Renderer {
  constructor(readonly manifest: ThemeManifest) {}

  scene(ctx: CanvasRenderingContext2D, view: SceneView): void {
    const { width: w, height: h } = view
    const night = Boolean(view.night)
    const s = sceneColorsFor(this.manifest, night)

    const water = ctx.createLinearGradient(0, 0, 0, h)
    water.addColorStop(0, s.waterTop)
    water.addColorStop(1, s.waterBottom)
    ctx.fillStyle = water
    ctx.fillRect(0, 0, w, h)

    if (night) {
      this.lampLightCones(ctx, w, h, view.time)
    }
    this.caustics(ctx, w, h, view.time, night)
    this.sandFloor(ctx, w, h, s, night)

    for (const d of view.decors) this.decorNode(ctx, d, h, view.time, s, night)
    if (view.foods) {
      for (const f of view.foods) this.foodPellet(ctx, f)
    }
    for (const a of view.agents) this.agent(ctx, a, view.time)
    if (view.splashes) {
      for (const sp of view.splashes) this.splash(ctx, sp)
    }

    this.bubbles(ctx, w, h, view.time)
    this.lampsFixture(ctx, w, night)

    // Glass edge, so the tank reads as a container.
    ctx.strokeStyle = night ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.38)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, w - 2, h - 2)
  }

  private lampPositions(w: number): number[] {
    if (w < 380) return [w * 0.28, w * 0.72]
    return [w * 0.22, w * 0.5, w * 0.78]
  }

  /** Volumetric decorative light cones cast into the water when night mode is active. */
  private lampLightCones(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const lamps = this.lampPositions(w)
    const beamColors: [string, string][] = [
      ['rgba(254, 240, 138, 0.26)', 'rgba(56, 189, 248, 0.08)'],
      ['rgba(125, 211, 252, 0.26)', 'rgba(167, 139, 250, 0.08)'],
      ['rgba(254, 240, 138, 0.26)', 'rgba(56, 189, 248, 0.08)'],
    ]

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (const [idx, lx] of lamps.entries()) {
      const sway = Math.sin(t * 0.7 + idx * 1.4) * 14
      const topHalf = 14
      const botHalf = Math.max(75, w * 0.18)
      const [c0, c1] = beamColors[idx % beamColors.length]!

      const cone = ctx.createLinearGradient(lx, 8, lx + sway, h - 10)
      cone.addColorStop(0, c0)
      cone.addColorStop(0.55, c1)
      cone.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = cone
      ctx.beginPath()
      ctx.moveTo(lx - topHalf, 8)
      ctx.lineTo(lx + topHalf, 8)
      ctx.lineTo(lx + botHalf + sway, h)
      ctx.lineTo(lx - botHalf + sway, h)
      ctx.closePath()
      ctx.fill()

      // Warm halo right under the bulb
      const halo = ctx.createRadialGradient(lx, 12, 2, lx, 16, 46)
      halo.addColorStop(0, 'rgba(254, 249, 195, 0.55)')
      halo.addColorStop(0.5, 'rgba(56, 189, 248, 0.16)')
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(lx, 12, 46, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Top aquarium decorative light bar & pendant bulbs (present in day & night, lit at night). */
  private lampsFixture(ctx: CanvasRenderingContext2D, w: number, night: boolean): void {
    const lamps = this.lampPositions(w)
    ctx.save()

    // Top mounting rail
    ctx.fillStyle = night ? '#112636' : '#234b61'
    ctx.fillRect(12, 2, w - 24, 4)

    for (const [idx, lx] of lamps.entries()) {
      // Lamp hood
      ctx.fillStyle = night ? '#1b394f' : '#2d5c75'
      ctx.beginPath()
      ctx.moveTo(lx - 18, 3)
      ctx.lineTo(lx + 18, 3)
      ctx.lineTo(lx + 13, 10)
      ctx.lineTo(lx - 13, 10)
      ctx.closePath()
      ctx.fill()

      // Bulb LED strip
      if (night) {
        const isWarm = idx % 2 === 0
        ctx.save()
        ctx.shadowColor = isWarm ? '#fde047' : '#38bdf8'
        ctx.shadowBlur = 12
        ctx.fillStyle = isWarm ? '#fef08a' : '#bae6fd'
        ctx.fillRect(lx - 10, 8, 20, 3.5)
        ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.fillRect(lx - 10, 8, 20, 2.5)
      }
    }

    ctx.restore()
  }

  private caustics(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    night: boolean,
  ): void {
    ctx.save()
    ctx.globalAlpha = night ? 0.08 : 0.15
    ctx.strokeStyle = night ? '#7dd3fc' : '#ffffff'
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

  private sandFloor(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    s: SceneColors,
    night: boolean,
  ): void {
    ctx.fillStyle = s.sand
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, h - 18)
    for (let x = 0; x <= w; x += 24) ctx.lineTo(x, h - 18 - Math.sin(x * 0.05) * 4)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // Soft light pools on the sand floor under each decorative lamp at night
    if (night) {
      ctx.save()
      for (const lx of this.lampPositions(w)) {
        const pool = ctx.createRadialGradient(lx, h - 10, 4, lx, h - 10, 68)
        pool.addColorStop(0, 'rgba(254, 240, 138, 0.28)')
        pool.addColorStop(1, 'rgba(254, 240, 138, 0)')
        ctx.fillStyle = pool
        ctx.fillRect(lx - 70, h - 24, 140, 24)
      }
      ctx.restore()
    }
  }

  private decorNode(
    ctx: CanvasRenderingContext2D,
    node: DecorNode,
    tankH: number,
    t: number,
    s: SceneColors,
    night: boolean,
  ): void {
    const isTop = node.item.mount === 'top'
    const anchorY = isTop ? 4 + node.item.height : tankH - 14
    ctx.save()
    ctx.translate(node.x, anchorY)

    // Night ambient glow halo for top-mounted decorative lights
    if (isTop && night) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const glowColor = `hsla(${node.item.hue}, 95%, 72%, 0.35)`
      const rad = Math.max(node.item.width * 0.65, 58)
      const halo = ctx.createRadialGradient(0, -node.item.height * 0.45, 4, 0, -node.item.height * 0.3, rad)
      halo.addColorStop(0, glowColor)
      halo.addColorStop(0.55, `hsla(${(node.item.hue + 40) % 360}, 90%, 65%, 0.14)`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(0, -node.item.height * 0.35, rad, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    if (node.active) {
      ctx.save()
      ctx.strokeStyle = s.accent
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
    this.drawDecor(ctx, node.item, node.item.width, node.item.height, t, night)
    ctx.restore()
  }

  decorPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: DecorPortraitRequest): void {
    const item = req.item
    const scale = Math.min((w * 0.72) / item.width, (h * 0.82) / item.height)
    const dw = item.width * scale
    const dh = item.height * scale
    const night = document.documentElement.dataset.mode !== 'light'
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.35
    ctx.translate(w / 2, h - (h - dh) / 2)
    this.drawDecor(ctx, item, dw, dh, 0, night)
    ctx.restore()
  }

  private drawDecor(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    w: number,
    h: number,
    t: number,
    night = false,
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
    const detailFill = `hsl(${(item.hue + 38) % 360} 90% ${night ? 78 : 72}%)`

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2

    for (const layer of layers) {
      if (layer.role === 'secondary') {
        ctx.fillStyle = secondaryFill
        ctx.fill(layer.path)
      } else if (layer.role === 'primary') {
        const grad = ctx.createLinearGradient(0, -h, 0, 0)
        grad.addColorStop(0, primaryTop)
        grad.addColorStop(1, primaryBot)
        ctx.fillStyle = grad
        ctx.fill(layer.path)
      } else {
        ctx.save()
        const isTop = item.mount === 'top'
        if (night) {
          ctx.shadowColor = detailFill
          ctx.shadowBlur = isTop ? 14 : 8
          ctx.fillStyle = isTop ? `hsl(${item.hue} 100% 84%)` : detailFill
        } else {
          ctx.fillStyle = isTop ? `hsla(${item.hue}, 55%, 78%, 0.55)` : detailFill
        }
        ctx.fill(layer.path)
        ctx.restore()
      }
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

  private foodPellet(ctx: CanvasRenderingContext2D, f: FoodPellet): void {
    ctx.save()
    ctx.shadowColor = 'rgba(251, 191, 36, 0.55)'
    ctx.shadowBlur = 5
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(f.x, f.y, 3.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(f.x - 1, f.y - 1, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private splash(ctx: CanvasRenderingContext2D, sp: SplashEffect): void {
    const p = Math.min(1, sp.age / sp.duration)
    ctx.save()
    ctx.globalAlpha = (1 - p) * 0.85

    // Expanding surface ripple ring
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(sp.x, sp.y + 4, 8 + p * 34, 3 + p * 7, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Flying water droplets & rising entry bubbles
    ctx.fillStyle = '#e0f2fe'
    const angles = [-2.4, -2.0, -1.65, -1.35, -1.0, -0.6]
    for (const [i, ang] of angles.entries()) {
      const speed = 38 + (i % 3) * 14
      const dx = Math.cos(ang) * speed * p
      const dy = Math.sin(ang) * speed * p + 68 * p * p
      ctx.beginPath()
      ctx.arc(sp.x + dx, sp.y + dy, Math.max(1.2, 3.2 * (1 - p * 0.6)), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private agent(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
    const len = a.species.body.length * 4.2 * a.scale
    ctx.save()
    ctx.translate(a.x, a.y + (a.dropping ? 0 : Math.sin(t * 2 + a.phase) * 2.5))
    ctx.scale(a.dir, 1)
    if (a.tilt) ctx.rotate(a.tilt)
    ctx.translate(-len / 2, 0)
    this.body(ctx, a.species.body, len, a.fish.grade, a.fish.tier, a.fish.speciesId, t + a.phase)
    ctx.restore()
  }

  portrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: PortraitRequest): void {
    const depth = Math.max(0.35, req.species.body.depth)
    const len = Math.min(w * 0.82, (h * 0.76) / depth)
    ctx.save()
    if (req.dim) ctx.globalAlpha = 0.35
    ctx.translate((w - len) / 2, h / 2)
    this.body(ctx, req.species.body, len, req.grade, req.tier, req.species.id, 0)
    ctx.restore()
  }

  private body(
    ctx: CanvasRenderingContext2D,
    bodyShape: import('../core/types').BodyShape,
    len: number,
    grade: Grade,
    tier: Tier,
    speciesId: string,
    animPhase = 0,
  ): void {
    const sprite = spriteFor(this.manifest, speciesId)
    const height = len * bodyShape.depth
    if (sprite) {
      ctx.drawImage(sprite, 0, -height / 2, len, height)
      return
    }

    const { path } = fishPath(bodyShape, len, animPhase)
    const hueOffset = [0, 0, 18, -22, 42, 135][grade] ?? 0
    const hue = (bodyShape.hue + hueOffset + 360) % 360
    const sat = Math.min(1, bodyShape.sat + grade * 0.04)
    const light = Math.min(0.85, bodyShape.light + tier * 0.015)
    const main = `hsl(${hue} ${sat * 100}% ${light * 100}%)`
    const belly = `hsl(${hue} ${sat * 70}% ${Math.min(95, light * 135)}%)`

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
    ctx.fillStyle = `hsl(${hue} ${sat * 100}% ${Math.max(12, light * 55)}%)`
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

    if (bodyShape.form !== 'jellyfish') {
      const eye = eyeAt(bodyShape, len, animPhase)
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
}

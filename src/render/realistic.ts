import type { DecorItem, Grade, Tier } from '../core/types'
import type { DecorPortraitRequest, PortraitRequest, Renderer } from './renderer'
import type { Agent, DecorNode, FoodPellet, SceneView, SplashEffect } from './scene'
import { foregroundDecor, pufferAmount } from './ecology'
import { drawRailBeads } from './rail-lights'
import { withdrawalOpacity, withdrawalScale } from './withdrawal'
import { secretMarkings, decorLayers, elongatedProfile, eyeAt, fishPath, hashString, patternBands, patternSpots } from './shape'
import { type SceneColors, type ThemeManifest, lampPositions, sceneColorsFor, spriteFor } from './theme'

/**
 * 7-color spectrum palette for the overhead night aquarium lamps.
 * Brightness and saturation are tuned for 'screen' blending against the deep navy night water (#0b2d3d -> #031018).
 */
interface LampColorSpec {
  bulb: string
  glow: string
  coneTop: string
  coneMid: string
  haloInner: string
  haloMid: string
  sandPool: string
  sandPoolZero: string
}

const LAMP_PALETTE: readonly LampColorSpec[] = [
  // 0: Coral Rose (warm spectrum red-pink)
  {
    bulb: '#fecdd3',
    glow: '#fb7185',
    coneTop: 'rgba(251, 113, 133, 0.22)',
    coneMid: 'rgba(244, 63, 94, 0.07)',
    haloInner: 'rgba(254, 205, 211, 0.50)',
    haloMid: 'rgba(251, 113, 133, 0.16)',
    sandPool: 'rgba(251, 113, 133, 0.24)',
    sandPoolZero: 'rgba(251, 113, 133, 0)',
  },
  // 1: Warm Amber Gold (classic warm aquarium glow)
  {
    bulb: '#fef08a',
    glow: '#facc15',
    coneTop: 'rgba(254, 240, 138, 0.25)',
    coneMid: 'rgba(251, 191, 36, 0.08)',
    haloInner: 'rgba(254, 249, 195, 0.54)',
    haloMid: 'rgba(250, 204, 21, 0.16)',
    sandPool: 'rgba(254, 240, 138, 0.26)',
    sandPoolZero: 'rgba(254, 240, 138, 0)',
  },
  // 2: Sunset Peach-Orange (soft tangerine reef light)
  {
    bulb: '#fed7aa',
    glow: '#fb923c',
    coneTop: 'rgba(253, 186, 116, 0.24)',
    coneMid: 'rgba(249, 115, 22, 0.08)',
    haloInner: 'rgba(255, 237, 213, 0.52)',
    haloMid: 'rgba(251, 146, 60, 0.16)',
    sandPool: 'rgba(253, 186, 116, 0.25)',
    sandPoolZero: 'rgba(253, 186, 116, 0)',
  },
  // 3: Bioluminescent Mint-Emerald (kelp & reef green)
  {
    bulb: '#a7f3d0',
    glow: '#34d399',
    coneTop: 'rgba(110, 231, 183, 0.22)',
    coneMid: 'rgba(16, 185, 129, 0.07)',
    haloInner: 'rgba(209, 250, 229, 0.50)',
    haloMid: 'rgba(52, 211, 153, 0.16)',
    sandPool: 'rgba(110, 231, 183, 0.24)',
    sandPoolZero: 'rgba(110, 231, 183, 0)',
  },
  // 4: Ice Cyan (moonlit shallow water cyan)
  {
    bulb: '#bae6fd',
    glow: '#38bdf8',
    coneTop: 'rgba(125, 211, 252, 0.25)',
    coneMid: 'rgba(56, 189, 248, 0.08)',
    haloInner: 'rgba(224, 242, 254, 0.54)',
    haloMid: 'rgba(56, 189, 248, 0.16)',
    sandPool: 'rgba(125, 211, 252, 0.26)',
    sandPoolZero: 'rgba(125, 211, 252, 0)',
  },
  // 5: Deep Indigo-Sapphire (actinic marine blue)
  {
    bulb: '#c7d2fe',
    glow: '#818cf8',
    coneTop: 'rgba(165, 180, 252, 0.24)',
    coneMid: 'rgba(99, 102, 241, 0.08)',
    haloInner: 'rgba(224, 231, 255, 0.52)',
    haloMid: 'rgba(129, 140, 248, 0.17)',
    sandPool: 'rgba(165, 180, 252, 0.25)',
    sandPoolZero: 'rgba(165, 180, 252, 0)',
  },
  // 6: Amethyst Violet (nebula orchid-purple)
  {
    bulb: '#e9d5ff',
    glow: '#c084fc',
    coneTop: 'rgba(216, 180, 254, 0.23)',
    coneMid: 'rgba(168, 85, 247, 0.08)',
    haloInner: 'rgba(243, 232, 255, 0.50)',
    haloMid: 'rgba(192, 132, 252, 0.16)',
    sandPool: 'rgba(216, 180, 254, 0.24)',
    sandPoolZero: 'rgba(216, 180, 254, 0)',
  },
]

function lampSpecAt(lampColors: readonly number[] | undefined, idx: number): LampColorSpec {
  const defaultIdx = idx % 2 === 0 ? 1 : 4
  const raw = lampColors?.[idx] ?? defaultIdx
  return LAMP_PALETTE[((raw % LAMP_PALETTE.length) + LAMP_PALETTE.length) % LAMP_PALETTE.length]!
}

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

    this.distantReef(ctx, w, h, view.reducedMotion ? 0 : view.time, night)
    if (night) {
      this.lampLightCones(ctx, w, h, view.time, view.lampColors)
    }
    this.caustics(ctx, w, h, view.time, night)
    this.plankton(ctx, w, h, view.time, night)
    this.sandFloor(ctx, w, h, s, night, view.lampColors)

    const foreground = foregroundDecor(view)
    for (const d of view.decors) if (!foreground.has(d.item.id)) this.decorNode(ctx, d, h, view.time, s, night)
    if (view.foods) {
      for (const f of view.foods) this.foodPellet(ctx, f)
    }
    for (const a of view.agents) this.agent(ctx, a, view.time, !!view.reducedMotion)
    for (const d of view.decors) if (foreground.has(d.item.id)) this.decorNode(ctx, d, h, view.time, s, night)
    if (view.splashes) {
      for (const sp of view.splashes) this.splash(ctx, sp)
    }

    // Tank-wide electric flash when a Volt Electric Eel discharges
    const dischargingEel = view.agents.find((a) => (a.dischargingTimer ?? 0) > 0.35)
    if (dischargingEel) {
      const intensity = ((dischargingEel.dischargingTimer ?? 0) - 0.35) / 0.5
      ctx.save()
      ctx.fillStyle = `rgba(125, 211, 252, ${intensity * 0.22})`
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    this.bubbles(ctx, w, h, view.time)
    this.lampsFixture(ctx, w, night, view.lampColors)
    drawRailBeads(ctx, view)

    // Glass edge, so the tank reads as a container.
    ctx.strokeStyle = night ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.38)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, w - 2, h - 2)
  }

  /** Multi-layer distant reef silhouettes & ambient schooling minnows for depth. */
  private distantReef(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    night: boolean,
  ): void {
    ctx.save()

    // Far ridge silhouette
    ctx.fillStyle = night ? 'rgba(2, 12, 20, 0.42)' : 'rgba(6, 44, 64, 0.22)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w + 24; x += 24) {
      const ridge =
        Math.sin(x * 0.008 + 0.5) * (h * 0.14) +
        Math.cos(x * 0.021 - 1.1) * (h * 0.06)
      ctx.lineTo(x, h * 0.64 - ridge)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // Midground reef shelf & distant swaying sea fans
    ctx.fillStyle = night ? 'rgba(4, 18, 29, 0.56)' : 'rgba(8, 56, 80, 0.28)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w + 20; x += 20) {
      const shelf =
        Math.sin(x * 0.013 + 2.2) * (h * 0.1) +
        Math.sin(x * 0.032) * (h * 0.04)
      ctx.lineTo(x, h * 0.76 - shelf)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // Distant kelp / sea-fan silhouettes rooted on the midground shelf
    ctx.strokeStyle = night ? 'rgba(6, 26, 40, 0.65)' : 'rgba(10, 68, 92, 0.32)'
    ctx.lineCap = 'round'
    const anchors = [0.08, 0.23, 0.41, 0.62, 0.79, 0.93]
    for (const [idx, fx] of anchors.entries()) {
      const bx = w * fx
      const baseH = h * (0.22 + (idx % 3) * 0.07)
      const sway = Math.sin(t * 0.9 + idx * 1.3) * 10
      ctx.lineWidth = 5 + (idx % 2) * 2
      ctx.beginPath()
      ctx.moveTo(bx, h - 14)
      ctx.quadraticCurveTo(bx - sway * 0.4, h - baseH * 0.55, bx + sway, h - baseH)
      ctx.stroke()
    }

    this.backgroundSchools(ctx, w, h, t, night)

    ctx.restore()
  }

  /** Fast silver minnows travel in a wedge; round reef fish wander in a loose shoal. */
  private backgroundSchools(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, night: boolean): void {
    const cycleW = w + 240
    const leaderX = ((t * 28 + w * 0.25 + 120 + Math.sin(t * 1.4) * 6) % cycleW) - 120
    const leaderY = h * 0.29 + Math.sin(t * 0.42) * h * 0.025
    const heading = Math.atan2(Math.cos(t * 0.42) * h * 0.0105, 28 + Math.cos(t * 1.4) * 8.4)
    ctx.save()
    ctx.translate(leaderX, leaderY)
    ctx.rotate(heading)
    for (let i = 0; i < 7; i++) {
      const row = Math.ceil(i / 2)
      const side = i === 0 ? 0 : i % 2 === 0 ? 1 : -1
      ctx.save()
      ctx.translate(-row * 15 + Math.sin(t * 2.1 - i * 0.4), side * (3 + row * 2.8))
      ctx.rotate(Math.sin(t * 1.6 - i * 0.5) * 0.035)
      this.backgroundFish(ctx, false, Math.sin(t * 8 - i * 0.65), night)
      ctx.restore()
    }
    ctx.restore()

    // A bounded slow arc gives this school visible turns rather than another screen wrap.
    const turn = t * 0.12 + 0.35
    const shoalX = w * 0.64 + Math.sin(turn) * Math.min(w * 0.22, 140)
    const shoalY = h * 0.55 + Math.sin(t * 0.23 + 1) * Math.min(h * 0.04, 18)
    const offsets = [[-20, -5], [-7, -10], [10, -7], [24, 2], [7, 7], [-12, 8]]
    ctx.save()
    ctx.translate(shoalX, shoalY)
    for (const [i, offset] of offsets.entries()) {
      ctx.save()
      ctx.translate(offset[0]! + Math.sin(t * 0.5 + i) * 2, offset[1]! + Math.cos(t * 0.8 + i * 0.9) * 2)
      // Narrow to a profile as the fish turn, then face the return leg of their arc.
      ctx.scale(Math.cos(turn), 1)
      ctx.rotate(Math.sin(t * 0.65 + i) * 0.12)
      this.backgroundFish(ctx, true, Math.sin(t * 3.5 + i), night)
      ctx.restore()
    }
    ctx.restore()
  }

  private backgroundFish(ctx: CanvasRenderingContext2D, round: boolean, tailBeat: number, night: boolean): void {
    ctx.fillStyle = round
      ? night ? 'rgba(128, 192, 207, 0.24)' : 'rgba(185, 228, 231, 0.35)'
      : night ? 'rgba(169, 217, 235, 0.26)' : 'rgba(224, 246, 247, 0.38)'
    const tailX = round ? -7.5 : -9.5
    const tailY = tailBeat * (round ? 0.65 : 0.9)
    ctx.beginPath()
    ctx.moveTo(round ? -3.8 : -5.5, 0)
    ctx.lineTo(tailX, -2.5 + tailY)
    ctx.lineTo(tailX + 1.5, tailY * 0.4)
    ctx.lineTo(tailX, 2.5 + tailY)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    if (round) {
      ctx.ellipse(0, 0, 4.6, 3.1, 0, 0, Math.PI * 2)
    } else {
      ctx.moveTo(6, 0)
      ctx.bezierCurveTo(2.5, -2.4, -2, -2.2, -6, 0)
      ctx.bezierCurveTo(-2, 2.2, 2.5, 2.4, 6, 0)
    }
    ctx.fill()
    // Small dorsal fins and an eye point make the silhouettes readable at aquarium scale.
    ctx.beginPath()
    ctx.moveTo(-2, round ? -2.2 : -1.4)
    ctx.quadraticCurveTo(-0.5, round ? -5.3 : -3.2, 2, round ? -2.3 : -1.5)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = night ? 'rgba(210, 240, 247, 0.22)' : 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    if (round) {
      ctx.moveTo(1.2, -1.8)
      ctx.quadraticCurveTo(0.2, 0, 1.2, 1.8)
    } else {
      ctx.moveTo(-3, -0.3)
      ctx.lineTo(3, -0.3)
    }
    ctx.stroke()
    ctx.fillStyle = night ? 'rgba(5, 28, 43, 0.6)' : 'rgba(20, 72, 87, 0.55)'
    ctx.beginPath()
    ctx.arc(round ? 2.6 : 4, -0.55, 0.45, 0, Math.PI * 2)
    ctx.fill()
  }

  /** Floating luminous plankton / water motes drifting through the water column. */
  private plankton(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    night: boolean,
  ): void {
    ctx.save()
    const count = 26
    for (let i = 0; i < count; i++) {
      const seed = hashString(`plankton-${i}`)
      const px = ((seed % 1000) / 1000) * w + Math.sin(t * 0.45 + i) * 14
      const py = (((seed >> 10) % 1000) / 1000) * (h - 32) + 12 + Math.cos(t * 0.35 + i * 0.7) * 8
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.9))
      const r = 0.9 + (seed % 3) * 0.45
      ctx.globalAlpha = (night ? 0.42 : 0.24) * pulse
      ctx.fillStyle = night && i % 3 === 0 ? '#fde047' : '#bae6fd'
      ctx.beginPath()
      ctx.arc((px + w) % w, py, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Volumetric decorative light cones cast into the water when night mode is active. */
  private lampLightCones(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    lampColors?: readonly number[],
  ): void {
    const lamps = lampPositions(w)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (const [idx, lx] of lamps.entries()) {
      const sway = Math.sin(t * 0.7 + idx * 1.4) * 14
      const topHalf = 14
      const botHalf = Math.max(75, w * 0.18)
      const spec = lampSpecAt(lampColors, idx)

      const cone = ctx.createLinearGradient(lx, 8, lx + sway, h - 10)
      cone.addColorStop(0, spec.coneTop)
      cone.addColorStop(0.55, spec.coneMid)
      cone.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = cone
      ctx.beginPath()
      ctx.moveTo(lx - topHalf, 8)
      ctx.lineTo(lx + topHalf, 8)
      ctx.lineTo(lx + botHalf + sway, h)
      ctx.lineTo(lx - botHalf + sway, h)
      ctx.closePath()
      ctx.fill()

      // Soft halo right under the bulb
      const halo = ctx.createRadialGradient(lx, 12, 2, lx, 16, 46)
      halo.addColorStop(0, spec.haloInner)
      halo.addColorStop(0.5, spec.haloMid)
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(lx, 12, 46, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Top aquarium decorative light bar & pendant bulbs (present in day & night, lit at night). */
  private lampsFixture(
    ctx: CanvasRenderingContext2D,
    w: number,
    night: boolean,
    lampColors?: readonly number[],
  ): void {
    const lamps = lampPositions(w)
    ctx.save()

    // A slim, rounded rail keeps the hardware close to the glass edge.
    const rail = ctx.createLinearGradient(0, 2, 0, 5)
    rail.addColorStop(0, night ? '#345568' : '#6a96a5')
    rail.addColorStop(0.45, night ? '#203d50' : '#477488')
    rail.addColorStop(1, night ? '#142e40' : '#315b70')
    ctx.fillStyle = rail
    ctx.beginPath()
    ctx.roundRect(12, 2, w - 24, 3, 1.5)
    ctx.fill()

    for (const [idx, lx] of lamps.entries()) {
      // Shallow curved hoods tuck into the rail without hanging farther into the water.
      const hood = ctx.createLinearGradient(0, 3, 0, 10)
      hood.addColorStop(0, night ? '#3b5f73' : '#759ba9')
      hood.addColorStop(0.4, night ? '#29495e' : '#517d90')
      hood.addColorStop(1, night ? '#18354a' : '#315a70')
      ctx.fillStyle = hood
      ctx.beginPath()
      ctx.moveTo(lx - 14.5, 3.7)
      ctx.quadraticCurveTo(lx, 2.7, lx + 14.5, 3.7)
      ctx.quadraticCurveTo(lx + 17, 3.9, lx + 15.3, 5.8)
      ctx.lineTo(lx + 12, 9.1)
      ctx.quadraticCurveTo(lx + 11, 10, lx + 9.5, 10)
      ctx.lineTo(lx - 9.5, 10)
      ctx.quadraticCurveTo(lx - 11, 10, lx - 12, 9.1)
      ctx.lineTo(lx - 15.3, 5.8)
      ctx.quadraticCurveTo(lx - 17, 3.9, lx - 14.5, 3.7)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = night ? 'rgba(163, 205, 222, 0.2)' : 'rgba(225, 245, 249, 0.4)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(lx - 12, 4.1)
      ctx.quadraticCurveTo(lx, 3.4, lx + 12, 4.1)
      ctx.stroke()

      // Recessed frosted diffuser, with the existing lamp colors shining through at night.
      ctx.fillStyle = night ? '#102b3e' : '#31566a'
      ctx.beginPath()
      ctx.roundRect(lx - 11, 7.4, 22, 3.6, 1.8)
      ctx.fill()
      if (night) {
        const spec = lampSpecAt(lampColors, idx)
        ctx.save()
        ctx.shadowColor = spec.glow
        ctx.shadowBlur = 8
        ctx.fillStyle = spec.bulb
        ctx.beginPath()
        ctx.roundRect(lx - 9, 8, 18, 3.5, 1.75)
        ctx.fill()
        ctx.restore()
      } else {
        const diffuser = ctx.createLinearGradient(0, 8, 0, 10.5)
        diffuser.addColorStop(0, '#d5e9ec')
        diffuser.addColorStop(1, '#94becb')
        ctx.fillStyle = diffuser
        ctx.beginPath()
        ctx.roundRect(lx - 9, 8, 18, 2.5, 1.25)
        ctx.fill()
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
    lampColors?: readonly number[],
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
      for (const [idx, lx] of lampPositions(w).entries()) {
        const spec = lampSpecAt(lampColors, idx)
        const pool = ctx.createRadialGradient(lx, h - 10, 4, lx, h - 10, 68)
        pool.addColorStop(0, spec.sandPool)
        pool.addColorStop(1, spec.sandPoolZero)
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
    if (f.kind === 'plankton') {
      ctx.translate(f.x, f.y)
      ctx.strokeStyle = '#90d9b5'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(-3, 1); ctx.quadraticCurveTo(-9, -2, -8, -5); ctx.moveTo(2, 2); ctx.quadraticCurveTo(7, 5, 8, 2); ctx.stroke()
      ctx.fillStyle = '#72cba4'; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.6, -0.4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#e0f6bd'; ctx.beginPath(); ctx.arc(1, -0.8, 1.3, 0, Math.PI * 2); ctx.fill()
      ctx.restore(); return
    }
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

  private agent(ctx: CanvasRenderingContext2D, a: Agent, t: number, reducedMotion = false): void {
    const len = a.species.body.length * 4.2 * a.scale
    const shocked = (a.shockedTimer ?? 0) > 0
    const discharging = (a.dischargingTimer ?? 0) > 0
    const jitterX = shocked || discharging ? Math.sin(t * 68 + a.phase) * 2.4 : 0
    const bobY = a.dropping || shocked || a.withdrawal ? 0 : Math.sin(t * 2 + a.phase) * 2.5

    ctx.save()
    ctx.globalAlpha *= withdrawalOpacity(a.withdrawal)
    ctx.translate(a.x + jitterX, a.y + bobY)
    const retreatScale = withdrawalScale(a.withdrawal)
    const puff = pufferAmount(a, reducedMotion)
    ctx.scale(a.dir * retreatScale * (1 + puff * 0.1), retreatScale * (1 + puff * 0.28))
    if (a.tilt) ctx.rotate(a.tilt)
    ctx.translate(-len / 2, 0)
    this.body(ctx, a.species.body, len, a.fish.grade, a.fish.tier, a.fish.speciesId, a.withdrawal?.reducedMotion ? 0 : t + a.phase)
    if (discharging || shocked) {
      this.electricArcs(ctx, len, len * a.species.body.depth, t + a.phase, discharging)
    }
    ctx.restore()
  }

  private electricArcs(
    ctx: CanvasRenderingContext2D,
    len: number,
    height: number,
    t: number,
    intense: boolean,
  ): void {
    ctx.save()
    if (intense) {
      const halo = ctx.createRadialGradient(len * 0.5, 0, 4, len * 0.5, 0, len * 0.75)
      halo.addColorStop(0, 'rgba(254, 240, 138, 0.55)')
      halo.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)')
      halo.addColorStop(1, 'rgba(56, 189, 248, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(len * 0.5, 0, len * 0.75, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.strokeStyle = intense ? '#fef08a' : '#7dd3fc'
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = intense ? 10 : 6
    ctx.lineWidth = intense ? 2.2 : 1.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const bolts = intense ? 5 : 3
    for (let i = 0; i < bolts; i++) {
      const seed = Math.floor(t * 18) + i * 7
      const bx = len * (0.15 + ((seed * 29) % 70) / 100)
      const by = (((seed * 43) % 100) / 100 - 0.5) * height * 1.15
      const reach = (intense ? 16 : 10) * (i % 2 === 0 ? 1 : -1)
      ctx.beginPath()
      ctx.moveTo(bx - 7, by - 4)
      ctx.lineTo(bx + 2, by - reach * 0.55)
      ctx.lineTo(bx - 2, by + 2)
      ctx.lineTo(bx + 8, by + reach * 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  fishFrame(ctx: CanvasRenderingContext2D, length: number, req: PortraitRequest, phase: number): void {
    this.body(ctx, req.species.body, length, req.grade, req.tier, req.species.id, phase)
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
    if (bodyShape.silhouette === 'glass-angel') ctx.globalAlpha *= 0.72
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
    this.bodyMarkings(ctx, bodyShape, len, animPhase)
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

  /** Landmarks stay legible at card size, beyond a fish's base hue. Already clipped to its outline. */
  private bodyMarkings(ctx: CanvasRenderingContext2D, body: import('../core/types').BodyShape, len: number, phase: number): void {
    const h = len * body.depth
    const sil = body.silhouette
    ctx.save()
    const secret = secretMarkings(body, len, phase)
    if (secret) {
      ctx.fillStyle = sil === 'star-nautilus' ? '#352950' : sil === 'glass-angel' ? '#ff9975' : '#b9fff0'
      ctx.fill(secret)
    } else if (sil === 'wrasse') {
      ctx.fillStyle = '#142e50'
      ctx.fillRect(len * 0.16, -h * 0.065, len * 0.81, h * 0.14)
      ctx.fillStyle = '#b6f4ff'
      ctx.fillRect(len * 0.28, -h * 0.12, len * 0.63, h * 0.045)
    } else if (sil === 'tetra') {
      ctx.fillStyle = '#ed5268'
      ctx.fillRect(len * 0.2, 0, len * 0.37, h * 0.22)
      ctx.fillStyle = '#a6fff5'
      ctx.fillRect(len * 0.27, -h * 0.075, len * 0.62, h * 0.075)
    } else if (body.form === 'eel') {
      const profile = elongatedProfile(body, len, phase)
      ctx.strokeStyle = sil === 'ribbon-eel' ? '#fff1a0' : sil === 'amber-eel' ? '#fff2b0' : '#d0fcff'
      ctx.lineWidth = Math.max(0.8, len * 0.012)
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 3; i <= 32; i++) {
        const u = i / 36
        const x = len * (0.04 + u * 0.88)
        const y = profile.center(u) + profile.radius(u) * (sil === 'ribbon-eel' ? -1.25 : 0.35)
        if (i === 3) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      if (sil !== 'ribbon-eel') {
        ctx.fillStyle = '#e7ffff'
        for (const u of [0.35, 0.52, 0.69]) {
          ctx.beginPath()
          ctx.arc(len * (0.04 + u * 0.88), profile.center(u), len * 0.012, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (sil === 'sea-turtle') {
      ctx.strokeStyle = 'rgba(16,75,55,0.65)'
      ctx.lineWidth = Math.max(0.8, len * 0.014)
      const cx = len * 0.46, cy = -h * 0.03
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3
        const x = cx + Math.cos(angle) * len * 0.15
        const y = cy + Math.sin(angle) * h * 0.18
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * len * 0.15, cy + Math.sin(angle) * h * 0.18)
        ctx.lineTo(cx + Math.cos(angle) * len * 0.3, cy + Math.sin(angle) * h * 0.32)
        ctx.stroke()
      }
    } else if (sil === 'veil-koi') {
      ctx.fillStyle = 'rgba(255,250,230,0.8)'
      ctx.beginPath()
      ctx.ellipse(len * 0.53, -h * 0.12, len * 0.1, h * 0.16, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(len * 0.75, h * 0.16, len * 0.11, h * 0.15, 0.4, 0, Math.PI * 2)
      ctx.fill()
    } else if (body.form === 'seahorse') {
      ctx.strokeStyle = 'rgba(255,245,216,0.5)'
      ctx.lineWidth = Math.max(0.7, len * 0.012)
      for (let i = 0; i < 4; i++) {
        const y = h * (-0.06 + i * 0.06)
        ctx.beginPath()
        ctx.moveTo(len * 0.48, y)
        ctx.lineTo(len * 0.65, y + h * 0.015)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

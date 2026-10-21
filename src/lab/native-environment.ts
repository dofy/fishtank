import { Container, FillGradient, Graphics, GraphicsContext, Sprite, Texture } from 'pixi.js'
import { railBeadBrightness, syncRailLightConfig } from '../core/lighting'
import type { DecorItem } from '../core/types'
import type { DecorNode, SceneView } from '../render/scene'
import { decorLayers, hashString } from '../render/shape'
import { lampPositions, sceneColorsFor, spriteFor, type ThemeManifest } from '../render/theme'
import { NativeLcd } from './native-lcd'
import { VectorPath } from './vector-path'
import { foregroundDecor } from '../render/ecology'

const LAMP_COLORS = ['#fb7185', '#facc15', '#fb923c', '#34d399', '#38bdf8', '#818cf8', '#c084fc']
const BULB_COLORS = ['#fecdd3', '#fef08a', '#fed7aa', '#a7f3d0', '#bae6fd', '#c7d2fe', '#e9d5ff']
const BEAD_COLORS = ['#fb7185', '#fbbf24', '#d9f99d', '#6ee7b7', '#67e8f9', '#93c5fd', '#c4b5fd']
const PERIODS: Record<string, number> = { kelp: Math.PI * 2 / 1.5, shell: 9, fairylights: Math.PI * 2 / 3.2, starlamps: Math.PI * 2 / 1.4, lanterns: Math.PI * 2 / 1.3, jellylamps: Math.PI * 2 / 1.2, anemone: Math.PI * 2 / 1.4 }
interface Decoration {
  root: Container
  art: Graphics
  highlight: Graphics
  halo: Graphics
  frames: Map<number, GraphicsContext>
  gradient: FillGradient | null
  override: Sprite | null
  overrideImage: HTMLImageElement | null
}

/** Native scene graph. No full-tank canvas, image readbacks or per-frame environment uploads. */
export class NativeEnvironment {
  readonly back = new Container()
  readonly decors = new Container()
  readonly foreground = new Container()
  readonly interactions = new Graphics()
  readonly front = new Container()
  /** Editor feedback is drawn above the aquarium, outside water refraction. */
  readonly highlights = new Container({ label: 'decor-highlights' })
  private key = ''
  private readonly contexts = new Set<GraphicsContext>()
  private readonly gradients = new Set<FillGradient>()
  private readonly gradientCache = new Map<string, FillGradient>()
  private readonly decorations = new Map<string, Decoration>()
  private readonly foods = new Map<number, Graphics>()
  private readonly foodLayer = new Container()
  private readonly bubbles: Graphics[] = []
  private readonly plankton: Graphics[] = []
  private readonly schools: Graphics[][] = [[], []]
  private readonly kelps: Graphics[] = []
  private readonly beams: Graphics[] = []
  private readonly bulbs: Graphics[] = []
  private readonly pools: Graphics[] = []
  private readonly beads: { index: number; graphic: Graphics }[] = []
  private readonly waves: Graphics[] = []
  private panel: NativeLcd | null = null
  private flash: Graphics | null = null

  update(view: SceneView, manifest: ThemeManifest): void {
    const key = `${manifest.id}:${view.night}:${view.width}:${view.height}:${manifest.cell}`
    if (key !== this.key) { this.clear(); this.key = key; this.build(view, manifest) }
    const t = view.reducedMotion ? 0 : view.time
    this.panel?.update(view)
    const { width: w, height: h } = view
    for (const [i, kelp] of this.kelps.entries()) kelp.skew.x = Math.sin(t * 0.9 + i * 1.3) * 0.04
    for (const [i, wave] of this.waves.entries()) { wave.x = Math.sin(t * 0.6 + i) * 16; wave.y = Math.cos(t * 0.45 + i) * 2 }
    const turn = t * 0.12 + 0.35
    for (const [school, fish] of this.schools.entries()) {
      for (const [i, graphic] of fish.entries()) {
        if (school === 0) {
          const row = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 === 0 ? 1 : -1
          graphic.position.set(((t * 28 + w * 0.25 + 120 + Math.sin(t * 1.4) * 6) % (w + 240)) - 120 - row * 15 + Math.sin(t * 2.1 - i * 0.4), h * 0.29 + Math.sin(t * 0.42) * h * 0.025 + side * (3 + row * 2.8))
          graphic.rotation = Math.sin(t * 1.6 - i * 0.5) * 0.035
          graphic.scale.y = 1 + Math.sin(t * 8 - i * 0.65) * 0.06
        } else {
          const offsets = [[-20, -5], [-7, -10], [10, -7], [24, 2], [7, 7], [-12, 8]]
          graphic.position.set(w * 0.64 + Math.sin(turn) * Math.min(w * 0.22, 140) + offsets[i]![0]! + Math.sin(t * 0.5 + i) * 2, h * 0.55 + Math.sin(t * 0.23 + 1) * Math.min(h * 0.04, 18) + offsets[i]![1]! + Math.cos(t * 0.8 + i * 0.9) * 2)
          graphic.scale.x = Math.cos(turn)
          graphic.rotation = Math.sin(t * 0.65 + i) * 0.12
        }
      }
    }
    for (const [i, bubble] of this.bubbles.entries()) {
      const seed = hashString(`bubble${i}`)
      bubble.position.set(seed % w + Math.sin(t + i) * 4, h - ((t * 18 + seed % 400) % (h + 40)))
    }
    for (const [i, point] of this.plankton.entries()) {
      const seed = hashString(`plankton-${i}`)
      point.position.set((((seed % 1000) / 1000) * w + Math.sin(t * 0.45 + i) * 14 + w) % w, (((seed >> 10) % 1000) / 1000) * (h - 32) + 12 + Math.cos(t * 0.35 + i * 0.7) * 8)
      point.alpha = (view.night ? 0.42 : 0.24) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.9)))
    }
    for (const [i, beam] of this.beams.entries()) {
      const colorIndex = view.lampColors?.[i] ?? (i % 2 ? 4 : 1)
      beam.tint = LAMP_COLORS[colorIndex]!
      beam.skew.x = Math.sin(t * 0.7 + i * 1.4) * 0.025
      this.pools[i]!.tint = beam.tint
      this.bulbs[i]!.tint = BULB_COLORS[colorIndex]!
    }
    for (const bead of this.beads) bead.graphic.alpha = railBeadBrightness(view.time, bead.index, view.railLights ?? syncRailLightConfig(), view.reducedMotion)
    this.updateDecor(view, manifest, t)
    this.updateInteractions(view, manifest)
    if (this.flash) this.flash.alpha = Math.max(0, ...view.agents.map(a => Math.max(0, (a.dischargingTimer ?? 0) - 0.35) / 0.5)) * 0.22
  }

  private graphic(parent: Container, context?: GraphicsContext): Graphics {
    const g = context ? new Graphics(context) : new Graphics()
    this.contexts.add(g.context)
    parent.addChild(g)
    return g
  }
  private gradient(top: string, bottom: string, radial = false): FillGradient {
    const key = `${top}:${bottom}:${radial}`
    const cached = this.gradientCache.get(key)
    if (cached) return cached
    const gradient = new FillGradient(radial
      ? { type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerRadius: 0.5, colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], textureSize: 64 }
      : { start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], textureSize: 64 })
    this.gradients.add(gradient)
    this.gradientCache.set(key, gradient)
    return gradient
  }

  private build(view: SceneView, manifest: ThemeManifest): void {
    const { width: w, height: h } = view
    const night = !!view.night, lcd = manifest.renderer === 'lcd', c = Math.max(2, manifest.cell ?? 4)
    const s = sceneColorsFor(manifest, night)
    if (lcd) {
      this.panel = new NativeLcd(w, h, c, s, night)
      this.back.addChild(this.panel.mesh)
    } else {
      this.graphic(this.back).rect(0, 0, w, h).fill(this.gradient(s.waterTop, s.waterBottom))
      for (let layer = 0; layer < 2; layer++) {
        const reef = this.graphic(this.back).moveTo(0, h)
        const step = layer ? 20 : 24
        for (let x = 0; x <= w + step; x += step) {
          const ridge = layer ? Math.sin(x * 0.013 + 2.2) * h * 0.1 + Math.sin(x * 0.032) * h * 0.04 : Math.sin(x * 0.008 + 0.5) * h * 0.14 + Math.cos(x * 0.021 - 1.1) * h * 0.06
          reef.lineTo(x, h * (layer ? 0.76 : 0.64) - ridge)
        }
        reef.lineTo(w, h).closePath().fill({ color: layer ? '#04304a' : '#021c2c', alpha: night ? 0.5 : 0.3 })
      }
      for (const [i, anchor] of [0.08, 0.23, 0.41, 0.62, 0.79, 0.93].entries()) {
        const tall = h * (0.22 + i % 3 * 0.07)
        const g = this.graphic(this.back).moveTo(0, 0).quadraticCurveTo(0, -tall * 0.55, 0, -tall).stroke({ color: night ? '#061a28' : '#0a445c', width: 5 + i % 2 * 2, alpha: 0.5, cap: 'round' })
        g.position.set(w * anchor, h - 14)
        this.kelps.push(g)
      }
      this.buildSchools(night)
      if (night) {
        const fade = this.gradient('#ffffff40', '#ffffff00')
        const halo = this.gradient('#ffffff88', '#ffffff00', true)
        for (const lx of lampPositions(w)) {
          const half = Math.max(75, w * 0.18)
          const beam = this.graphic(this.back).poly([-14, 8, 14, 8, half, h, -half, h]).fill(fade)
          beam.position.x = lx
          beam.blendMode = 'add'
          this.beams.push(beam)
          const glow = this.graphic(this.back).circle(lx, 16, 46).fill(halo)
          glow.alpha = 0.55
        }
      }
      for (let i = 0; i < 7; i++) {
        const wave = this.graphic(this.back)
        for (let x = -30; x <= w + 30; x += 12) {
          const y = h / 8 * (i + 0.5) + Math.sin(x * 0.02 + i) * 6
          if (x === -30) wave.moveTo(x, y); else wave.lineTo(x, y)
        }
        wave.stroke({ color: night ? '#7dd3fc' : '#ffffff', width: 2, alpha: night ? 0.08 : 0.15 })
        this.waves.push(wave)
      }
      for (let i = 0; i < 26; i++) this.plankton.push(this.graphic(this.back).circle(0, 0, 0.9 + hashString(`plankton-${i}`) % 3 * 0.45).fill(night && i % 3 === 0 ? '#fde047' : '#bae6fd'))
      const sand = this.graphic(this.back).moveTo(0, h).lineTo(0, h - 18)
      for (let x = 0; x <= w; x += 24) sand.lineTo(x, h - 18 - Math.sin(x * 0.05) * 4)
      sand.lineTo(w, h - 18 - Math.sin(w * 0.05) * 4).lineTo(w, h).closePath().fill(s.sand)
      if (night) for (const lx of lampPositions(w)) this.pools.push(this.graphic(this.back).ellipse(lx, h - 9, 70, 12).fill(this.gradient('#ffffff44', '#ffffff00', true)))
    }
    this.decors.addChild(this.foodLayer)
    if (!lcd) {
      for (let i = 0; i < 14; i++) this.bubbles.push(this.graphic(this.front).circle(0, 0, 1.5 + hashString(`bubble${i}`) % 3).fill({ color: '#ffffff', alpha: 0.35 }))
      this.flash = this.graphic(this.front).rect(0, 0, w, h).fill('#7dd3fc')
      this.flash.alpha = 0
    }
    this.buildFixture(view, manifest)
    const border = this.graphic(this.front)
    if (lcd) {
      for (let x = 0; x < w; x += c) border.rect(x, 0, c - 1, c - 1).rect(x, h - c, c - 1, c - 1)
      for (let y = 0; y < h; y += c) border.rect(0, y, c - 1, c - 1).rect(w - c, y, c - 1, c - 1)
      border.fill(s.ink)
    } else border.rect(1, 1, w - 2, h - 2).stroke({ color: '#ffffff', alpha: night ? 0.18 : 0.38, width: 2 })
  }

  private buildSchools(night: boolean): void {
    for (let school = 0; school < 2; school++) {
      const context = new GraphicsContext()
      const round = !!school, color = round ? '#80c0cf' : '#a9d9eb'
      context.poly([-4, 0, round ? -7.5 : -9.5, -2.5, -7, 0, round ? -7.5 : -9.5, 2.5]).fill({ color, alpha: night ? 0.26 : 0.38 })
      if (round) context.ellipse(0, 0, 4.6, 3.1)
      else context.moveTo(6, 0).bezierCurveTo(2.5, -2.4, -2, -2.2, -6, 0).bezierCurveTo(-2, 2.2, 2.5, 2.4, 6, 0).closePath()
      context.fill({ color, alpha: night ? 0.26 : 0.38 }).moveTo(-2, -2).quadraticCurveTo(-0.5, -4, 2, -2).closePath().fill({ color, alpha: 0.3 }).circle(round ? 2.6 : 4, -0.55, 0.45).fill('#143a4a')
      for (let i = 0; i < (round ? 6 : 7); i++) this.schools[school]!.push(this.graphic(this.back, context))
    }
  }

  private buildFixture(view: SceneView, manifest: ThemeManifest): void {
    const { width: w } = view, night = !!view.night, lcd = manifest.renderer === 'lcd', c = Math.max(2, manifest.cell ?? 4)
    const s = sceneColorsFor(manifest, night)
    const lamps = lampPositions(w)
    const fixture = this.graphic(this.front)
    if (!lcd) fixture.roundRect(12, 2, w - 24, 3, 1.5).fill(this.gradient(night ? '#345568' : '#6a96a5', night ? '#142e40' : '#315b70'))
    for (const lx of lamps) {
      if (lcd) {
        const x = Math.round(lx / c) * c
        for (let dx = -c * 3; dx <= c * 3; dx += c) fixture.rect(x + dx, c, c - 1, c - 1)
        if (night) for (let dx = -c * 2; dx <= c * 2; dx += c) fixture.rect(x + dx, c * 2, c - 1, c - 1)
      } else {
        fixture.moveTo(lx - 14.5, 3.7).quadraticCurveTo(lx, 2.7, lx + 14.5, 3.7).quadraticCurveTo(lx + 17, 3.9, lx + 15.3, 5.8).lineTo(lx + 12, 9.1).quadraticCurveTo(lx + 11, 10, lx + 9.5, 10).lineTo(lx - 9.5, 10).quadraticCurveTo(lx - 11, 10, lx - 12, 9.1).lineTo(lx - 15.3, 5.8).quadraticCurveTo(lx - 17, 3.9, lx - 14.5, 3.7).closePath().fill(this.gradient(night ? '#3b5f73' : '#759ba9', night ? '#18354a' : '#315a70'))
        const bulb = this.graphic(this.front).roundRect(lx - 9, 8, 18, night ? 3.5 : 2.5, 1.25).fill(night ? '#ffffff' : '#b5d5df')
        if (night) this.bulbs.push(bulb)
      }
    }
    if (lcd) fixture.fill(s.ink)
    if (night) {
      const count = Math.max(4, Math.min(22, Math.floor((w - 32) / 42)))
      for (let i = 0; i < count; i++) {
        const x = 17 + i * (w - 34) / (count - 1)
        if (lamps.some(lx => Math.abs(lx - x) < Math.max(19, lcd ? c * 4 : 0))) continue
        const bead = this.graphic(this.front)
        if (lcd) bead.rect(Math.round(x / c) * c, c, c, c).fill(s.ink)
        else bead.circle(x, 3.5, 1.35).fill(BEAD_COLORS[i % BEAD_COLORS.length]!)
        this.beads.push({ index: i, graphic: bead })
      }
    }
  }

  private updateDecor(view: SceneView, manifest: ThemeManifest, time: number): void {
    const live = new Set(view.decors.map(d => d.item.id))
    const foreground = foregroundDecor(view)
    for (const [id, decor] of this.decorations) if (!live.has(id)) { this.destroyDecor(decor); this.decorations.delete(id) }
    const lcd = manifest.renderer === 'lcd', c = Math.max(2, manifest.cell ?? 4), night = !!view.night
    let normalIndex = 0, foregroundIndex = 0
    for (const node of view.decors) {
      let decor = this.decorations.get(node.item.id)
      if (!decor) { decor = this.makeDecor(node, manifest, night); this.decorations.set(node.item.id, decor) }
      const parent = foreground.has(node.item.id) ? this.foreground : this.decors
      const index = parent === this.foreground ? foregroundIndex++ : normalIndex++
      if (decor.root.parent !== parent) parent.addChildAt(decor.root, index)
      else if (parent.getChildIndex(decor.root) !== index) parent.setChildIndex(decor.root, index)
      const { item } = node
      const top = item.mount === 'top'
      decor.root.position.set(lcd ? Math.round(node.x / c) * c : node.x, lcd ? top ? Math.round((c * 2 + item.height) / c) * c : Math.round((view.height - c * 4) / c) * c : top ? 4 + item.height : view.height - 14)
      decor.art.scale.x = node.flip
      decor.highlight.position.copyFrom(decor.root.position)
      decor.highlight.visible = node.active
      const period = PERIODS[item.id] ?? 0
      const steps = lcd ? 12 : 32
      const frame = period && !view.reducedMotion ? Math.floor((time % period) / period * steps) : 0
      let context = decor.frames.get(frame)
      if (!context) {
        context = this.decorContext(item, manifest, night, period ? frame / steps * period : 0, decor.gradient)
        decor.frames.set(frame, context)
        this.contexts.add(context)
      }
      decor.art.context = context
      const image = spriteFor(manifest, `decor-${item.id}`)
      if (image && decor.overrideImage !== image) {
        decor.override?.destroy({ texture: true, textureSource: true })
        decor.override = new Sprite(Texture.from(image, true))
        decor.override.anchor.set(0.5, 1)
        decor.override.width = item.width
        decor.override.height = item.height
        decor.override.texture.source.scaleMode = lcd ? 'nearest' : 'linear'
        decor.root.addChild(decor.override)
        decor.overrideImage = image
      }
      decor.art.visible = !image
      if (decor.override) decor.override.scale.x = Math.abs(decor.override.scale.x) * node.flip
    }
    // Match Canvas: ordinary decorations, then food, then passing fish and arch frames.
    if (this.foodLayer.parent === this.decors) this.decors.setChildIndex(this.foodLayer, this.decors.children.length - 1)
  }

  private makeDecor(node: DecorNode, manifest: ThemeManifest, night: boolean): Decoration {
    const root = new Container(), item = node.item
    this.decors.addChild(root)
    const halo = this.graphic(root)
    if (night && item.mount === 'top' && manifest.renderer !== 'lcd') halo.circle(0, -item.height * 0.35, Math.max(item.width * 0.65, 58)).fill(this.gradient(`hsla(${item.hue},95%,72%,0.35)`, '#ffffff00', true))
    const art = this.graphic(root)
    const highlight = this.graphic(this.highlights).rect(-item.width / 2 - 4, -item.height - 4, item.width + 8, item.height + 6).stroke({ color: sceneColorsFor(manifest, night).accent, width: 1.5 })
    const gradient = manifest.renderer === 'lcd' ? null : this.gradient(`hsl(${item.hue},${item.sat * 100}%,${Math.min(82, item.light * 115)}%)`, `hsl(${item.hue},${item.sat * 100}%,${Math.max(18, item.light * 75)}%)`)
    return { root, art, highlight, halo, frames: new Map(), gradient, override: null, overrideImage: null }
  }

  private decorContext(item: DecorItem, manifest: ThemeManifest, night: boolean, time: number, gradient: FillGradient | null): GraphicsContext {
    const context = new GraphicsContext()
    const layers = decorLayers(item.id, item.width, item.height, time, () => new VectorPath())
    if (manifest.renderer === 'lcd') {
      const c = Math.max(2, manifest.cell ?? 4), s = sceneColorsFor(manifest, night)
      const [secondary, primary, detail] = layers.map(layer => layer.path)
      for (let y = -Math.ceil(item.height / c) * c - c; y <= 0; y += c) {
        for (let x = -Math.ceil(item.width / 2 / c) * c - c; x <= Math.ceil(item.width / 2 / c) * c + c; x += c) {
          const checker = ((x / c | 0) + (y / c | 0)) % 2 === 0
          const color = detail!.contains(x + c / 2, y + c / 2) ? checker ? s.waterTop : s.ink : primary!.contains(x + c / 2, y + c / 2) ? s.ink : secondary!.contains(x + c / 2, y + c / 2) && checker ? s.accent : null
          if (color) context.rect(x, y, c - 1, c - 1).fill(color)
        }
      }
    } else {
      for (const layer of layers) {
        const detail = item.mount === 'top' ? night ? `hsl(${item.hue},100%,84%)` : `hsla(${item.hue},55%,78%,0.55)` : `hsl(${(item.hue + 38) % 360},90%,${night ? 78 : 72}%)`
        const color = layer.role === 'primary' ? gradient! : layer.role === 'secondary' ? `hsl(${item.hue},${Math.max(10, item.sat * 75)}%,${Math.max(14, item.light * 65)}%)` : detail
        context.path(layer.path.path).fill(color)
      }
    }
    return context
  }

  private updateInteractions(view: SceneView, manifest: ThemeManifest): void {
    const lcd = manifest.renderer === 'lcd', c = Math.max(2, manifest.cell ?? 4), s = sceneColorsFor(manifest, !!view.night)
    const live = new Set(view.foods?.map(f => f.id))
    for (const [id, g] of this.foods) if (!live.has(id)) { this.contexts.delete(g.context); g.destroy({ context: true }); this.foods.delete(id) }
    for (const pellet of view.foods ?? []) {
      let g = this.foods.get(pellet.id)
      if (!g) {
        g = this.graphic(this.foodLayer)
        if (lcd) {
          g.rect(0, 0, c - 1, c - 1)
          if (pellet.kind === 'plankton') g.rect(-c, -c, c - 1, c - 1).rect(c, c, c - 1, c - 1)
          g.fill(s.ink)
        } else if (pellet.kind === 'plankton') {
          g.moveTo(-3, 1).quadraticCurveTo(-9, -2, -8, -5).moveTo(2, 2).quadraticCurveTo(7, 5, 8, 2).stroke({color:'#90d9b5',width:1.2})
          g.ellipse(0, 0, 4.5, 2.6).fill('#72cba4').circle(1, -0.8, 1.3).fill('#e0f6bd')
        } else g.circle(0, 0, 3.8).fill('#f59e0b').circle(-1, -1, 1.5).fill('#fef08a')
        this.foods.set(pellet.id, g)
      }
      g.position.set(lcd ? Math.round(pellet.x / c) * c : pellet.x, lcd ? Math.round(pellet.y / c) * c : pellet.y)
    }
    this.interactions.clear()
    for (const splash of view.splashes ?? []) {
      const p = Math.min(1, splash.age / splash.duration)
      if (lcd) {
        const span = Math.round((8 + p * 26) / c) * c, x = Math.round(splash.x / c) * c, y = Math.round(splash.y / c) * c
        this.interactions.rect(x - span, y, c - 1, c - 1).rect(x + span, y, c - 1, c - 1).fill(s.ink)
      } else {
        this.interactions.ellipse(splash.x, splash.y + 4, 8 + p * 34, 3 + p * 7).stroke({ color: '#ffffff', width: 2, alpha: (1 - p) * 0.85 })
        for (const [i, angle] of [-2.4, -2, -1.65, -1.35, -1, -0.6].entries()) this.interactions.circle(splash.x + Math.cos(angle) * (38 + i % 3 * 14) * p, splash.y + Math.sin(angle) * (38 + i % 3 * 14) * p + 68 * p * p, Math.max(1.2, 3.2 * (1 - p * 0.6))).fill({ color: '#e0f2fe', alpha: (1 - p) * 0.85 })
      }
    }
  }

  private destroyDecor(decor: Decoration): void {
    decor.override?.destroy({ texture: true, textureSource: true })
    for (const context of decor.frames.values()) { this.contexts.delete(context); context.destroy() }
    for (const graphic of [decor.art, decor.highlight, decor.halo]) this.contexts.delete(graphic.context)
    decor.highlight.destroy({ context: true })
    decor.root.destroy({ children: true })
  }

  private clear(): void {
    for (const decor of this.decorations.values()) decor.override?.destroy({ texture: true, textureSource: true })
    this.panel?.destroy()
    this.panel = null
    this.foodLayer.removeChildren().forEach(child => child.destroy())
    for (const parent of [this.back, this.decors, this.foreground, this.front, this.highlights]) for (const child of parent.removeChildren()) if (child !== this.foodLayer) child.destroy({ children: true })
    for (const context of this.contexts) if (!context.destroyed) context.destroy()
    this.contexts.clear(); this.decorations.clear(); this.foods.clear()
    for (const array of [this.bubbles, this.plankton, ...this.schools, this.kelps, this.beams, this.bulbs, this.pools, this.beads, this.waves]) array.length = 0
    this.flash = null
    this.interactions.clear()
  }

  invalidate(): void { this.key = '' }
  destroy(): void {
    this.clear()
    for (const gradient of this.gradients) gradient.destroy()
    this.gradients.clear(); this.gradientCache.clear()
    this.back.destroy(); this.decors.destroy(); this.foreground.destroy(); this.front.destroy(); this.foodLayer.destroy(); this.interactions.destroy({ context: true })
    this.highlights.destroy()
  }
}

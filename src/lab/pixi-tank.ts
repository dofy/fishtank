import { Application, CanvasSource, Container, Filter, GlProgram, Graphics, MeshSimple, Rectangle, Texture, type WebGLRenderer } from 'pixi.js'
import type { Renderer } from '../render/renderer'
import type { Agent, SceneView } from '../render/scene'
import { FishDeformation } from './fish-motion'
import { sceneColorsFor } from '../render/theme'
import { lcdElectricity } from '../render/lcd-electricity'
import { lcdWithdrawalDensity, withdrawalOpacity, withdrawalScale } from '../render/withdrawal'
import { NativeEnvironment } from './native-environment'
import { GpuTimer } from './gpu-timer'

const vertex = `
precision highp float;
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`

const fragment = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform float uTime;
uniform float uNight;
uniform float uHeight;
void main() {
  vec2 pixel = vTextureCoord * uInputSize.xy;
  float depth = pixel.y / max(uHeight, 1.0);
  float submerged = smoothstep(0.065, 0.18, depth) * (1.0 - smoothstep(0.87, 0.98, depth));
  vec2 offset = vec2(sin(pixel.y * 0.042 + uTime * 0.8), cos(pixel.x * 0.024 + uTime * 0.65));
  vec2 uv = clamp(vTextureCoord + offset * uInputSize.zw * 1.15 * submerged, uInputClamp.xy, uInputClamp.zw);
  vec4 color = texture(uTexture, uv);
  float a = sin(pixel.x * 0.035 + sin(pixel.y * 0.028 + uTime * 0.55) * 2.2 + uTime * 0.35);
  float b = cos(pixel.y * 0.055 + sin(pixel.x * 0.018 - uTime * 0.4) * 2.3);
  float caustic = pow(max(0.0, 1.0 - abs(a + b) * 1.8), 5.0);
  color.rgb += vec3(0.22, 0.64, 0.72) * caustic * submerged * mix(0.085, 0.045, uNight) * color.a;
  finalColor = color;
}`

interface FishTexture {
  texture: Texture
  width: number
  height: number
  length: number
  pad: number
  canvas: HTMLCanvasElement
  lastPose: number
  visibility: number
}

interface FishNode {
  mesh: MeshSimple
  deformation: FishDeformation
  facing: number
  textureKey: string
}

/** Native environment scene graph, GPU fish meshes, and optional water post-processing. */
export class PixiTank {
  readonly app = new Application()
  private readonly water = new Container()
  private readonly fishLayer = new Container()
  private readonly sparks = new Graphics()
  private readonly motes: Graphics[] = []
  private readonly environment = new NativeEnvironment()
  private gpuTimer: GpuTimer | null = null
  private readonly textures = new Map<string, FishTexture>()
  private readonly nodes = new Map<string, FishNode>()
  private filter = new Filter({
    resolution: 'inherit',
    antialias: true,
    glProgram: GlProgram.from({ vertex, fragment }),
    resources: { waterUniforms: {
      uTime: { value: 0, type: 'f32' },
      uNight: { value: 0, type: 'f32' },
      uHeight: { value: 230, type: 'f32' },
    } },
  })
  private themeKey = ''
  private effectsEnabled = false
  private hadSparks = false
  private diagnostics = ''
  private previousTime = 0
  private lost = false
  private disposed = false
  private readonly onContextLost = (event: Event) => { event.preventDefault(); this.lost = true }
  private readonly onContextRestored = () => {
    this.gpuTimer?.destroy()
    this.gpuTimer = new GpuTimer((this.app.renderer as WebGLRenderer).gl)
    this.lost = false
    this.themeKey = ''
    this.environment.invalidate()
  }

  async init(): Promise<void> {
    await this.app.init({
      preference: 'webgl', width: 960, height: 230, resolution: Math.min(2, window.devicePixelRatio || 1),
      autoStart: false, sharedTicker: false, backgroundAlpha: 1, antialias: true,
    })
    this.app.canvas.setAttribute('aria-hidden', 'true')
    this.app.canvas.addEventListener('webglcontextlost', this.onContextLost)
    this.app.canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    this.water.addChild(this.environment.back, this.environment.decors, this.fishLayer, this.sparks, this.environment.interactions, this.environment.front)
    this.app.stage.addChild(this.water)
    this.gpuTimer = new GpuTimer((this.app.renderer as WebGLRenderer).gl)
    for (let i = 0; i < 28; i++) {
      const point = new Graphics().circle(0, 0, 1 + i % 3 * 0.3).fill('#c9f4ff')
      point.blendMode = 'add'
      point.visible = false
      this.motes.push(point)
      this.water.addChild(point)
    }
  }

  get available(): boolean { return !this.lost && !this.disposed }

  invalidate(): void { this.themeKey = ''; this.environment.invalidate() }

  measureGpu(enabled: boolean): void { this.gpuTimer?.reset(enabled) }
  gpuSamples(): number[] { return this.gpuTimer?.samples() ?? [] }
  get gpuSupported(): boolean { return this.gpuTimer?.supported ?? false }
  rendererInfo(): string {
    const gl = (this.app.renderer as WebGLRenderer).gl
    const extension = gl.getExtension('WEBGL_debug_renderer_info')
    return extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
  }

  render(renderer: Renderer, view: SceneView, effects: boolean, motion: boolean, zoom: number): number {
    const started = performance.now()
    if (!this.available) return 0
    const { width: w, height: h } = view
    const lcd = renderer.manifest.renderer === 'lcd'
    const themeKey = `${renderer.manifest.id}:${view.night}:${w}:${h}:${zoom}:${window.devicePixelRatio}`
    const themeChanged = themeKey !== this.themeKey
    if (themeChanged) {
      this.clearFish()
      this.themeKey = themeKey
      this.app.renderer.resolution = Math.min(2, window.devicePixelRatio || 1)
      this.app.renderer.resize(w * zoom, h * zoom)
      this.app.stage.scale.set(zoom)
      // The aquarium is clipped by its canvas; don't measure every offscreen fish,
      // halo and particle to rediscover the same visible filter area each frame.
      this.water.filterArea = new Rectangle(0, 0, w, h)
    }
    this.environment.update(view, renderer.manifest)

    const dt = Math.min(0.1, Math.max(0, view.time - this.previousTime))
    this.previousTime = view.time
    const live = new Set(view.agents.map(a => a.fish.uid))
    for (const [uid, node] of this.nodes) {
      if (!live.has(uid)) { this.destroyFish(node); this.nodes.delete(uid) }
    }
    const used = new Set<string>()
    if (this.hadSparks) this.sparks.clear()
    this.hadSparks = false
    for (const agent of view.agents) {
      // Each dissolving LCD fish owns one tiny texture. Living copies keep
      // sharing their normal art, and progress never creates a new cache key.
      const key = `${agent.species.id}:${agent.fish.grade}:${agent.fish.tier}:${agent.scale}${lcd && agent.withdrawal ? `:withdraw:${agent.fish.uid}` : ''}`
      const visibility = lcd ? lcdWithdrawalDensity(agent.withdrawal) : 1
      used.add(key)
      const art = this.textures.get(key) ?? this.bake(renderer, agent, key, visibility)
      if (lcd && (art.visibility !== visibility || (motion && !view.reducedMotion && Math.abs(view.time - art.lastPose) >= 1 / 8))) {
        const ctx = art.canvas.getContext('2d')!
        ctx.clearRect(-art.pad, -art.height / 2, art.width, art.height)
        renderer.fishFrame(ctx, art.length, { species: agent.species, grade: agent.fish.grade, tier: agent.fish.tier, visibility }, view.reducedMotion || agent.withdrawal?.reducedMotion || !motion ? 0 : view.time + agent.phase)
        art.texture.source.update()
        art.lastPose = view.time
        art.visibility = visibility
      }
      let node = this.nodes.get(agent.fish.uid)
      if (!node || node.textureKey !== key) {
        if (node) this.destroyFish(node)
        node = this.makeFish(art, agent, key)
        this.nodes.set(agent.fish.uid, node)
        this.fishLayer.addChild(node.mesh)
      }
      const electric = (agent.shockedTimer ?? 0) > 0 || (agent.dischargingTimer ?? 0) > 0
      const cell = Math.max(2, renderer.manifest.cell ?? 4)
      const lcdEffect = lcd && electric ? lcdElectricity(agent.x, agent.y, art.length, agent.species.body.depth, view.time, cell, view.reducedMotion || !motion) : null
      this.animateFish(node, agent, view, dt, lcd, motion, cell)
      if (lcdEffect) {
        this.hadSparks = true
        node.mesh.position.set(lcdEffect.x, lcdEffect.y)
        for (const dot of lcdEffect.dots) this.sparks.rect(dot.x, dot.y, dot.size, dot.size)
        this.sparks.fill(sceneColorsFor(renderer.manifest, !!view.night).ink)
      } else if (electric) {
        this.hadSparks = true
        const strong = (agent.dischargingTimer ?? 0) > 0
        const radius = art.length * (strong ? 0.7 : 0.48)
        const phase = view.reducedMotion ? 0 : Math.floor(view.time * 14)
        for (let i = 0; i < (strong ? 7 : 3); i++) {
          const angle = i * 2.4 + phase
          const x = agent.x + Math.cos(angle) * radius
          const y = agent.y + Math.sin(angle) * radius * 0.5
          this.sparks.moveTo(x, y).lineTo(x + 3, y - 5).lineTo(x + 6, y - 2).lineTo(x + 9, y - 7)
        }
        this.sparks.stroke({ color: '#b9f4ff', width: 1.3, alpha: 0.8 })
      }
    }
    for (const [key, art] of this.textures) {
      if (!used.has(key)) { art.texture.destroy(true); this.textures.delete(key) }
    }
    const animate = !view.reducedMotion
    const effectsEnabled = effects && !lcd
    if (effectsEnabled !== this.effectsEnabled) {
      this.water.filters = effectsEnabled ? [this.filter] : []
      for (const sprite of this.motes) sprite.visible = effectsEnabled
      this.effectsEnabled = effectsEnabled
    }
    const uniforms = this.filter.resources.waterUniforms.uniforms
    uniforms.uTime = animate ? view.time : 0
    uniforms.uNight = view.night ? 1 : 0
    uniforms.uHeight = h * zoom
    for (const [i, sprite] of this.motes.entries()) {
      if (!effectsEnabled) break
      const t = animate ? view.time : 0
      sprite.position.set(((i * 137.3 + Math.sin(t * 0.23 + i) * 13) % w + w) % w, h - (i * 37.7 + t * (3 + i % 5)) % h)
      sprite.alpha = view.night ? 0.2 : 0.14
    }
    this.gpuTimer?.begin()
    try { this.app.render() } finally { this.gpuTimer?.end() }
    // The filter input is a pooled render texture that can be released on resize.
    this.filter.groups[0]?.setResource(Texture.EMPTY.source, 1)
    this.filter.groups[0]?.setResource(Texture.EMPTY.source.style, 2)
    this.filter.groups[0]?.setResource(Texture.EMPTY.source, 3)
    const diagnostics = `${this.nodes.size}:${this.textures.size}:${lcd}`
    if (diagnostics !== this.diagnostics) {
      Object.assign(this.app.canvas.dataset, {
        fishCount: String(this.nodes.size), textureCount: String(this.textures.size),
        style: lcd ? 'lcd' : 'realistic', environment: 'native', environmentUploads: '0',
      })
      this.diagnostics = diagnostics
    }
    return performance.now() - started
  }

  private bake(renderer: Renderer, agent: Agent, key: string, visibility: number): FishTexture {
    const length = agent.species.body.length * 4.2 * agent.scale
    const pad = 18
    const width = Math.ceil(length + pad * 2)
    // Full fins, jelly streamers, shadows and curved tails must stay inside the texture.
    const height = Math.ceil(Math.max(length * 1.65, 76) + pad * 2)
    const lcd = renderer.manifest.renderer === 'lcd'
    const r = lcd ? 1 : 2
    const canvas = document.createElement('canvas')
    canvas.width = width * r
    canvas.height = height * r
    const ctx = canvas.getContext('2d')!
    ctx.scale(r, r)
    ctx.translate(pad, height / 2)
    renderer.fishFrame(ctx, length, { species: agent.species, tier: agent.fish.tier, grade: agent.fish.grade, visibility }, 0)
    const texture = new Texture({ source: new CanvasSource({ resource: canvas, resolution: r, scaleMode: lcd ? 'nearest' : 'linear' }) })
    const art = { texture, length, width, height, pad, canvas, lastPose: -Infinity, visibility }
    this.textures.set(key, art)
    return art
  }

  private makeFish(art: FishTexture, agent: Agent, textureKey: string): FishNode {
    const cols = 19, rows = 9
    const vertices = new Float32Array(cols * rows * 2)
    const uvs = new Float32Array(vertices.length)
    const indices: number[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 2
        vertices[i] = col / (cols - 1) * art.width - art.width / 2
        vertices[i + 1] = row / (rows - 1) * art.height - art.height / 2
        uvs[i] = col / (cols - 1)
        uvs[i + 1] = row / (rows - 1)
        if (col < cols - 1 && row < rows - 1) {
          const a = row * cols + col
          indices.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols)
        }
      }
    }
    const mesh = new MeshSimple({ texture: art.texture, vertices, uvs, indices: new Uint32Array(indices) })
    // Keep the full 19 × 9 mesh. Pixi can batch these modest meshes with native art.
    mesh.geometry.batchMode = 'batch'
    mesh.autoUpdate = false
    return { mesh, deformation: new FishDeformation(agent.species.body, art.length, art.width, art.height, art.pad, vertices.slice(), cols), facing: agent.dir, textureKey }
  }

  private animateFish(node: FishNode, a: Agent, view: SceneView, dt: number, lcd: boolean, motion: boolean, cell: number): void {
    const { mesh } = node
    const reduced = view.reducedMotion || !motion || !!a.withdrawal?.reducedMotion
    const shocked = (a.shockedTimer ?? 0) > 0
    const t = reduced ? 0 : view.time + a.phase
    node.facing += (a.dir - node.facing) * Math.min(1, dt * 12)
    const retreatScale = lcd ? 1 : withdrawalScale(a.withdrawal)
    mesh.scale.set((lcd || reduced ? a.dir : node.facing) * retreatScale, retreatScale)
    mesh.position.set(lcd ? Math.round(a.x / cell) * cell : a.x, lcd ? Math.round(a.y / cell) * cell : a.y + (a.dropping || shocked || reduced || a.withdrawal ? 0 : Math.sin(t * 2) * 2.5))
    mesh.rotation = lcd ? 0 : (a.tilt ?? 0) * a.dir
    mesh.alpha = lcd ? 1 : withdrawalOpacity(a.withdrawal)
    // LCD poses are sampled above. Frozen or shocked meshes upload only on transition.
    if (node.deformation.update(mesh.vertices as Float32Array, t, (a.scaredTimer ?? 0) > 0 ? 9 : 4.5, !reduced && !shocked && !lcd)) {
      mesh.geometry.getBuffer('aPosition').update()
    }
  }

  private clearFish(): void {
    for (const node of this.nodes.values()) this.destroyFish(node)
    this.nodes.clear()
    for (const art of this.textures.values()) art.texture.destroy(true)
    this.textures.clear()
  }

  private destroyFish(node: FishNode): void {
    const geometry = node.mesh.geometry
    node.mesh.destroy()
    geometry.destroy()
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    const canvas = this.app.renderer?.canvas
    canvas?.removeEventListener('webglcontextlost', this.onContextLost)
    canvas?.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.gpuTimer?.destroy()
    this.clearFish()
    // Release renderer-owned batch bindings before disposing native gradient textures.
    this.water.removeChildren()
    if (this.app.renderer) this.app.destroy(true, { children: true })
    else this.app.stage.destroy({ children: true })
    this.environment.destroy()
    this.sparks.destroy({ context: true })
    for (const mote of this.motes) mote.destroy({ context: true })
    this.filter.destroy()
  }
}

import { makeFish, newGame } from '../core/game'
import { species } from '../core/species'
import type { GameState } from '../core/types'
import type { Renderer } from '../render/renderer'
import { Scene, type SceneView } from '../render/scene'
import { onSpriteLoad } from '../render/theme'
import { PixiTank } from './pixi-tank'
import { Benchmark } from './benchmark'
import './pixi-lab.css'

type Mode = 'canvas' | 'pixi' | 'compare'

/** Dev-only visual experiment. Never changes game rules, save format or saved preferences. */
export class TankLab {
  private readonly host = document.createElement('section')
  private readonly stage = document.createElement('div')
  private readonly overlay = document.createElement('div')
  private readonly status = document.createElement('output')
  private readonly note = document.createElement('p')
  private readonly split = document.createElement('input')
  private readonly effects = document.createElement('input')
  private readonly motion = document.createElement('input')
  private readonly observe = document.createElement('input')
  private readonly benchButton = document.createElement('button')
  private readonly benchResults = document.createElement('div')
  private readonly modes = new Map<Mode, HTMLButtonElement>()
  private readonly pixi = new PixiTank()
  private mode: Mode = 'compare'
  private ready = false
  private lastStatusTime = 0
  private canvasMs = 0
  private pixiMs = 0
  private sampledFrames = 0
  private demoScene = new Scene()
  private readonly demoState = this.makeDemoState()
  private readonly stopSpriteListener: () => void
  private benchmark: Benchmark | null = null
  private pendingBenchmark = false
  private latest: { renderer: Renderer; view: SceneView; zoom: number } | null = null
  private benchKey = ''
  private previousMode: Mode = 'compare'

  constructor(canvas: HTMLCanvasElement) {
    this.host.className = 'tank-lab'
    this.host.setAttribute('aria-label', 'PixiJS 本地对照实验')
    const heading = document.createElement('div')
    heading.className = 'lab-heading'
    const title = document.createElement('strong')
    title.textContent = '🫧 鱼缸对照实验'
    const exit = document.createElement('a')
    exit.href = location.pathname
    exit.textContent = '返回常规游戏'
    heading.append(title, exit)
    const controls = document.createElement('div')
    controls.className = 'lab-controls'
    const modeGroup = document.createElement('div')
    modeGroup.className = 'lab-modes'
    modeGroup.setAttribute('role', 'group')
    modeGroup.setAttribute('aria-label', '鱼缸渲染对照方式')
    for (const [value, label] of [['canvas', 'Canvas 原版'], ['pixi', 'PixiJS 样例'], ['compare', '滑动对照']] as const) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.setAttribute('aria-pressed', String(value === this.mode))
      button.disabled = value !== 'canvas'
      button.addEventListener('click', () => { this.mode = value; this.updateMode() })
      this.modes.set(value, button)
      modeGroup.append(button)
    }
    controls.append(modeGroup)
    for (const [input, label, checked] of [
      [this.effects, '水下光纹', true], [this.motion, '鱼体摆动', true], [this.observe, '观察示例鱼群', false],
    ] as const) {
      input.type = 'checkbox'
      input.checked = checked
      const wrapper = document.createElement('label')
      wrapper.append(input, label)
      controls.append(wrapper)
    }
    this.observe.addEventListener('change', () => {
      this.demoScene = new Scene()
      this.updateNote()
    })
    this.split.type = 'range'
    this.split.min = '0'
    this.split.max = '100'
    this.split.value = '50'
    this.split.setAttribute('aria-label', 'Canvas 与 PixiJS 对照分界')
    this.split.addEventListener('input', () => this.updateMode())
    this.split.className = 'lab-split'
    this.note.className = 'lab-note'
    this.status.className = 'lab-status'
    this.status.textContent = '正在准备 WebGL…'
    this.benchButton.type = 'button'
    this.benchButton.textContent = '运行性能对照'
    this.benchButton.title = '运行 / 取消性能对照 (B)，沉浸模式也可使用'
    this.benchButton.disabled = true
    this.benchButton.addEventListener('click', () => this.benchmark || this.pendingBenchmark ? this.stopBenchmark('性能对照已取消。') : this.startBenchmark())
    controls.append(this.benchButton)
    this.benchResults.className = 'lab-bench-results'
    this.benchResults.setAttribute('aria-live', 'polite')
    this.host.append(heading, controls, this.split, this.note, this.status, this.benchResults)
    this.stage.className = 'lab-stage'
    canvas.before(this.host, this.stage)
    this.stage.append(canvas)
    this.overlay.className = 'lab-overlay'
    this.stage.append(this.overlay)
    for (const [label, className] of [['Canvas', 'lab-left'], ['PixiJS', 'lab-right']]) {
      const badge = document.createElement('span')
      badge.className = `lab-badge ${className}`
      badge.textContent = label!
      this.stage.append(badge)
    }
    this.updateNote()
    this.stopSpriteListener = onSpriteLoad(() => this.pixi.invalidate())
    window.addEventListener('pagehide', this.pageHide)
    window.addEventListener('keydown', this.benchShortcut)
  }

  async init(): Promise<void> {
    try {
      await this.pixi.init()
      this.overlay.append(this.pixi.app.canvas)
      this.ready = true
      this.benchButton.disabled = false
      for (const button of this.modes.values()) button.disabled = false
      this.updateMode()
    } catch (error) {
      this.mode = 'canvas'
      this.status.textContent = 'WebGL 无法启动，已保留 Canvas。可更换支持硬件加速的浏览器再试。'
      console.warn('PixiJS local lab unavailable', error)
      this.updateMode()
    }
  }

  private updateMode(): void {
    for (const [mode, button] of this.modes) button.setAttribute('aria-pressed', String(mode === this.mode))
    const cut = this.mode === 'pixi' ? 0 : Number(this.split.value)
    this.stage.style.setProperty('--lab-split', `${cut}%`)
    this.overlay.style.clipPath = `inset(0 0 0 ${cut}%)`
    this.overlay.hidden = this.mode === 'canvas' || !this.ready
    this.stage.dataset.compare = String(this.mode === 'compare' && this.ready)
    this.split.hidden = this.mode !== 'compare' || !this.ready
    this.sampledFrames = this.canvasMs = this.pixiMs = 0
  }

  private updateNote(): void {
    this.note.textContent = this.observe.checked
      ? '正在观察 12 条示例鱼与 9 件造景，仅用于画面对照，不加入背包。下方玩法仍使用你的本地存档；取消勾选即可看自己的鱼缸。'
      : '左右共用同一套游动与互动。点水投喂、点鱼受惊；在设置中切换写实 / LCD 和昼夜。两个效果开关仅作用于 PixiJS，不写入存档。'
  }

  sceneFor(original: Scene): Scene { return this.observe.checked ? this.demoScene : original }
  stateFor(original: GameState): GameState { return this.observe.checked ? this.demoState : original }
  get observing(): boolean { return this.observe.checked }

  draw(renderer: Renderer, view: SceneView, ctx: CanvasRenderingContext2D, scale: number, zoom: number): void {
    this.latest = { renderer, view, zoom }
    if (this.pendingBenchmark) {
      this.pendingBenchmark = false
      this.benchmark = new Benchmark(structuredClone(view))
      this.benchKey = this.fingerprint(renderer, view, zoom)
    }
    if (this.benchmark && (this.fingerprint(renderer, view, zoom) !== this.benchKey || document.hidden || !this.pixi.available)) {
      this.stopBenchmark('场景、窗口或可见状态发生变化，本次采样已取消。保持页面在前台后可重新运行。')
    }
    const benchmark = this.benchmark
    if (benchmark) {
      view = benchmark.view()
      if (this.mode !== benchmark.mode) { this.mode = benchmark.mode; this.updateMode() }
    }
    const frameNow = performance.now()
    let canvasCost = 0, pixiCost = 0
    // Context loss always exposes the existing working renderer and interactions.
    const available = this.ready && this.pixi.available
    this.overlay.hidden = !available || this.mode === 'canvas'
    if (this.mode !== 'pixi' || !available) {
      const started = performance.now()
      ctx.save()
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      renderer.scene(ctx, view)
      ctx.restore()
      canvasCost = performance.now() - started
      this.canvasMs += canvasCost
    }
    if (this.mode !== 'canvas' && available) {
      try {
        pixiCost = this.pixi.render(renderer, view, this.effects.checked, this.motion.checked, zoom)
        this.pixiMs += pixiCost
      } catch (error) {
        this.ready = false
        if (benchmark) this.stopBenchmark('PixiJS 绘制失败，采样已取消。')
        this.mode = 'canvas'
        this.updateMode()
        this.status.textContent = 'PixiJS 绘制失败，已切回 Canvas。'
        console.warn('PixiJS local lab rendering failed', error)
        return
      }
    }
    this.sampledFrames++
    if (benchmark) {
      const progress = benchmark.progress
      const action = benchmark.record(benchmark.mode === 'canvas' ? canvasCost : pixiCost, frameNow, this.pixi.gpuSamples())
      if (action === 'measure') this.pixi.measureGpu(benchmark.mode === 'pixi')
      if (action === 'pass') this.pixi.measureGpu(false)
      if (action === 'done') this.finishBenchmark(benchmark)
      else this.status.textContent = `性能对照 ${progress}；按固定顺序 Canvas → PixiJS → PixiJS → Canvas 分别播放同一场景。`
      return
    }
    if (view.time - this.lastStatusTime >= 1 && this.ready) {
      const canvas = this.mode === 'pixi' && available ? '—' : `${(this.canvasMs / this.sampledFrames).toFixed(2)} ms`
      const pixi = this.mode === 'canvas' || !available ? '—' : `${(this.pixiMs / this.sampledFrames).toFixed(2)} ms`
      this.status.textContent = available
        ? `${view.agents.length} 条鱼 · JS 提交耗时 Canvas ${canvas} / PixiJS ${pixi}（非 GPU 总耗时） · 背景与造景原生渲染 · ${renderer.manifest.renderer === 'lcd' ? 'LCD 点阵，无光纹滤镜' : 'WebGL 矢量与光纹'}`
        : 'WebGL 暂不可用，正在显示 Canvas；恢复后自动继续对照。'
      this.lastStatusTime = view.time
      this.sampledFrames = this.canvasMs = this.pixiMs = 0
    }
  }

  private fingerprint(renderer: Renderer, view: SceneView, zoom: number): string {
    return JSON.stringify([renderer.manifest.id, view.night, view.width, view.height, zoom, devicePixelRatio, view.reducedMotion, view.agents.map(a => [a.fish.uid, a.fish.grade, a.scale]), view.decors.map(d => [d.item.id, d.x, d.flip]), view.railLights, this.effects.checked, this.motion.checked])
  }

  private benchShortcut = (event: KeyboardEvent): void => {
    const target = event.target
    if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'b') return
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, select, textarea'))) return
    if (document.querySelector('.modal-host:not(:empty)')) return
    event.preventDefault()
    this.benchButton.click()
  }

  private startBenchmark(): void {
    if (!this.ready || !this.pixi.available || !this.latest) return
    // Capture after the next resize/layout frame, including an immediately preceding F key.
    this.pendingBenchmark = true
    this.previousMode = this.mode
    this.benchResults.replaceChildren()
    delete this.benchResults.dataset.report
    this.setBenchmarkControls(true)
    this.pixi.measureGpu(false)
  }

  private setBenchmarkControls(running: boolean): void {
    for (const button of this.modes.values()) button.disabled = running || !this.ready
    for (const input of [this.effects, this.motion, this.observe, this.split]) input.disabled = running
    this.benchButton.textContent = running ? '取消性能对照' : '运行性能对照'
    this.stage.style.pointerEvents = running ? 'none' : ''
  }

  private stopBenchmark(message: string): void {
    this.benchmark = null
    this.pendingBenchmark = false
    this.pixi.measureGpu(false)
    this.mode = this.previousMode
    this.updateMode()
    this.setBenchmarkControls(false)
    this.benchResults.textContent = message
  }

  private finishBenchmark(benchmark: Benchmark): void {
    const { renderer, view, zoom } = this.latest!
    const report = {
      schema: 1, createdAt: new Date().toISOString(), theme: renderer.manifest.id, night: view.night,
      logicalSize: [view.width, view.height], displaySize: [view.width * zoom, view.height * zoom], dpr: devicePixelRatio,
      fish: view.agents.length, decorations: view.decors.length, effects: this.effects.checked, motion: this.motion.checked,
      browser: navigator.userAgent, gpuRenderer: this.pixi.rendererInfo(), gpuTimerSupported: this.pixi.gpuSupported,
      warmupFramesPerPass: benchmark.warmup, samplesPerPass: benchmark.samples, order: benchmark.order,
      results: benchmark.results(), passes: benchmark.passes,
    }
    this.stopBenchmark('')
    this.benchResults.dataset.report = JSON.stringify(report)
    const table = document.createElement('table')
    const format = (value: number | null | undefined) => value == null ? '不可用' : value.toFixed(2)
    table.innerHTML = '<thead><tr><th>渲染器</th><th>JS 均值 / P95</th><th>帧率</th><th>GPU 均值</th></tr></thead>'
    const body = document.createElement('tbody')
    for (const row of report.results) {
      const tr = document.createElement('tr')
      for (const text of [row.mode === 'canvas' ? 'Canvas' : 'PixiJS', `${format(row.cpu?.mean)} / ${format(row.cpu?.p95)} ms`, `${format(row.fps)} FPS`, row.mode === 'canvas' ? '浏览器不提供' : row.gpu ? `${format(row.gpu.mean)} ms` : '浏览器不支持 / 无有效样本']) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td)
      }
      body.append(tr)
    }
    table.append(body)
    const note = document.createElement('p')
    note.textContent = '预热后分四轮采样，含相同的鱼食、水花和原生造景。JS 提交、浏览器帧率与 GPU 时间分别计量；帧率受屏幕刷新率限制，结果仅代表当前浏览器。'
    const download = document.createElement('button')
    download.type = 'button'
    download.textContent = '下载采样数据'
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `fishtank-${report.theme}-benchmark.json`; a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
    this.benchResults.append(table, note, download)
  }

  private makeDemoState(): GameState {
    const now = Date.now()
    const state = newGame(now, 'zh')
    const ids = ['goldfin', 'neoncleaner', 'neonstreak', 'coralseahorse', 'moonjelly', 'ambereel', 'volteel', 'bandedkrait', 'voidray', 'jadeturtle', 'prismkoi', 'astraljelly']
    state.fish = ids.map(id => makeFish(id, species(id).tier, 1, now, { adult: true }))
    state.level = 10
    state.tankUids = state.fish.map(fish => fish.uid)
    state.placedDecor = [
      { id: 'kelp', x: 0.08 }, { id: 'mushroom', x: 0.23 }, { id: 'rocks', x: 0.4 },
      { id: 'shell', x: 0.56 }, { id: 'arch', x: 0.73 }, { id: 'crystal', x: 0.91 },
      { id: 'fairylights', x: 0.2 }, { id: 'starlamps', x: 0.5 }, { id: 'jellylamps', x: 0.8 },
    ]
    return state
  }

  private pageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) return
    this.stopSpriteListener()
    if (this.ready) this.pixi.destroy()
    window.removeEventListener('pagehide', this.pageHide)
    window.removeEventListener('keydown', this.benchShortcut)
  }
}

export async function mountTankLab(canvas: HTMLCanvasElement): Promise<TankLab> {
  const lab = new TankLab(canvas)
  await lab.init()
  return lab
}

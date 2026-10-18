import { newGame, tick } from './core/game'
import { load, save, wipe } from './core/save'
import { species } from './core/species'
import type { Locale } from './core/types'
import { LcdRenderer } from './render/lcd'
import { RealisticRenderer } from './render/realistic'
import type { Renderer } from './render/renderer'
import { Scene } from './render/scene'
import { type ThemeManifest, applyTheme, loadTheme, onSpriteLoad } from './render/theme'
import { App } from './ui/app'
import './ui/styles.css'

const THEMES = [
  { id: 'realistic', name: 'Realistic Reef' },
  { id: 'lcd', name: 'Monochrome LCD' },
]

const TANK_HEIGHT = 280

function makeRenderer(manifest: ThemeManifest): Renderer {
  return manifest.renderer === 'lcd'
    ? new LcdRenderer(manifest)
    : new RealisticRenderer(manifest)
}

async function safeLoadTheme(id: string): Promise<ThemeManifest> {
  try {
    return await loadTheme(id)
  } catch {
    return loadTheme('realistic')
  }
}

async function main(): Promise<void> {
  const root = document.getElementById('app')
  if (!root) throw new Error('#app container missing')

  let state = load(Date.now())
  let manifest = await safeLoadTheme(state.theme)
  state.theme = manifest.id
  applyTheme(manifest)

  let renderer = makeRenderer(manifest)
  const scene = new Scene()

  const app = new App(state, renderer, {
    themes: THEMES,
    onThemeChange: async (id: string) => {
      const next = await safeLoadTheme(id)
      manifest = next
      state.theme = next.id
      applyTheme(next)
      renderer = makeRenderer(next)
      app.setRenderer(renderer)
      save(state)
    },
    onLocaleChange: (locale: Locale) => {
      state.locale = locale
      app.render(Date.now())
      save(state)
    },
    onSave: () => {
      save(state)
    },
    onReset: () => {
      const currentLocale = state.locale
      wipe()
      state = newGame(Date.now(), currentLocale)
      state.theme = manifest.id
      app.setState(state)
      app.render(Date.now())
      save(state)
    },
  })

  app.mount(root)
  onSpriteLoad(() => app.invalidatePortraits())

  const ctx = app.canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  let cssWidth = 0
  let cssHeight = TANK_HEIGHT
  let dpr = 1

  const resizeCanvas = () => {
    const nextW = Math.max(320, Math.floor(app.canvas.clientWidth || root.clientWidth - 32 || 920))
    const nextH = TANK_HEIGHT
    const nextDpr = Math.min(2, window.devicePixelRatio || 1)
    if (nextW === cssWidth && nextH === cssHeight && nextDpr === dpr) return
    cssWidth = nextW
    cssHeight = nextH
    dpr = nextDpr
    app.canvas.style.height = `${cssHeight}px`
    app.canvas.width = Math.round(cssWidth * dpr)
    app.canvas.height = Math.round(cssHeight * dpr)
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const startMs = performance.now()
  let lastMs = startMs

  const frame = (nowMs: number) => {
    resizeCanvas()
    const dt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000))
    lastMs = nowMs
    const elapsed = (nowMs - startMs) / 1000
    const wallNow = Date.now()

    scene.sync(state, species, cssWidth, cssHeight, wallNow)
    scene.update(dt, cssWidth, cssHeight, elapsed)

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderer.scene(ctx, scene.view(cssWidth, cssHeight, elapsed))
    ctx.restore()

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  window.setInterval(() => {
    const now = Date.now()
    const res = tick(state, now)
    if (res.maturedCount > 0 || res.heartsGained > 0 || res.levelUps > 0) {
      save(state)
      app.render(now)
    } else {
      app.updateTimers(now)
    }
  }, 1000)

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(state)
  })
  window.addEventListener('beforeunload', () => save(state))
}

void main()

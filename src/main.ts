import { sound, syncAudioConfig } from './core/audio'
import { moveDecor, newGame, tick } from './core/game'
import { load, save, wipe } from './core/save'
import { species } from './core/species'
import type { AudioConfig, ColorMode, DecorId, Locale } from './core/types'
import { LcdRenderer } from './render/lcd'
import { RealisticRenderer } from './render/realistic'
import type { Renderer } from './render/renderer'
import { Scene } from './render/scene'
import {
  type ThemeManifest,
  applyTheme,
  loadTheme,
  onSpriteLoad,
  resolveDarkMode,
} from './render/theme'
import { App } from './ui/app'
import './ui/styles.css'

const THEMES = [
  { id: 'realistic', name: 'Realistic Reef' },
  { id: 'lcd', name: 'Monochrome LCD' },
]

const TANK_HEIGHT = 230

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
  sound.configure(syncAudioConfig(state.audio))
  let manifest = await safeLoadTheme(state.theme)
  state.theme = manifest.id
  let night = resolveDarkMode(state.colorMode ?? 'auto')
  applyTheme(manifest, night)

  let renderer = makeRenderer(manifest)
  const scene = new Scene()

  const app = new App(state, renderer, {
    themes: THEMES,
    onThemeChange: async (id: string) => {
      const next = await safeLoadTheme(id)
      manifest = next
      state.theme = next.id
      night = resolveDarkMode(state.colorMode ?? 'auto')
      applyTheme(next, night)
      renderer = makeRenderer(next)
      app.setRenderer(renderer)
      save(state)
    },
    onColorModeChange: (mode: ColorMode) => {
      state.colorMode = mode
      night = resolveDarkMode(mode)
      applyTheme(manifest, night)
      app.invalidatePortraits()
      save(state)
    },
    onAudioChange: (audio: AudioConfig) => {
      state.audio = syncAudioConfig(audio)
      sound.configure(state.audio)
      app.render(Date.now())
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
      const currentColorMode = state.colorMode ?? 'auto'
      const currentAudio = syncAudioConfig(state.audio)
      wipe()
      state = newGame(Date.now(), currentLocale)
      state.theme = manifest.id
      state.colorMode = currentColorMode
      state.audio = currentAudio
      sound.configure(currentAudio)
      night = resolveDarkMode(currentColorMode)
      applyTheme(manifest, night)
      app.setState(state)
      app.invalidatePortraits()
      save(state)
    },
  })

  app.mount(root)
  onSpriteLoad(() => app.invalidatePortraits())

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if ((state.colorMode ?? 'auto') === 'auto') {
        night = resolveDarkMode('auto')
        applyTheme(manifest, night)
        app.invalidatePortraits()
      }
    })
  }

  const ctx = app.canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  let cssWidth = 0
  let cssHeight = TANK_HEIGHT
  let logicalWidth = 0
  let logicalHeight = TANK_HEIGHT
  let zoom = 1
  let dpr = 1

  const resizeCanvas = () => {
    const immersive = app.isImmersive()
    const vw = window.innerWidth || 960
    const vh = window.innerHeight || 720
    const nextW = immersive
      ? vw
      : Math.max(280, Math.floor(app.canvas.clientWidth || root.clientWidth - 20 || 920))
    let nextH: number
    if (immersive) {
      nextH = Math.max(280, vh)
    } else {
      const baseH = vw <= 720 ? 185 : TANK_HEIGHT
      nextH = Math.max(150, Math.min(baseH, Math.floor(vh * 0.3)))
    }
    const nextDpr = Math.min(2, window.devicePixelRatio || 1)
    if (nextW === cssWidth && nextH === cssHeight && nextDpr === dpr) return
    cssWidth = nextW
    cssHeight = nextH
    dpr = nextDpr
    // Scale up the logical coordinate space in immersive mode (~1.4x..2.2x)
    zoom = immersive ? Math.min(2.2, Math.max(1.35, cssHeight / 340)) : 1
    logicalWidth = cssWidth / zoom
    logicalHeight = cssHeight / zoom
    app.canvas.style.height = `${cssHeight}px`
    app.canvas.width = Math.round(cssWidth * dpr)
    app.canvas.height = Math.round(cssHeight * dpr)
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Auto-dim floating HUD in immersive mode after 3s of pointer inactivity
  let hudIdleTimer = 0
  const wakeHud = () => {
    document.documentElement.dataset.hudIdle = 'off'
    if (hudIdleTimer) window.clearTimeout(hudIdleTimer)
    if (app.isImmersive()) {
      hudIdleTimer = window.setTimeout(() => {
        if (app.isImmersive()) {
          document.documentElement.dataset.hudIdle = 'on'
        }
      }, 3000)
    }
  }
  window.addEventListener('pointermove', wakeHud, { passive: true })
  window.addEventListener('pointerdown', wakeHud, { passive: true })

  // Drag-and-drop decorations along the bottom of the tank
  let draggingDecorId: DecorId | null = null

  const canvasCoords = (event: PointerEvent): { x: number; y: number } => {
    const rect = app.canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    }
  }

  app.canvas.addEventListener('pointerdown', (event) => {
    const pt = canvasCoords(event)

    // 1. Click a fish to startle it and make it dart away
    const fishUid = scene.hitFish(pt.x, pt.y)
    if (fishUid) {
      if (scene.scareFish(fishUid, pt.x, pt.y, logicalWidth, logicalHeight)) {
        sound.play('scare')
      }
      return
    }

    // 2. Click/drag a decoration
    const hit = scene.hitDecor(pt.x, pt.y, logicalHeight)
    if (hit) {
      draggingDecorId = hit
      scene.activeDecorId = hit
      if (logicalWidth > 0) {
        const existing = state.placedDecor?.find((d) => d.id === hit)
        if (existing) moveDecor(state, hit, existing.x)
      }
      app.canvas.style.cursor = 'grabbing'
      try {
        app.canvas.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
      return
    }

    // 3. Click empty tank water to drop a single food pellet
    scene.spawnFood(pt.x, pt.y, logicalWidth, logicalHeight)
    sound.play('feed')
  })

  app.canvas.addEventListener('pointermove', (event) => {
    const pt = canvasCoords(event)
    if (draggingDecorId && logicalWidth > 0) {
      moveDecor(state, draggingDecorId, pt.x / logicalWidth)
      scene.activeDecorId = draggingDecorId
      app.canvas.style.cursor = 'grabbing'
      return
    }
    const fishHit = scene.hitFish(pt.x, pt.y)
    if (fishHit) {
      scene.activeDecorId = null
      app.canvas.style.cursor = 'pointer'
      return
    }
    const hover = scene.hitDecor(pt.x, pt.y, logicalHeight)
    scene.activeDecorId = hover
    app.canvas.style.cursor = hover ? 'grab' : 'pointer'
  })

  const endDrag = (event: PointerEvent) => {
    if (!draggingDecorId) return
    draggingDecorId = null
    save(state)
    const pt = canvasCoords(event)
    const hover = scene.hitDecor(pt.x, pt.y, logicalHeight)
    scene.activeDecorId = hover
    app.canvas.style.cursor = hover ? 'grab' : 'default'
    try {
      app.canvas.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
  }

  app.canvas.addEventListener('pointerup', endDrag)
  app.canvas.addEventListener('pointercancel', endDrag)
  app.canvas.addEventListener('pointerleave', () => {
    if (!draggingDecorId) {
      scene.activeDecorId = null
      app.canvas.style.cursor = 'default'
    }
  })

  const startMs = performance.now()
  let lastMs = startMs

  const frame = (nowMs: number) => {
    resizeCanvas()
    const dt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000))
    lastMs = nowMs
    const elapsed = (nowMs - startMs) / 1000
    const wallNow = Date.now()
    night = resolveDarkMode(state.colorMode ?? 'auto')

    scene.sync(state, species, logicalWidth, logicalHeight, wallNow)
    scene.update(dt, logicalWidth, logicalHeight, elapsed, () => sound.play('eat'))

    ctx.save()
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)
    renderer.scene(ctx, scene.view(logicalWidth, logicalHeight, elapsed, night))
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

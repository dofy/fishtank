import type { ColorMode } from '../core/types'

export interface SceneColors {
  waterTop: string
  waterBottom: string
  sand: string
  ink: string
  accent: string
  /** Drawn behind the fish: plants, rocks, bubbles. */
  decor: string
}

/**
 * A theme is a folder under public/themes/<id>/ holding a manifest, a CSS
 * variable block and optional PNG overrides. Swapping the art direction of
 * this game means editing that folder, never this source tree.
 */
export interface ThemeManifest {
  id: string
  name: string
  /** Which built-in renderer draws the tank. */
  renderer: 'realistic' | 'lcd'
  /** Nearest-neighbour upscaling and crisp UI edges. */
  pixelated: boolean
  /** Dot pitch in CSS pixels. Only the lcd renderer reads it. */
  cell?: number
  /** CSS custom properties applied to :root in dark/night mode. */
  palette: Record<string, string>
  /** Optional CSS custom properties applied to :root in light/day mode. */
  lightPalette?: Record<string, string>
  /** Scene colours consumed by the canvas renderers in dark/night mode. */
  scene: SceneColors
  /** Optional scene colours consumed by the canvas renderers in light/day mode. */
  lightScene?: SceneColors
  /** Relative directory holding optional per-species PNG overrides. */
  spriteDir?: string
}

const cache = new Map<string, ThemeManifest>()

export async function loadTheme(id: string): Promise<ThemeManifest> {
  const hit = cache.get(id)
  if (hit) return hit
  const res = await fetch(`themes/${id}/manifest.json`)
  if (!res.ok) throw new Error(`theme ${id} not found (${res.status})`)
  const manifest = (await res.json()) as ThemeManifest
  cache.set(id, manifest)
  return manifest
}

export function resolveDarkMode(mode: ColorMode = 'auto'): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    if (mq.matches) return true
    const mqLight = window.matchMedia('(prefers-color-scheme: light)')
    if (mqLight.matches) return false
  }
  const hour = new Date().getHours()
  return hour < 6 || hour >= 19
}

export function sceneColorsFor(manifest: ThemeManifest, night: boolean): SceneColors {
  if (!night && manifest.lightScene) return manifest.lightScene
  return manifest.scene
}

export function applyTheme(manifest: ThemeManifest, night = true): void {
  const root = document.documentElement
  const palette = !night && manifest.lightPalette ? manifest.lightPalette : manifest.palette
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key.startsWith('--') ? key : `--${key}`, value)
  }
  root.dataset.theme = manifest.id
  root.dataset.mode = night ? 'dark' : 'light'
  root.dataset.pixelated = manifest.pixelated ? 'on' : 'off'
}

/**
 * Per-species art overrides. A PNG dropped at
 * public/themes/<id>/sprites/<speciesId>.png replaces the procedural body
 * with no code change; a missing file silently keeps the procedural draw.
 */
const sprites = new Map<string, HTMLImageElement | null>()
const listeners = new Set<() => void>()

export function onSpriteLoad(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function spriteFor(manifest: ThemeManifest, speciesId: string): HTMLImageElement | null {
  if (!manifest.spriteDir) return null
  const key = `${manifest.id}/${speciesId}`
  const hit = sprites.get(key)
  if (hit !== undefined) return hit

  sprites.set(key, null)
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    sprites.set(key, img)
    for (const fn of listeners) fn()
  }
  img.onerror = () => sprites.set(key, null)
  img.src = `themes/${manifest.id}/${manifest.spriteDir}${speciesId}.png`
  return null
}

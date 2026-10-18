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
  /** CSS custom properties applied to :root. */
  palette: Record<string, string>
  /** Scene colours consumed by the canvas renderers. */
  scene: {
    waterTop: string
    waterBottom: string
    sand: string
    ink: string
    accent: string
    /** Drawn behind the fish: plants, rocks, bubbles. */
    decor: string
  }
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

export function applyTheme(manifest: ThemeManifest): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(manifest.palette)) {
    root.style.setProperty(key.startsWith('--') ? key : `--${key}`, value)
  }
  root.dataset.theme = manifest.id
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

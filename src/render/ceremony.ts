import { sceneColorsFor, type ThemeManifest } from './theme'

const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Ceremony overlay uses the same palette and dot grid as the aquarium theme. */
export function drawCeremonyLight(
  ctx: CanvasRenderingContext2D, manifest: ThemeManifest, night: boolean,
  kind: 'breed' | 'merge', progress: number, width: number, height: number,
): void {
  const p = Math.min(1, Math.max(0, progress))
  const cx = width * 0.5, cy = height * 0.44, radius = 14 + p * 72
  ctx.save()
  if (manifest.renderer === 'lcd') {
    const cell = Math.max(2, manifest.cell ?? 4)
    const flash = p > 0.78 ? (p - 0.78) / 0.22 * 0.85 : 0
    const core = 0.25 + p * 0.7, halo = 0.2 + p * 0.5
    ctx.fillStyle = sceneColorsFor(manifest, night).ink
    // Opaque cells and spatial dithering keep the LCD palette and grid intact.
    // Only visit the core until the final panel-wide flash starts.
    const left = flash ? cell : Math.max(cell, Math.floor((cx - radius) / cell) * cell)
    const right = flash ? width - cell : Math.min(width - cell, cx + radius)
    const top = flash ? cell : Math.max(cell, Math.floor((cy - radius) / cell) * cell)
    const bottom = flash ? height - cell : Math.min(height - cell, cy + radius)
    for (let y = top; y < bottom; y += cell) for (let x = left; x < right; x += cell) {
      const distance = Math.hypot(x + cell / 2 - cx, y + cell / 2 - cy) / radius
      const density = distance < 0.5 ? core + (halo - core) * distance * 2 : Math.max(0, halo * (2 - distance * 2))
      const threshold = (DITHER[(y / cell % 4) * 4 + x / cell % 4]! + 0.5) / 16
      if (Math.max(density, flash) > threshold) ctx.fillRect(x, y, cell - 1, cell - 1)
    }
  } else {
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius)
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.25 + p * 0.7})`)
    grad.addColorStop(0.5, kind === 'breed' ? `rgba(244, 114, 182, ${0.2 + p * 0.5})` : `rgba(56, 189, 248, ${0.2 + p * 0.5})`)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    if (p > 0.78) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(p - 0.78) / 0.22 * 0.85})`
      ctx.fillRect(0, 0, width, height)
    }
  }
  ctx.restore()
}

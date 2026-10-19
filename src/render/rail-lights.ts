import { railBeadBrightness, syncRailLightConfig } from '../core/lighting'
import type { SceneView } from './scene'
import { lampPositions } from './theme'

const BEAD_COLORS = ['#fb7185', '#fbbf24', '#d9f99d', '#6ee7b7', '#67e8f9', '#93c5fd', '#c4b5fd']

export function drawRailBeads(
  ctx: CanvasRenderingContext2D, view: SceneView, pixel?: { cell: number; ink: string },
): void {
  if (!view.night) return
  const config = view.railLights ?? syncRailLightConfig()
  const count = Math.max(6, Math.min(40, Math.floor((view.width - 32) / 24)))
  const lamps = lampPositions(view.width)
  ctx.save()
  for (let i = 0; i < count; i++) {
    const x = 17 + i * (view.width - 34) / (count - 1)
    // Leave the existing lamp hoods clear; the beads sit inside the rail itself.
    if (lamps.some(lx => Math.abs(lx - x) < Math.max(19, (pixel?.cell ?? 0) * 4))) continue
    const brightness = railBeadBrightness(view.time, i, config, view.reducedMotion)
    ctx.globalAlpha = brightness
    if (pixel) {
      ctx.fillStyle = pixel.ink
      ctx.fillRect(Math.round(x / pixel.cell) * pixel.cell, pixel.cell, pixel.cell - 1, pixel.cell - 1)
    } else {
      const color = BEAD_COLORS[i % BEAD_COLORS.length]!
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = brightness * 3
      ctx.beginPath()
      ctx.arc(x, 3.5, 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

import type { BodyShape } from '../core/types'

/**
 * Geometry shared by every renderer: one Path2D per fish, drawn in a local
 * space that spans x = 0..len and y = -h/2..h/2, facing +x.
 */
export function fishPath(body: BodyShape, len: number): { path: Path2D; height: number } {
  const h = len * body.depth
  const tail = len * body.tail
  const nose = len - tail
  const path = new Path2D()

  // Body: a lens from the snout to the caudal peduncle.
  path.moveTo(nose, 0)
  path.quadraticCurveTo(nose * 0.55, -h / 2, tail * 0.6, -h * 0.22)
  path.quadraticCurveTo(tail * 0.15, 0, tail * 0.6, h * 0.22)
  path.quadraticCurveTo(nose * 0.55, h / 2, nose, 0)
  path.closePath()

  // Caudal fin.
  const fin = new Path2D()
  fin.moveTo(tail * 0.62, 0)
  fin.lineTo(0, -h * 0.5)
  fin.lineTo(tail * 0.35, 0)
  fin.lineTo(0, h * 0.5)
  fin.closePath()
  path.addPath(fin)

  // Dorsal fin.
  if (body.dorsal > 0.05) {
    const d = new Path2D()
    const peak = h * 0.5 * (0.4 + body.dorsal)
    d.moveTo(nose * 0.75, -h * 0.3)
    d.quadraticCurveTo(nose * 0.5, -peak, tail * 0.8, -h * 0.26)
    d.closePath()
    path.addPath(d)
  }

  return { path, height: h }
}

/** Eye position in the same local space. */
export function eyeAt(body: BodyShape, len: number): { x: number; y: number; r: number } {
  const h = len * body.depth
  const nose = len - len * body.tail
  return { x: nose * 0.82, y: -h * 0.12, r: Math.max(1, len * 0.055) }
}

/** Pattern stripes as local-space rectangles, for either renderer to use. */
export function patternBands(body: BodyShape, len: number): { x: number; w: number }[] {
  const tail = len * body.tail
  const span = len - tail
  switch (body.pattern) {
    case 'stripes':
      return [0.3, 0.5, 0.7].map((t) => ({ x: tail + span * t, w: Math.max(1, len * 0.05) }))
    case 'bands':
      return [0.25, 0.6].map((t) => ({ x: tail + span * t, w: Math.max(2, len * 0.12) }))
    default:
      return []
  }
}

/** Deterministic spot layout, so a species looks the same every frame. */
export function patternSpots(
  body: BodyShape,
  len: number,
  seed: number,
): { x: number; y: number; r: number }[] {
  if (body.pattern !== 'spots') return []
  const h = len * body.depth
  const tail = len * body.tail
  const out: { x: number; y: number; r: number }[] = []
  let s = seed || 1
  for (let i = 0; i < 6; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const fx = ((s >> 7) % 1000) / 1000
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const fy = ((s >> 7) % 1000) / 1000
    out.push({
      x: tail + (len - tail) * (0.2 + fx * 0.7),
      y: (fy - 0.5) * h * 0.55,
      r: Math.max(1, len * 0.045),
    })
  }
  return out
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

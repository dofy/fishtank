import type { BodyShape, DecorId } from '../core/types'

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

export interface DecorLayer {
  path: Path2D
  role: 'primary' | 'secondary' | 'detail'
}

/**
 * Procedural decoration geometry in local space:
 * origin (0, 0) is bottom-center on the sand floor, x spans [-w/2, w/2], y spans [-h, 0].
 */
export function decorLayers(id: DecorId, w: number, h: number, time = 0): DecorLayer[] {
  const primary = new Path2D()
  const secondary = new Path2D()
  const detail = new Path2D()
  const sway = Math.sin(time * 1.4) * (w * 0.08)

  switch (id) {
    case 'kelp': {
      const blades = [
        { ox: -w * 0.24, tall: h * 0.82, bw: w * 0.13, phase: 0 },
        { ox: 0, tall: h * 0.98, bw: w * 0.15, phase: 1.1 },
        { ox: w * 0.24, tall: h * 0.74, bw: w * 0.12, phase: 2.2 },
      ]
      for (const [idx, b] of blades.entries()) {
        const target = idx === 1 ? primary : secondary
        const s = Math.sin(time * 1.5 + b.phase) * (w * 0.1)
        target.moveTo(b.ox - b.bw / 2, 0)
        target.quadraticCurveTo(b.ox - s * 0.6, -b.tall * 0.5, b.ox + s, -b.tall)
        target.quadraticCurveTo(b.ox + b.bw - s * 0.4, -b.tall * 0.5, b.ox + b.bw / 2, 0)
        target.closePath()
      }
      break
    }

    case 'rocks': {
      secondary.ellipse(-w * 0.2, -h * 0.34, w * 0.28, h * 0.34, -0.1, 0, Math.PI * 2)
      secondary.ellipse(w * 0.24, -h * 0.28, w * 0.24, h * 0.28, 0.12, 0, Math.PI * 2)
      primary.ellipse(0, -h * 0.46, w * 0.32, h * 0.46, 0, 0, Math.PI * 2)
      detail.ellipse(-w * 0.06, -h * 0.62, w * 0.14, h * 0.12, -0.2, 0, Math.PI * 2)
      break
    }

    case 'shell': {
      // Lower valve
      secondary.ellipse(0, -h * 0.22, w * 0.44, h * 0.22, 0, 0, Math.PI * 2)
      // Upper open fan valve
      primary.moveTo(-w * 0.44, -h * 0.24)
      primary.quadraticCurveTo(0, -h * 1.05, w * 0.44, -h * 0.24)
      primary.quadraticCurveTo(0, -h * 0.38, -w * 0.44, -h * 0.24)
      primary.closePath()
      // Pearl inside
      detail.arc(0, -h * 0.32, Math.min(w, h) * 0.16, 0, Math.PI * 2)
      break
    }

    case 'coral': {
      // Base rock
      secondary.ellipse(0, -h * 0.14, w * 0.32, h * 0.14, 0, 0, Math.PI * 2)
      // Branches
      const branches = [
        { x0: 0, y0: -h * 0.12, x1: 0, y1: -h * 0.92, r: w * 0.09 },
        { x0: 0, y0: -h * 0.35, x1: -w * 0.34, y1: -h * 0.78, r: w * 0.08 },
        { x0: 0, y0: -h * 0.42, x1: w * 0.34, y1: -h * 0.82, r: w * 0.08 },
        { x0: -w * 0.18, y0: -h * 0.56, x1: -w * 0.38, y1: -h * 0.48, r: w * 0.06 },
        { x0: w * 0.18, y0: -h * 0.62, x1: w * 0.38, y1: -h * 0.54, r: w * 0.06 },
      ]
      for (const b of branches) {
        addCapsule(primary, b.x0, b.y0, b.x1, b.y1, b.r)
        detail.moveTo(b.x1 + b.r * 0.6, b.y1)
        detail.arc(b.x1, b.y1, b.r * 0.6, 0, Math.PI * 2)
      }
      break
    }

    case 'starfish': {
      // Stone mound
      secondary.ellipse(0, -h * 0.36, w * 0.44, h * 0.36, 0, 0, Math.PI * 2)
      // 5-pointed starfish on the stone
      const cx = 0
      const cy = -h * 0.46
      const outer = Math.min(w, h) * 0.42
      const inner = outer * 0.42
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 === 0 ? outer : inner
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
        if (i === 0) primary.moveTo(px, py)
        else primary.lineTo(px, py)
      }
      primary.closePath()
      detail.arc(cx, cy, inner * 0.45, 0, Math.PI * 2)
      break
    }

    case 'driftwood': {
      // Arching gnarled root
      primary.moveTo(-w * 0.46, 0)
      primary.quadraticCurveTo(-w * 0.1, -h * 0.96, w * 0.45, -h * 0.58)
      primary.lineTo(w * 0.38, -h * 0.4)
      primary.quadraticCurveTo(0, -h * 0.62, -w * 0.26, 0)
      primary.closePath()

      secondary.moveTo(w * 0.05, -h * 0.5)
      secondary.quadraticCurveTo(w * 0.25, -h * 0.22, w * 0.42, 0)
      secondary.lineTo(w * 0.24, 0)
      secondary.quadraticCurveTo(w * 0.1, -h * 0.2, -w * 0.04, -h * 0.44)
      secondary.closePath()

      // Moss patches
      detail.ellipse(-w * 0.08, -h * 0.68, w * 0.14, h * 0.09, -0.2, 0, Math.PI * 2)
      detail.ellipse(w * 0.22, -h * 0.58, w * 0.11, h * 0.08, 0.2, 0, Math.PI * 2)
      break
    }

    case 'anemone': {
      // Basal foot
      secondary.ellipse(0, -h * 0.2, w * 0.34, h * 0.2, 0, 0, Math.PI * 2)
      // Tentacles
      for (let i = -3; i <= 3; i++) {
        const tx = i * (w * 0.09)
        const tipX = tx * 1.35 + sway * 0.7
        const tipY = -h * (0.88 - Math.abs(i) * 0.06)
        addCapsule(primary, tx * 0.6, -h * 0.28, tipX, tipY, w * 0.048)
        detail.moveTo(tipX + w * 0.045, tipY)
        detail.arc(tipX, tipY, w * 0.045, 0, Math.PI * 2)
      }
      break
    }

    case 'arch': {
      // Outer arch
      primary.moveTo(-w * 0.46, 0)
      primary.lineTo(-w * 0.42, -h * 0.62)
      primary.quadraticCurveTo(0, -h * 1.08, w * 0.42, -h * 0.62)
      primary.lineTo(w * 0.46, 0)
      primary.lineTo(w * 0.22, 0)
      primary.lineTo(w * 0.2, -h * 0.48)
      primary.quadraticCurveTo(0, -h * 0.72, -w * 0.2, -h * 0.48)
      primary.lineTo(-w * 0.22, 0)
      primary.closePath()
      // Keystone & base stones
      secondary.rect(-w * 0.48, -h * 0.14, w * 0.28, h * 0.14)
      secondary.rect(w * 0.2, -h * 0.14, w * 0.28, h * 0.14)
      detail.rect(-w * 0.09, -h * 0.9, w * 0.18, h * 0.18)
      break
    }

    case 'chest': {
      // Chest box
      primary.rect(-w * 0.4, -h * 0.56, w * 0.8, h * 0.56)
      // Domed lid
      secondary.moveTo(-w * 0.42, -h * 0.56)
      secondary.quadraticCurveTo(0, -h * 1.02, w * 0.42, -h * 0.56)
      secondary.closePath()
      // Gold trim & lock
      detail.rect(-w * 0.42, -h * 0.6, w * 0.84, h * 0.09)
      detail.rect(-w * 0.09, -h * 0.66, w * 0.18, h * 0.22)
      break
    }

    case 'anchor': {
      // Shank
      addCapsule(primary, 0, -h * 0.14, 0, -h * 0.8, w * 0.065)
      // Cross stock
      addCapsule(secondary, -w * 0.26, -h * 0.66, w * 0.26, -h * 0.66, w * 0.05)
      // Flukes curve
      primary.moveTo(-w * 0.42, -h * 0.36)
      primary.quadraticCurveTo(0, 0, w * 0.42, -h * 0.36)
      primary.quadraticCurveTo(0, -h * 0.16, -w * 0.42, -h * 0.36)
      primary.closePath()
      // Top ring
      detail.arc(0, -h * 0.88, w * 0.1, 0, Math.PI * 2)
      break
    }

    case 'castle': {
      // Central keep
      primary.rect(-w * 0.24, -h * 0.68, w * 0.48, h * 0.68)
      // Side towers
      secondary.rect(-w * 0.44, -h * 0.56, w * 0.22, h * 0.56)
      secondary.rect(w * 0.22, -h * 0.56, w * 0.22, h * 0.56)
      // Turret roofs
      detail.moveTo(-w * 0.48, -h * 0.56)
      detail.lineTo(-w * 0.33, -h * 0.82)
      detail.lineTo(-w * 0.18, -h * 0.56)
      detail.closePath()

      detail.moveTo(w * 0.18, -h * 0.56)
      detail.lineTo(w * 0.33, -h * 0.82)
      detail.lineTo(w * 0.48, -h * 0.56)
      detail.closePath()

      detail.moveTo(-w * 0.26, -h * 0.68)
      detail.lineTo(0, -h * 0.98)
      detail.lineTo(w * 0.26, -h * 0.68)
      detail.closePath()
      break
    }

    case 'statue': {
      // Moai / Guardian monolith
      primary.moveTo(-w * 0.34, 0)
      primary.lineTo(-w * 0.28, -h * 0.88)
      primary.quadraticCurveTo(0, -h * 1.0, w * 0.26, -h * 0.88)
      primary.lineTo(w * 0.34, 0)
      primary.closePath()
      // Brow & nose ridge
      secondary.rect(-w * 0.26, -h * 0.74, w * 0.52, h * 0.1)
      secondary.rect(-w * 0.08, -h * 0.72, w * 0.18, h * 0.34)
      // Glowing eyes
      detail.arc(-w * 0.13, -h * 0.62, w * 0.055, 0, Math.PI * 2)
      detail.moveTo(w * 0.185, -h * 0.62)
      detail.arc(w * 0.13, -h * 0.62, w * 0.055, 0, Math.PI * 2)
      break
    }
  }

  return [
    { path: secondary, role: 'secondary' },
    { path: primary, role: 'primary' },
    { path: detail, role: 'detail' },
  ]
}

function addCapsule(
  path: Path2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * r
  const ny = (dx / len) * r
  path.moveTo(x0 + nx, y0 + ny)
  path.lineTo(x1 + nx, y1 + ny)
  path.lineTo(x1 - nx, y1 - ny)
  path.lineTo(x0 - nx, y0 - ny)
  path.closePath()
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

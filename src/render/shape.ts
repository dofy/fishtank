import type { BodyShape, DecorId } from '../core/types'

/**
 * Geometry shared by every renderer: one Path2D per creature, drawn in a local
 * space that spans x = 0..len and y = -h/2..h/2, facing +x.
 */
export function fishPath(
  body: BodyShape,
  len: number,
  animPhase = 0,
): { path: Path2D; height: number } {
  const h = len * body.depth
  const form = body.form ?? 'fish'
  const path = new Path2D()

  switch (form) {
    case 'jellyfish': {
      // Umbrella bell dome + scalloped rim + trailing tentacles with pulsing motion
      const pulse = animPhase ? Math.sin(animPhase * 2.2) : 0
      const cx = len * 0.5
      const domeTop = -h * (0.48 + pulse * 0.05)
      const rimY = -h * 0.02
      const rx = len * (0.36 - pulse * 0.04)
      path.moveTo(cx - rx, rimY)
      path.bezierCurveTo(cx - rx, domeTop, cx + rx, domeTop, cx + rx, rimY)
      const lobes = 4
      const lobeW = (rx * 2) / lobes
      for (let i = lobes - 1; i >= 0; i--) {
        const x1 = cx - rx + (i + 0.5) * lobeW
        const x0 = cx - rx + i * lobeW
        path.quadraticCurveTo(x1, rimY + h * 0.09, x0, rimY)
      }
      path.closePath()

      const tentacleOffsets = [-0.65, -0.22, 0.22, 0.65]
      const wave = animPhase ? Math.sin(animPhase * 2.2 - 0.8) * (len * 0.06) : 0
      for (const [idx, off] of tentacleOffsets.entries()) {
        const tx = cx + off * rx * 0.8
        const sway = (idx % 2 === 0 ? len * 0.05 : -len * 0.05) + wave
        const endY = h * (0.45 + pulse * 0.05)
        addCapsule(path, tx, rimY + h * 0.02, tx + sway, h * 0.22, Math.max(1.2, len * 0.026))
        addCapsule(
          path,
          tx + sway,
          h * 0.22,
          tx - sway * 0.6 + wave * 0.5,
          endY,
          Math.max(1, len * 0.022),
        )
      }
      return { path, height: h }
    }

    case 'seahorse': {
      const cx = len * 0.48
      const flutter = animPhase ? Math.sin(animPhase * 7.5) * (h * 0.04) : 0
      // Head & coronet
      path.ellipse(cx + len * 0.04, -h * 0.3, len * 0.13, h * 0.12, -0.15, 0, Math.PI * 2)
      // Tubular snout facing +x
      addCapsule(
        path,
        cx + len * 0.1,
        -h * 0.29,
        cx + len * 0.29,
        -h * 0.26,
        Math.max(1.5, h * 0.048),
      )
      // Arching neck & plump belly
      path.moveTo(cx - len * 0.04, -h * 0.24)
      path.quadraticCurveTo(cx + len * 0.22, -h * 0.04, cx + len * 0.04, h * 0.18)
      path.quadraticCurveTo(cx - len * 0.16, h * 0.02, cx - len * 0.04, -h * 0.24)
      path.closePath()
      // Fluttering dorsal fin on the back
      const fin = new Path2D()
      fin.moveTo(cx - len * 0.08, -h * 0.08)
      fin.lineTo(cx - len * 0.23, -h * 0.15 + flutter)
      fin.lineTo(cx - len * 0.21, h * 0.05 + flutter)
      fin.lineTo(cx - len * 0.07, h * 0.06)
      fin.closePath()
      path.addPath(fin)
      // Curled prehensile tail
      addCapsule(path, cx, h * 0.14, cx - len * 0.1, h * 0.36, Math.max(1.4, len * 0.042))
      addCapsule(
        path,
        cx - len * 0.1,
        h * 0.36,
        cx + len * 0.06,
        h * 0.44,
        Math.max(1.2, len * 0.032),
      )
      addCapsule(
        path,
        cx + len * 0.06,
        h * 0.44,
        cx + len * 0.11,
        h * 0.31,
        Math.max(1, len * 0.024),
      )
      return { path, height: h }
    }

    case 'eel':
    case 'seasnake': {
      const segs = 14
      const waves = form === 'seasnake' ? 2.3 : 1.7
      const amp = h * (form === 'seasnake' ? 0.28 : 0.22)
      const baseThick = h * (form === 'seasnake' ? 0.15 : 0.2)
      const travel = animPhase * 3.8

      for (let i = 0; i < segs; i++) {
        const t0 = i / segs
        const t1 = (i + 1) / segs
        const x0 = len * (0.06 + t0 * 0.88)
        const x1 = len * (0.06 + t1 * 0.88)
        const y0 = Math.sin(t0 * Math.PI * waves + travel) * amp
        const y1 = Math.sin(t1 * Math.PI * waves + travel) * amp
        const r = Math.max(1.3, baseThick * (0.38 + 0.62 * Math.sin(t0 * Math.PI)))
        addCapsule(path, x0, y0, x1, y1, r)
      }
      // Ribbon dorsal crest for electric/ribbon eel
      if (form === 'eel') {
        for (let i = 2; i < segs - 1; i++) {
          const t0 = i / segs
          const t1 = (i + 1) / segs
          const x0 = len * (0.06 + t0 * 0.88)
          const x1 = len * (0.06 + t1 * 0.88)
          const y0 = Math.sin(t0 * Math.PI * waves + travel) * amp - baseThick * 0.9
          const y1 = Math.sin(t1 * Math.PI * waves + travel) * amp - baseThick * 0.9
          addCapsule(path, x0, y0, x1, y1, Math.max(1, baseThick * 0.45))
        }
      } else {
        // Paddle tail for sea snake
        const tailY = Math.sin(travel) * amp
        path.ellipse(len * 0.08, tailY, len * 0.06, baseThick * 1.1, 0, 0, Math.PI * 2)
      }
      return { path, height: h }
    }

    case 'ray': {
      const tailLen = len * 0.34
      const discStart = tailLen
      const nose = len * 0.95
      const midX = discStart + (nose - discStart) * 0.48
      const flap = animPhase ? Math.sin(animPhase * 2.6) * (h * 0.08) : 0
      // Diamond pectoral wings
      path.moveTo(nose, 0)
      path.quadraticCurveTo(
        midX + len * 0.1,
        -h * 0.48 + flap,
        midX - len * 0.06,
        -h * 0.48 + flap,
      )
      path.quadraticCurveTo(discStart + len * 0.04, -h * 0.16, discStart, 0)
      path.quadraticCurveTo(
        discStart + len * 0.04,
        h * 0.16,
        midX - len * 0.06,
        h * 0.48 - flap,
      )
      path.quadraticCurveTo(midX + len * 0.1, h * 0.48 - flap, nose, 0)
      path.closePath()
      // Whip tail
      addCapsule(path, discStart + len * 0.04, 0, len * 0.03, flap * 0.4, Math.max(1.2, h * 0.035))
      return { path, height: h }
    }

    case 'turtle': {
      const stroke = animPhase ? Math.sin(animPhase * 2.8) * 0.25 : 0
      // Domed carapace shell
      path.ellipse(len * 0.46, -h * 0.03, len * 0.3, h * 0.32, 0, 0, Math.PI * 2)
      // Head extending forward
      path.ellipse(len * 0.83, -h * 0.05, len * 0.11, h * 0.13, -0.1, 0, Math.PI * 2)
      // Front flippers
      path.ellipse(len * 0.62, -h * 0.34, len * 0.16, h * 0.08, -0.55 + stroke, 0, Math.PI * 2)
      path.ellipse(len * 0.62, h * 0.3, len * 0.16, h * 0.08, 0.55 - stroke, 0, Math.PI * 2)
      // Rear flippers
      path.ellipse(len * 0.22, -h * 0.24, len * 0.11, h * 0.06, 0.45, 0, Math.PI * 2)
      path.ellipse(len * 0.22, h * 0.2, len * 0.11, h * 0.06, -0.45, 0, Math.PI * 2)
      return { path, height: h }
    }

    case 'fish':
    default: {
      // Shift by +tail/2 so the drawn silhouette [0..nose] is horizontally centered at len/2
      const tail = len * body.tail
      const ox = tail * 0.5
      const nose = ox + (len - tail)
      const wag = animPhase ? Math.sin(animPhase * 4.5) * (h * 0.08) : 0

      // Body: a lens from the snout to the caudal peduncle.
      path.moveTo(nose, 0)
      path.quadraticCurveTo(ox + (len - tail) * 0.55, -h / 2, ox + tail * 0.6, -h * 0.22)
      path.quadraticCurveTo(ox + tail * 0.15, 0, ox + tail * 0.6, h * 0.22)
      path.quadraticCurveTo(ox + (len - tail) * 0.55, h / 2, nose, 0)
      path.closePath()

      // Caudal fin.
      const fin = new Path2D()
      fin.moveTo(ox + tail * 0.62, 0)
      fin.lineTo(ox, -h * 0.5 + wag)
      fin.lineTo(ox + tail * 0.35, wag * 0.5)
      fin.lineTo(ox, h * 0.5 + wag)
      fin.closePath()
      path.addPath(fin)

      // Dorsal fin.
      if (body.dorsal > 0.05) {
        const d = new Path2D()
        const peak = h * 0.5 * (0.4 + body.dorsal)
        d.moveTo(ox + (len - tail) * 0.75, -h * 0.3)
        d.quadraticCurveTo(ox + (len - tail) * 0.5, -peak, ox + tail * 0.8, -h * 0.26)
        d.closePath()
        path.addPath(d)
      }

      return { path, height: h }
    }
  }
}

/** Eye position in the same local space. */
export function eyeAt(
  body: BodyShape,
  len: number,
  animPhase = 0,
): { x: number; y: number; r: number } {
  const h = len * body.depth
  const form = body.form ?? 'fish'
  switch (form) {
    case 'jellyfish':
      return { x: len * 0.58, y: -h * 0.18, r: Math.max(1, len * 0.045) }
    case 'seahorse':
      return { x: len * 0.53, y: -h * 0.31, r: Math.max(1, len * 0.048) }
    case 'eel':
    case 'seasnake': {
      const waves = form === 'seasnake' ? 2.3 : 1.7
      const amp = h * (form === 'seasnake' ? 0.28 : 0.22)
      const headY = Math.sin(0.92 * Math.PI * waves + animPhase * 3.8) * amp
      return { x: len * 0.88, y: headY - h * 0.04, r: Math.max(1, len * 0.042) }
    }
    case 'ray':
      return { x: len * 0.78, y: -h * 0.11, r: Math.max(1, len * 0.046) }
    case 'turtle':
      return { x: len * 0.88, y: -h * 0.08, r: Math.max(1, len * 0.045) }
    case 'fish':
    default: {
      const tail = len * body.tail
      const ox = tail * 0.5
      const span = len - tail
      return { x: ox + span * 0.82, y: -h * 0.12, r: Math.max(1, len * 0.055) }
    }
  }
}

/** Pattern stripes as local-space rectangles, for either renderer to use. */
export function patternBands(body: BodyShape, len: number): { x: number; w: number }[] {
  const tail = len * body.tail
  const ox = (body.form ?? 'fish') === 'fish' ? tail * 0.5 : 0
  const span = len - tail
  switch (body.pattern) {
    case 'stripes':
      return [0.3, 0.5, 0.7].map((t) => ({ x: ox + tail + span * t * 0.8, w: Math.max(1, len * 0.05) }))
    case 'bands':
      return [0.25, 0.6].map((t) => ({ x: ox + tail + span * t * 0.8, w: Math.max(2, len * 0.12) }))
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
  const ox = (body.form ?? 'fish') === 'fish' ? tail * 0.5 : 0
  const out: { x: number; y: number; r: number }[] = []
  let s = seed || 1
  for (let i = 0; i < 6; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const fx = ((s >> 7) % 1000) / 1000
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const fy = ((s >> 7) % 1000) / 1000
    out.push({
      x: ox + tail * 0.6 + (len - tail) * (0.15 + fx * 0.7),
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
      // Dramatic height contrast: towering main kelp frond + medium & short shoots
      const blades = [
        { ox: -w * 0.3, tall: h * 0.42, bw: w * 0.1, lean: -w * 0.08, phase: 0 },
        { ox: -w * 0.08, tall: h * 1.0, bw: w * 0.16, lean: w * 0.16, phase: 0.9 },
        { ox: w * 0.12, tall: h * 0.68, bw: w * 0.13, lean: w * 0.18, phase: 1.8 },
        { ox: w * 0.28, tall: h * 0.28, bw: w * 0.09, lean: w * 0.08, phase: 2.7 },
      ]
      for (const [idx, b] of blades.entries()) {
        const target = idx === 1 || idx === 2 ? primary : secondary
        const s = b.lean + Math.sin(time * 1.5 + b.phase) * (w * 0.09)
        target.moveTo(b.ox - b.bw / 2, 0)
        target.quadraticCurveTo(b.ox + s * 0.35, -b.tall * 0.52, b.ox + s, -b.tall)
        target.quadraticCurveTo(b.ox + b.bw + s * 0.45, -b.tall * 0.48, b.ox + b.bw / 2, 0)
        target.closePath()
      }
      // Small pebble at base on the left
      detail.ellipse(-w * 0.22, -h * 0.07, w * 0.12, h * 0.07, -0.15, 0, Math.PI * 2)
      break
    }

    case 'rocks': {
      // Asymmetric stacked reef boulders: tall craggy rock on left, flat stepping stones on right
      secondary.ellipse(w * 0.2, -h * 0.24, w * 0.26, h * 0.24, 0.18, 0, Math.PI * 2)
      secondary.ellipse(-w * 0.28, -h * 0.22, w * 0.18, h * 0.22, -0.22, 0, Math.PI * 2)
      primary.ellipse(-w * 0.08, -h * 0.48, w * 0.28, h * 0.48, -0.14, 0, Math.PI * 2)
      detail.ellipse(-w * 0.14, -h * 0.68, w * 0.12, h * 0.1, -0.28, 0, Math.PI * 2)
      detail.moveTo(w * 0.28, -h * 0.32)
      detail.ellipse(w * 0.2, -h * 0.32, w * 0.09, h * 0.06, 0.15, 0, Math.PI * 2)
      break
    }

    case 'shell': {
      // Side-hinged giant clam (hinge on the left, opens toward the right)
      const cycle = time % 9
      const open =
        time === 0
          ? 0.9
          : cycle < 1.2
            ? Math.sin((cycle / 1.2) * (Math.PI / 2))
            : cycle < 3.6
              ? 1
              : cycle < 4.4
                ? Math.cos(((cycle - 3.6) / 0.8) * (Math.PI / 2))
                : 0.08
      // Lower valve tilted slightly
      secondary.ellipse(w * 0.03, -h * 0.2, w * 0.43, h * 0.2, 0.08, 0, Math.PI * 2)
      // Upper valve hinged at left (-w * 0.38, -h * 0.22), swinging open to the right
      const tipX = w * (0.42 - open * 0.12)
      const tipY = -h * (0.28 + open * 0.56)
      const crestX = -w * 0.08
      const crestY = -h * (0.42 + open * 0.58)
      primary.moveTo(-w * 0.38, -h * 0.22)
      primary.quadraticCurveTo(crestX, crestY, tipX, tipY)
      primary.quadraticCurveTo(w * 0.05, -h * (0.24 + open * 0.18), -w * 0.38, -h * 0.22)
      primary.closePath()
      // Off-center pearl nestled inside
      if (open > 0.2) {
        const pr = Math.min(w, h) * 0.16 * Math.min(1, (open - 0.15) * 1.3)
        detail.arc(w * 0.08, -h * 0.28, pr, 0, Math.PI * 2)
      }
      break
    }

    case 'mushroom': {
      // Extreme height contrast: one towering canopy shroom, one mid shroom, one tiny sprout
      secondary.ellipse(-w * 0.04, -h * 0.14, w * 0.38, h * 0.14, 0.08, 0, Math.PI * 2)
      const shrooms = [
        { bx: -w * 0.14, x: -w * 0.2, y: -h * 0.92, r: w * 0.26, tilt: -0.18 },
        { bx: w * 0.05, x: w * 0.14, y: -h * 0.52, r: w * 0.18, tilt: 0.22 },
        { bx: w * 0.22, x: w * 0.32, y: -h * 0.24, r: w * 0.11, tilt: 0.3 },
      ]
      for (const s of shrooms) {
        addCapsule(secondary, s.bx, -h * 0.12, s.x, s.y, s.r * 0.25)
        const dx = Math.cos(s.tilt) * s.r
        const dy = Math.sin(s.tilt) * s.r
        const nx = Math.sin(s.tilt) * s.r * 1.15
        const ny = -Math.cos(s.tilt) * s.r * 1.15
        primary.moveTo(s.x - dx, s.y - dy)
        primary.quadraticCurveTo(s.x + nx, s.y + ny, s.x + dx, s.y + dy)
        primary.closePath()
        detail.moveTo(s.x + nx * 0.35 + s.r * 0.2, s.y + ny * 0.35)
        detail.arc(s.x + nx * 0.35, s.y + ny * 0.35, s.r * 0.2, 0, Math.PI * 2)
      }
      break
    }

    case 'crystal': {
      // Asymmetric geode: towering main obelisk shard + contrasting short crystals
      secondary.ellipse(-w * 0.05, -h * 0.15, w * 0.39, h * 0.15, -0.08, 0, Math.PI * 2)
      const shards = [
        { bx: -w * 0.26, tx: -w * 0.4, ty: -h * 0.36, bw: w * 0.11 },
        { bx: -w * 0.12, tx: -w * 0.24, ty: -h * 0.68, bw: w * 0.14 },
        { bx: w * 0.04, tx: w * 0.18, ty: -h * 1.0, bw: w * 0.18 },
        { bx: w * 0.22, tx: w * 0.38, ty: -h * 0.46, bw: w * 0.12 },
      ]
      for (const [idx, sh] of shards.entries()) {
        const target = idx === 2 || idx === 0 ? primary : detail
        target.moveTo(sh.bx - sh.bw, -h * 0.1)
        target.lineTo(sh.tx - sh.bw * 0.45, sh.ty + h * 0.14)
        target.lineTo(sh.tx, sh.ty)
        target.lineTo(sh.tx + sh.bw * 0.45, sh.ty + h * 0.1)
        target.lineTo(sh.bx + sh.bw, -h * 0.1)
        target.closePath()
      }
      break
    }

    case 'fairylights': {
      // Asymmetric double-loop swag cord (low loop on left, high loop on right)
      addCapsule(secondary, -w * 0.48, -h * 0.94, -w * 0.12, -h * 0.38, 1.5)
      addCapsule(secondary, -w * 0.12, -h * 0.38, w * 0.14, -h * 0.78, 1.5)
      addCapsule(secondary, w * 0.14, -h * 0.78, w * 0.48, -h * 0.52, 1.5)
      const bulbs = [
        { x: -w * 0.38, y: -h * 0.74 },
        { x: -w * 0.24, y: -h * 0.52 },
        { x: -w * 0.1, y: -h * 0.42 },
        { x: w * 0.04, y: -h * 0.62 },
        { x: w * 0.18, y: -h * 0.74 },
        { x: w * 0.32, y: -h * 0.64 },
        { x: w * 0.44, y: -h * 0.54 },
      ]
      for (const [i, b] of bulbs.entries()) {
        primary.rect(b.x - 2.5, b.y - 3, 5, 4)
        const pulse = 1 + Math.sin(time * 3.2 + i * 1.1) * 0.14
        const r = Math.min(w, h) * 0.14 * pulse
        detail.moveTo(b.x + r, b.y + r * 0.8)
        detail.arc(b.x, b.y + r * 0.8, r, 0, Math.PI * 2)
      }
      break
    }

    case 'starlamps': {
      // Wide height contrast cascade of 3 star pendants
      const stars = [
        { ox: -w * 0.34, drop: h * 0.34, r: h * 0.14, phase: 0 },
        { ox: -w * 0.04, drop: h * 0.9, r: h * 0.2, phase: 1.2 },
        { ox: w * 0.28, drop: h * 0.58, r: h * 0.16, phase: 2.4 },
      ]
      for (const st of stars) {
        const sx = st.ox + Math.sin(time * 1.4 + st.phase) * 3
        const sy = -h + st.drop
        addCapsule(secondary, st.ox, -h, sx, sy - st.r * 0.6, 1.2)
        const inner = st.r * 0.44
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + st.phase * 0.22 + (i * Math.PI) / 5
          const rad = i % 2 === 0 ? st.r : inner
          const px = sx + Math.cos(ang) * rad
          const py = sy + Math.sin(ang) * rad
          if (i === 0) detail.moveTo(px, py)
          else detail.lineTo(px, py)
        }
        detail.closePath()
      }
      break
    }

    case 'lanterns': {
      // Slanted festival rope with 3 differently sized & staggered lanterns
      addCapsule(secondary, -w * 0.46, -h * 0.95, w * 0.46, -h * 0.78, 1.5)
      const items = [
        { ox: -w * 0.32, cy: -h * 0.6, rx: w * 0.1, ry: h * 0.22, cordY: -h * 0.92 },
        { ox: -w * 0.02, cy: -h * 0.44, rx: w * 0.13, ry: h * 0.3, cordY: -h * 0.86 },
        { ox: w * 0.28, cy: -h * 0.38, rx: w * 0.11, ry: h * 0.25, cordY: -h * 0.81 },
      ]
      for (const [i, l] of items.entries()) {
        const sx = l.ox + Math.sin(time * 1.3 + i) * 2.5
        addCapsule(secondary, l.ox, l.cordY, sx, l.cy - l.ry, 1.3)
        primary.moveTo(sx + l.rx, l.cy)
        primary.ellipse(sx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2)
        secondary.rect(sx - l.rx * 0.55, l.cy - l.ry - 2, l.rx * 1.1, 3)
        secondary.rect(sx - l.rx * 0.5, l.cy + l.ry - 1, l.rx, 3)
        detail.moveTo(sx + l.rx * 0.55, l.cy)
        detail.ellipse(sx, l.cy, l.rx * 0.55, l.ry * 0.65, 0, 0, Math.PI * 2)
      }
      break
    }

    case 'jellylamps': {
      // Asymmetric chandelier of 3 jellyfish bells at different depths
      const bells = [
        { ox: -w * 0.32, cy: -h * 0.68, r: w * 0.11, phase: 0 },
        { ox: -w * 0.04, cy: -h * 0.42, r: w * 0.15, phase: 1.5 },
        { ox: w * 0.28, cy: -h * 0.56, r: w * 0.12, phase: 3.0 },
      ]
      for (const b of bells) {
        const sx = b.ox + Math.sin(time * 1.2 + b.phase) * 2.5
        addCapsule(secondary, b.ox, -h, sx, b.cy - b.r * 0.85, 1.2)
        primary.moveTo(sx - b.r, b.cy)
        primary.quadraticCurveTo(sx, b.cy - b.r * 1.5, sx + b.r, b.cy)
        primary.closePath()
        detail.moveTo(sx + b.r * 0.55, b.cy - b.r * 0.25)
        detail.arc(sx, b.cy - b.r * 0.25, b.r * 0.5, 0, Math.PI * 2)
        addCapsule(detail, sx - b.r * 0.4, b.cy, sx - b.r * 0.52, b.cy + h * 0.26, 1.3)
        addCapsule(detail, sx, b.cy, sx + w * 0.02, b.cy + h * 0.34, 1.3)
        addCapsule(detail, sx + b.r * 0.4, b.cy, sx + b.r * 0.52, b.cy + h * 0.24, 1.3)
      }
      break
    }

    case 'coral': {
      // Asymmetric wind-swept staghorn coral reaching toward the right
      secondary.ellipse(-w * 0.06, -h * 0.14, w * 0.32, h * 0.14, -0.1, 0, Math.PI * 2)
      const branches = [
        { x0: -w * 0.06, y0: -h * 0.12, x1: w * 0.12, y1: -h * 0.92, r: w * 0.085 },
        { x0: -w * 0.02, y0: -h * 0.34, x1: -w * 0.34, y1: -h * 0.72, r: w * 0.075 },
        { x0: w * 0.04, y0: -h * 0.48, x1: w * 0.38, y1: -h * 0.78, r: w * 0.075 },
        { x0: -w * 0.18, y0: -h * 0.52, x1: -w * 0.38, y1: -h * 0.42, r: w * 0.055 },
        { x0: w * 0.22, y0: -h * 0.64, x1: w * 0.42, y1: -h * 0.48, r: w * 0.055 },
        { x0: w * 0.06, y0: -h * 0.68, x1: -w * 0.12, y1: -h * 0.88, r: w * 0.06 },
      ]
      for (const b of branches) {
        addCapsule(primary, b.x0, b.y0, b.x1, b.y1, b.r)
        detail.moveTo(b.x1 + b.r * 0.6, b.y1)
        detail.arc(b.x1, b.y1, b.r * 0.6, 0, Math.PI * 2)
      }
      break
    }

    case 'starfish': {
      // Sloped boulder on the left with a small pebble on the right, starfish perched at a jaunty angle
      secondary.ellipse(-w * 0.06, -h * 0.38, w * 0.38, h * 0.38, -0.22, 0, Math.PI * 2)
      secondary.ellipse(w * 0.28, -h * 0.18, w * 0.16, h * 0.18, 0.2, 0, Math.PI * 2)
      const cx = -w * 0.08
      const cy = -h * 0.46
      const outer = Math.min(w, h) * 0.42
      const inner = outer * 0.42
      const rot = 0.28
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + rot + (i * Math.PI) / 5
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
      // Tilted rock crevice + anemone tentacles sweeping asymmetrically to the right
      secondary.ellipse(-w * 0.06, -h * 0.22, w * 0.34, h * 0.22, -0.18, 0, Math.PI * 2)
      const heights = [0.62, 0.78, 0.92, 0.86, 0.96, 0.74, 0.58]
      for (let i = -3; i <= 3; i++) {
        const tx = -w * 0.06 + i * (w * 0.085)
        const reach = h * (heights[i + 3] ?? 0.8)
        const tipX = tx + w * 0.12 + i * (w * 0.04) + sway * 0.75
        const tipY = -reach
        addCapsule(primary, tx * 0.7, -h * 0.26, tipX, tipY, w * 0.046)
        detail.moveTo(tipX + w * 0.045, tipY)
        detail.arc(tipX, tipY, w * 0.045, 0, Math.PI * 2)
      }
      break
    }

    case 'arch': {
      // Weathered asymmetric stone arch (taller massive pillar on left, stepped mossy blocks on right)
      primary.moveTo(-w * 0.46, 0)
      primary.lineTo(-w * 0.4, -h * 0.74)
      primary.quadraticCurveTo(-w * 0.05, -h * 1.08, w * 0.38, -h * 0.54)
      primary.lineTo(w * 0.46, 0)
      primary.lineTo(w * 0.2, 0)
      primary.lineTo(w * 0.16, -h * 0.42)
      primary.quadraticCurveTo(-w * 0.04, -h * 0.74, -w * 0.18, -h * 0.52)
      primary.lineTo(-w * 0.2, 0)
      primary.closePath()
      // Asymmetric fallen stone & moss cap
      secondary.rect(-w * 0.48, -h * 0.18, w * 0.3, h * 0.18)
      secondary.ellipse(w * 0.32, -h * 0.1, w * 0.18, h * 0.1, 0.1, 0, Math.PI * 2)
      detail.ellipse(-w * 0.12, -h * 0.86, w * 0.18, h * 0.09, -0.25, 0, Math.PI * 2)
      break
    }

    case 'chest': {
      // Sunken treasure chest tilted in the sand with lid propped open & gold spilling right
      primary.moveTo(-w * 0.38, 0)
      primary.lineTo(-w * 0.42, -h * 0.52)
      primary.lineTo(w * 0.34, -h * 0.44)
      primary.lineTo(w * 0.38, 0)
      primary.closePath()
      // Open tilted lid hinged on the left
      secondary.moveTo(-w * 0.42, -h * 0.52)
      secondary.quadraticCurveTo(-w * 0.08, -h * 1.04, w * 0.28, -h * 0.72)
      secondary.lineTo(-w * 0.42, -h * 0.52)
      secondary.closePath()
      // Gold coins & glowing treasure inside + spilled coin on sand
      detail.ellipse(-w * 0.02, -h * 0.5, w * 0.28, h * 0.12, 0.1, 0, Math.PI * 2)
      detail.moveTo(w * 0.46, -h * 0.08)
      detail.arc(w * 0.4, -h * 0.08, w * 0.06, 0, Math.PI * 2)
      break
    }

    case 'anchor': {
      // Leaning ancient anchor half-buried in sand at an angle
      addCapsule(primary, -w * 0.1, -h * 0.12, w * 0.16, -h * 0.8, w * 0.065)
      // Tilted cross stock
      addCapsule(secondary, -w * 0.12, -h * 0.72, w * 0.38, -h * 0.58, w * 0.05)
      // Asymmetric flukes (left fluke buried deeper, right fluke raised)
      primary.moveTo(-w * 0.42, -h * 0.28)
      primary.quadraticCurveTo(-w * 0.08, 0, w * 0.34, -h * 0.44)
      primary.quadraticCurveTo(-w * 0.06, -h * 0.16, -w * 0.42, -h * 0.28)
      primary.closePath()
      // Top ring & hanging chain link
      detail.arc(w * 0.19, -h * 0.88, w * 0.095, 0, Math.PI * 2)
      break
    }

    case 'castle': {
      // Dramatic silhouette: towering left spire (1.0h), mid keep (0.54h), low ruined right wall (0.28h)
      primary.rect(-w * 0.16, -h * 0.54, w * 0.38, h * 0.54)
      // Tall left wizard tower
      secondary.rect(-w * 0.42, -h * 0.76, w * 0.26, h * 0.76)
      // Short right ruined bastion
      secondary.rect(w * 0.22, -h * 0.28, w * 0.22, h * 0.28)
      // Pointed spire on left tower & central keep roof
      detail.moveTo(-w * 0.46, -h * 0.76)
      detail.lineTo(-w * 0.29, -h * 1.0)
      detail.lineTo(-w * 0.12, -h * 0.76)
      detail.closePath()

      detail.moveTo(-w * 0.18, -h * 0.54)
      detail.lineTo(w * 0.03, -h * 0.72)
      detail.lineTo(w * 0.24, -h * 0.54)
      detail.closePath()

      // Glowing window in tall tower
      detail.rect(-w * 0.33, -h * 0.58, w * 0.08, h * 0.14)
      break
    }

    case 'statue': {
      // Three-quarter profile Moai monolith tilted slightly and facing right
      primary.moveTo(-w * 0.32, 0)
      primary.lineTo(-w * 0.22, -h * 0.92)
      primary.quadraticCurveTo(w * 0.08, -h * 1.0, w * 0.24, -h * 0.82)
      primary.lineTo(w * 0.34, -h * 0.48)
      primary.lineTo(w * 0.24, -h * 0.44)
      primary.lineTo(w * 0.3, 0)
      primary.closePath()
      // Jutting brow & side nose ridge
      secondary.rect(-w * 0.14, -h * 0.76, w * 0.42, h * 0.09)
      secondary.moveTo(w * 0.08, -h * 0.74)
      secondary.lineTo(w * 0.34, -h * 0.48)
      secondary.lineTo(w * 0.12, -h * 0.44)
      secondary.closePath()
      // Glowing eye & mossy shoulder patch
      detail.arc(w * 0.04, -h * 0.63, w * 0.06, 0, Math.PI * 2)
      detail.moveTo(-w * 0.06, -h * 0.88)
      detail.ellipse(-w * 0.14, -h * 0.88, w * 0.12, h * 0.06, -0.3, 0, Math.PI * 2)
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

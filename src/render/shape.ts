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
  const sil = body.silhouette
  const path = new Path2D()

  switch (form) {
    case 'jellyfish': {
      const pulse = animPhase ? Math.sin(animPhase * 2.2) : 0
      const cx = len * 0.5
      const wave = animPhase ? Math.sin(animPhase * 2.2 - 0.8) * (len * 0.06) : 0

      if (sil === 'saucer-jelly') {
        // Moon Jellyfish: wide, flat saucer umbrella + 7 short delicate fringe tentacles
        const domeTop = -h * (0.36 + pulse * 0.04)
        const rimY = -h * 0.02
        const rx = len * (0.42 - pulse * 0.03)
        path.moveTo(cx + rx, rimY)
        path.bezierCurveTo(cx + rx, domeTop, cx - rx, domeTop, cx - rx, rimY)
        const lobes = 6
        const lobeW = (rx * 2) / lobes
        for (let i = 0; i < lobes; i++) {
          const x1 = cx - rx + (i + 0.5) * lobeW
          const x0 = cx - rx + (i + 1) * lobeW
          path.quadraticCurveTo(x1, rimY + h * 0.06, x0, rimY)
        }
        path.closePath()
        for (let i = -3; i <= 3; i++) {
          const tx = cx + (i / 3.2) * rx * 0.85
          const lenT = h * (0.28 + (3 - Math.abs(i)) * 0.04)
          addBodyCapsule(path, tx, rimY + h * 0.02, tx + wave * 0.6 + i * 1.2, rimY + lenT, Math.max(1, len * 0.018))
        }
        return { path, height: h }
      }

      if (sil === 'crown-jelly') {
        // Astral Crown Jelly: 3-spired royal coronet dome + flared collar + 5 beaded streamers
        const rimY = -h * 0.04
        const rx = len * (0.38 - pulse * 0.03)
        // The bell and its collar use the same winding direction.
        addBodyPolygon(path, [
          [cx - rx, rimY], [cx - rx * 0.82, -h * 0.36], [cx - rx * 0.42, -h * 0.24],
          [cx, -h * (0.5 + pulse * 0.04)], [cx + rx * 0.42, -h * 0.24],
          [cx + rx * 0.82, -h * 0.36], [cx + rx, rimY],
        ])
        // Flared skirt collar
        addBodyEllipse(path, cx, rimY + h * 0.03, rx * 1.08, h * 0.07, 0)
        // 5 undulating tentacles with glowing nodes
        for (let i = -2; i <= 2; i++) {
          const tx = cx + i * rx * 0.36
          const drop = h * (i === 0 ? 0.48 : Math.abs(i) === 1 ? 0.4 : 0.3)
          const midX = tx + wave * (0.65 + i * 0.08)
          addBodyCapsule(path, tx, rimY + h * 0.06, midX, h * 0.22, Math.max(1.2, len * 0.024))
          addBodyCapsule(path, midX, h * 0.22, tx + wave * 0.35, drop, Math.max(1, len * 0.02))
          addBodyEllipse(path, tx + wave * 0.35, drop, Math.max(1.5, len * 0.038), Math.max(1.5, len * 0.038), 0)
        }
        return { path, height: h }
      }

      // Default / 'ribbon-jelly' (Sakura Jellyfish): tall mushroom bell + 3 flowing S-curve oral ribbons
      const domeTop = -h * (0.48 + pulse * 0.05)
      const rimY = -h * 0.04
      const rx = len * (0.33 - pulse * 0.03)
      path.moveTo(cx + rx, rimY)
      path.bezierCurveTo(cx + rx * 0.95, domeTop, cx - rx * 0.95, domeTop, cx - rx, rimY)
      path.quadraticCurveTo(cx, rimY + h * 0.1, cx + rx, rimY)
      path.closePath()

      for (const off of [-0.52, 0, 0.52]) {
        const tx = cx + off * rx
        let previous = { x: tx, y: rimY }
        for (let i = 1; i <= 18; i++) {
          const u = i / 18
          const x = tx + Math.sin(u * Math.PI * 2 + animPhase * 2 + off) * len * 0.045 * u
          const y = rimY + h * 0.5 * u
          const r = len * (off === 0 ? 0.031 : 0.022) * (1 - u * 0.4)
          addBodyCapsule(path, previous.x, previous.y, x, y, r)
          previous = { x, y }
        }
      }
      return { path, height: h }
    }

    case 'seahorse': {
      const leaf = sil === 'leafy-seahorse'
      const flutter = Math.sin(animPhase * 5) * h * 0.025
      // S-curved neck and rounded belly, with a separate snout attached to the head.
      path.moveTo(len * 0.52, -h * 0.34)
      path.bezierCurveTo(len * 0.44, -h * 0.25, len * 0.5, -h * 0.15, len * 0.46, -h * 0.05)
      path.bezierCurveTo(len * 0.4, h * 0.1, len * 0.51, h * 0.25, len * 0.61, h * 0.14)
      path.bezierCurveTo(len * 0.7, -h * 0.03, len * 0.5, -h * 0.18, len * 0.61, -h * 0.31)
      path.closePath()
      addBodyEllipse(path, len * 0.6, -h * 0.32, len * 0.115, h * 0.11, -0.1)
      addBodyCapsule(path, len * 0.65, -h * 0.31, len * (leaf ? 0.91 : 0.85), -h * 0.29, h * 0.033)
      addBodyPolygon(path, [[len * 0.47, -h * 0.1], [len * 0.32, -h * 0.15 + flutter], [len * 0.35, h * 0.06], [len * 0.48, h * 0.08]])
      let previous = { x: len * 0.54, y: h * 0.15 }
      for (let i = 0; i <= 28; i++) {
        const u = i / 28
        const angle = Math.PI + u * Math.PI * 1.7
        const radius = 1 - u * 0.62
        const next = { x: len * 0.55 + Math.cos(angle) * len * 0.12 * radius, y: h * 0.34 + Math.sin(angle) * h * 0.12 * radius }
        addBodyCapsule(path, previous.x, previous.y, next.x, next.y, len * (0.025 - u * 0.012))
        previous = next
      }
      if (leaf) {
        for (const [x, y, angle] of [[0.47, -0.4, -0.7], [0.4, -0.2, -0.5], [0.7, 0.01, 0.4], [0.35, 0.13, -0.5], [0.66, 0.31, 0.5]]) {
          addBodyCapsule(path, len * 0.52, h * y!, len * x!, h * y!, len * 0.012)
          addBodyEllipse(path, len * x!, h * y!, len * 0.085, h * 0.035, angle!)
        }
      } else {
        for (const [x, y] of [[0.51, -0.42], [0.43, -0.18], [0.43, 0.02]]) {
          addBodyPolygon(path, [[len * x!, h * y!], [len * (x! - 0.06), h * (y! - 0.05)], [len * (x! + 0.04), h * (y! + 0.06)]])
        }
      }
      return { path, height: h }
    }

    case 'eel':
    case 'seasnake': {
      const profile = elongatedProfile(body, len, animPhase)
      const { center, radius } = profile
      const sample = (u: number, side: number): [number, number] => [len * (0.04 + u * 0.88), center(u) + radius(u) * side]
      const upper: [number, number][] = []
      const lower: [number, number][] = []
      for (let i = 0; i <= 36; i++) {
        upper.push(sample(i / 36, -1))
        lower.push(sample(i / 36, 1))
      }
      addBodyPolygon(path, [...upper, ...lower.reverse()])
      addBodyEllipse(path, len * 0.92, center(1), len * 0.055, radius(1), 0)

      if (form === 'eel') {
        const crest: [number, number][] = []
        const skirt: [number, number][] = []
        const ribbon = sil === 'ribbon-eel'
        const amber = sil === 'amber-eel'
        for (let i = 2; i <= 33; i++) {
          const u = i / 36
          const x = len * (0.04 + u * 0.88)
          const fin = Math.sin(u * Math.PI) * h * (ribbon ? 0.22 : amber ? 0.065 : 0.13)
          crest.push([x, center(u) - radius(u) - fin * (ribbon ? 1 : 0.22)])
          skirt.push([x, center(u) + radius(u) + fin])
        }
        addBodyPolygon(path, [...crest, ...Array.from({ length: 32 }, (_, i) => sample((33 - i) / 36, -0.85))])
        addBodyPolygon(path, [...skirt, ...Array.from({ length: 32 }, (_, i) => sample((33 - i) / 36, 0.85))])
        if (ribbon) {
          addBodyEllipse(path, len * 0.96, center(1) - h * 0.1, len * 0.045, h * 0.045, -0.7)
          addBodyEllipse(path, len * 0.97, center(1) + h * 0.07, len * 0.035, h * 0.035, 0.6)
        }
      } else if (sil === 'sea-dragon') {
        for (const u of [0.22, 0.4, 0.58, 0.76]) {
          const [x, y] = sample(u, -0.7)
          addBodyPolygon(path, [[x - len * 0.035, y], [x - len * 0.055, y - h * 0.2], [x + len * 0.045, y]])
        }
        const headY = center(1)
        addBodyCapsule(path, len * 0.9, headY - radius(1) * 0.5, len * 0.82, headY - h * 0.32, len * 0.014)
        addBodyCapsule(path, len * 0.94, headY + radius(1) * 0.5, len * 0.86, headY + h * 0.28, len * 0.012)
        addBodyPolygon(path, [[len * 0.14, center(0.1)], [0, center(0) - h * 0.2], [len * 0.035, center(0)], [0, center(0) + h * 0.2]])
      } else {
        addBodyEllipse(path, len * 0.065, center(0.03), len * 0.065, h * 0.11, 0)
      }
      return { path, height: h }
    }

    case 'ray': {
      const tailLen = len * 0.34
      const discStart = tailLen
      const nose = len * 0.92
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
      // Manta cephalic horn lobes at the front
      addBodyCapsule(path, nose - len * 0.06, -h * 0.1, len * 0.98, -h * 0.15, Math.max(1.2, h * 0.045))
      addBodyCapsule(path, nose - len * 0.06, h * 0.1, len * 0.98, h * 0.15, Math.max(1.2, h * 0.045))
      // Whip tail
      addBodyCapsule(path, discStart + len * 0.04, 0, len * 0.03, flap * 0.4, Math.max(1.2, h * 0.035))
      return { path, height: h }
    }

    case 'turtle': {
      const stroke = animPhase ? Math.sin(animPhase * 2.8) * 0.25 : 0
      addBodyEllipse(path, len * 0.46, -h * 0.03, len * 0.3, h * 0.32, 0)
      addBodyEllipse(path, len * 0.83, -h * 0.05, len * 0.11, h * 0.13, -0.1)
      addBodyEllipse(path, len * 0.62, -h * 0.34, len * 0.16, h * 0.08, -0.55 + stroke)
      addBodyEllipse(path, len * 0.62, h * 0.3, len * 0.16, h * 0.08, 0.55 - stroke)
      addBodyEllipse(path, len * 0.22, -h * 0.24, len * 0.11, h * 0.06, 0.45)
      addBodyEllipse(path, len * 0.22, h * 0.2, len * 0.11, h * 0.06, -0.45)
      return { path, height: h }
    }

    case 'fish':
    default: {
      const tail = len * body.tail
      const ox = tail * 0.5
      const span = len - tail
      const nose = ox + span
      const wag = animPhase ? Math.sin(animPhase * 4.5) * (h * 0.08) : 0

      if (sil === 'spiky-puffer') {
        // Cream Puff Puffer: inflated round ball with radiating spines & small paddle tail
        const cx = len * 0.54
        const rx = len * 0.34
        const ry = h * 0.42
        addBodyEllipse(path, cx, 0, rx, ry, 0)
        // Small paddle tail
        path.moveTo(cx - rx * 0.85, 0)
        path.lineTo(len * 0.08, -h * 0.2 + wag)
        path.lineTo(len * 0.08, h * 0.2 + wag)
        path.closePath()
        // Spines around the perimeter
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2
          if (Math.abs(Math.cos(ang)) > 0.88 && Math.cos(ang) < 0) continue
          const bx = cx + Math.cos(ang) * rx * 0.92
          const by = Math.sin(ang) * ry * 0.92
          const tx = cx + Math.cos(ang) * (rx + h * 0.1)
          const ty = Math.sin(ang) * (ry + h * 0.1)
          addBodyCapsule(path, bx, by, tx, ty, Math.max(1, len * 0.022))
        }
        return { path, height: h }
      }

      if (sil === 'glider-fish') {
        addBodyEllipse(path, len * 0.6, 0, len * 0.32, h * 0.17, 0)
        addBodyPolygon(path, [[len * 0.72, -h * 0.04], [len * 0.18, -h * 0.49 + wag * 0.5], [len * 0.36, -h * 0.02]])
        addBodyPolygon(path, [[len * 0.66, h * 0.06], [len * 0.24, h * 0.44 - wag * 0.4], [len * 0.4, h * 0.03]])
        addBodyPolygon(path, [[len * 0.34, 0], [len * 0.055, -h * 0.26 + wag], [len * 0.15, 0], [len * 0.015, h * 0.38 + wag]])
        return { path, height: h }
      }

      if (sil === 'moorish-idol') {
        path.moveTo(len * 0.89, h * 0.02)
        path.quadraticCurveTo(len * 0.66, -h * 0.55, len * 0.32, -h * 0.18)
        path.quadraticCurveTo(len * 0.22, 0, len * 0.32, h * 0.18)
        path.quadraticCurveTo(len * 0.67, h * 0.49, len * 0.89, h * 0.02)
        path.closePath()
        addBodyCapsule(path, len * 0.84, h * 0.02, len * 0.99, h * 0.05, h * 0.03)
        const pennant = new Path2D()
        pennant.moveTo(len * 0.65, -h * 0.29)
        pennant.bezierCurveTo(len * 0.5, -h * 0.57, len * 0.18, -h * 0.5, len * 0.03, -h * 0.4 + wag)
        pennant.bezierCurveTo(len * 0.25, -h * 0.43, len * 0.5, -h * 0.43, len * 0.54, -h * 0.24)
        pennant.closePath()
        path.addPath(pennant)
        addBodyPolygon(path, [[len * 0.34, 0], [len * 0.04, -h * 0.17 + wag], [len * 0.1, 0], [len * 0.04, h * 0.17 + wag]])
        return { path, height: h }
      }

      if (sil === 'banner-cardinal') {
        addBodyEllipse(path, len * 0.6, 0, len * 0.26, h * 0.27, 0)
        addBodyPolygon(path, [[len * 0.38, -h * 0.14], [len * 0.42, -h * 0.49], [len * 0.68, -h * 0.2]])
        addBodyPolygon(path, [[len * 0.4, h * 0.13], [len * 0.42, h * 0.48], [len * 0.7, h * 0.18]])
        addBodyPolygon(path, [[len * 0.4, -h * 0.07], [len * 0.04, -h * 0.34 + wag], [len * 0.16, wag * 0.3], [len * 0.04, h * 0.34 + wag], [len * 0.4, h * 0.07]])
        return { path, height: h }
      }

      if (sil === 'beak-butterfly') {
        // Copperband Butterflyfish: forceps beak snout + steep diamond body + fan tail
        const beak = len * 0.16
        const bodyNose = nose - beak
        addBodyCapsule(path, bodyNose - len * 0.02, 0, nose, 0, Math.max(1.4, h * 0.055))
        path.moveTo(bodyNose, 0)
        path.quadraticCurveTo(ox + span * 0.52, -h * 0.52, ox + tail * 0.5, -h * 0.18)
        path.lineTo(ox + tail * 0.5, h * 0.18)
        path.quadraticCurveTo(ox + span * 0.52, h * 0.52, bodyNose, 0)
        path.closePath()
        // Fan tail
        path.moveTo(ox + tail * 0.55, 0)
        path.lineTo(ox * 0.6, -h * 0.26 + wag)
        path.quadraticCurveTo(ox * 0.25, wag, ox * 0.6, h * 0.26 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'unicorn-tang') {
        // Moonhorn Tang: oval body + frontal unicorn horn + lunate crescent tail
        addBodyEllipse(path, ox + span * 0.54, 0, span * 0.42, h * 0.38, 0)
        // Unicorn horn jutting forward from forehead
        addBodyCapsule(path, ox + span * 0.82, -h * 0.16, nose + len * 0.06, -h * 0.2, Math.max(1.3, h * 0.048))
        // Lunate crescent tail with long tips
        path.moveTo(ox + tail * 0.65, 0)
        path.quadraticCurveTo(ox + tail * 0.2, -h * 0.42, ox * 0.3, -h * 0.48 + wag)
        path.quadraticCurveTo(ox + tail * 0.38, wag * 0.5, ox * 0.3, h * 0.48 + wag)
        path.quadraticCurveTo(ox + tail * 0.2, h * 0.42, ox + tail * 0.65, 0)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'catfish') {
        path.moveTo(len * 0.96, h * 0.14)
        path.bezierCurveTo(len * 0.92, -h * 0.09, len * 0.64, -h * 0.34, len * 0.44, -h * 0.18)
        path.lineTo(len * 0.25, h * 0.05)
        path.bezierCurveTo(len * 0.4, h * 0.24, len * 0.82, h * 0.25, len * 0.96, h * 0.14)
        path.closePath()
        addBodyPolygon(path, [[len * 0.43, -h * 0.1], [len * 0.5, -h * 0.49], [len * 0.68, -h * 0.13]])
        addBodyPolygon(path, [[len * 0.33, h * 0.06], [len * 0.04, -h * 0.25 + wag], [len * 0.13, h * 0.06], [len * 0.04, h * 0.3 + wag]])
        addBodyCapsule(path, len * 0.93, h * 0.15, len * 0.99, h * 0.28, len * 0.012)
        return { path, height: h }
      }

      if (sil === 'fire-goby') {
        // Blushing Firefish: slender body + tall forward-flicking dorsal antenna flag + tapering rear fins
        const bodyH = h * 0.45
        addBodyEllipse(path, ox + span * 0.56, 0, span * 0.44, bodyH * 0.48, 0)
        // Iconic tall flicking first dorsal spine
        addBodyCapsule(path, ox + span * 0.62, -bodyH * 0.3, ox + span * 0.74, -h * 0.5, Math.max(1.3, len * 0.032))
        // Long rear dorsal & anal tapering fins
        path.moveTo(ox + span * 0.52, -bodyH * 0.3)
        path.lineTo(ox + tail * 0.6, -h * 0.34)
        path.lineTo(ox + tail * 0.6, 0)
        path.lineTo(ox + tail * 0.6, h * 0.34)
        path.lineTo(ox + span * 0.52, bodyH * 0.3)
        path.closePath()
        // Diamond paddle tail
        path.moveTo(ox + tail * 0.62, 0)
        path.lineTo(ox + tail * 0.2, -h * 0.28 + wag)
        path.lineTo(ox * 0.4, wag)
        path.lineTo(ox + tail * 0.2, h * 0.28 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'crown-butterfly') {
        // Golden Butterflyfish: round disc body + 4 distinct spiky crown spines on top + brush tail
        addBodyEllipse(path, ox + span * 0.54, 0, span * 0.42, h * 0.42, 0)
        addBodyPolygon(path, [
          [len * 0.28, -h * 0.18], [len * 0.32, -h * 0.43], [len * 0.4, -h * 0.36],
          [len * 0.46, -h * 0.48], [len * 0.54, -h * 0.4], [len * 0.61, -h * 0.47],
          [len * 0.7, -h * 0.35], [len * 0.77, -h * 0.18],
        ])
        path.moveTo(ox + tail * 0.6, 0)
        path.lineTo(ox * 0.5, -h * 0.28 + wag)
        path.lineTo(ox * 0.5, h * 0.28 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'veil-koi') {
        addBodyEllipse(path, len * 0.64, 0, len * 0.32, h * 0.32, 0)
        const veil = new Path2D()
        veil.moveTo(len * 0.39, -h * 0.1)
        veil.bezierCurveTo(len * 0.2, -h * 0.43, len * 0.12, -h * 0.56, len * 0.02, -h * 0.42 + wag)
        veil.quadraticCurveTo(len * 0.13, 0, len * 0.02, h * 0.42 + wag)
        veil.bezierCurveTo(len * 0.16, h * 0.5, len * 0.27, h * 0.29, len * 0.39, h * 0.1)
        veil.closePath()
        path.addPath(veil)
        addBodyPolygon(path, [[len * 0.52, -h * 0.24], [len * 0.48, -h * 0.46], [len * 0.75, -h * 0.28]])
        addBodyPolygon(path, [[len * 0.66, h * 0.16], [len * 0.45, h * 0.43], [len * 0.78, h * 0.24]])
        addBodyCapsule(path, len * 0.93, h * 0.05, len * 0.99, h * 0.18, len * 0.009)
        return { path, height: h }
      }

      if (sil === 'lyretail') {
        addBodyEllipse(path, len * 0.63, 0, len * 0.3, h * 0.32, 0)
        const tailFin = new Path2D()
        tailFin.moveTo(len * 0.4, -h * 0.1)
        tailFin.quadraticCurveTo(len * 0.16, -h * 0.2, len * 0.025, -h * 0.46 + wag)
        tailFin.quadraticCurveTo(len * 0.25, 0, len * 0.025, h * 0.46 + wag)
        tailFin.quadraticCurveTo(len * 0.16, h * 0.2, len * 0.4, h * 0.1)
        tailFin.closePath()
        path.addPath(tailFin)
        addBodyPolygon(path, [[len * 0.35, -h * 0.18], [len * 0.48, -h * 0.43], [len * 0.8, -h * 0.23]])
        addBodyPolygon(path, [[len * 0.57, h * 0.2], [len * 0.42, h * 0.43], [len * 0.7, h * 0.24]])
        return { path, height: h }
      }

      if (sil === 'tetra') {
        addBodyEllipse(path, len * 0.59, 0, len * 0.32, h * 0.25, 0)
        addBodyPolygon(path, [[len * 0.32, 0], [len * 0.06, -h * 0.26 + wag], [len * 0.13, 0], [len * 0.06, h * 0.26 + wag]])
        addBodyPolygon(path, [[len * 0.45, -h * 0.16], [len * 0.48, -h * 0.42], [len * 0.67, -h * 0.2]])
        addBodyPolygon(path, [[len * 0.42, h * 0.16], [len * 0.37, h * 0.33], [len * 0.7, h * 0.19]])
        return { path, height: h }
      }

      if (sil === 'damsel') {
        addBodyEllipse(path, len * 0.59, 0, len * 0.3, h * 0.4, 0)
        addBodyPolygon(path, [[len * 0.31, 0], [len * 0.06, -h * 0.25 + wag], [len * 0.12, 0], [len * 0.06, h * 0.25 + wag]])
        addBodyPolygon(path, [[len * 0.31, -h * 0.15], [len * 0.42, -h * 0.48], [len * 0.76, -h * 0.28]])
        addBodyPolygon(path, [[len * 0.48, h * 0.3], [len * 0.37, h * 0.49], [len * 0.65, h * 0.32]])
        return { path, height: h }
      }

      if (sil === 'wrasse') {
        // Neon Cleaner Wrasse: sleek cigar body + rounded spade paddle tail + full-length low dorsal ridge
        addBodyEllipse(path, ox + span * 0.54, 0, span * 0.45, h * 0.38, 0)
        addBodyEllipse(path, ox + tail * 0.32, wag * 0.5, tail * 0.42, h * 0.36, 0)
        return { path, height: h }
      }

      if (sil === 'rhomboid-barb') {
        addBodyPolygon(path, [[len * 0.95, 0], [len * 0.61, -h * 0.34], [len * 0.29, -h * 0.12], [len * 0.29, h * 0.12], [len * 0.61, h * 0.34]])
        addBodyPolygon(path, [[len * 0.44, -h * 0.17], [len * 0.48, -h * 0.51], [len * 0.74, -h * 0.2]])
        addBodyPolygon(path, [[len * 0.43, h * 0.17], [len * 0.37, h * 0.45], [len * 0.7, h * 0.23]])
        addBodyPolygon(path, [[len * 0.34, 0], [len * 0.035, -h * 0.35 + wag], [len * 0.14, 0], [len * 0.035, h * 0.35 + wag]])
        return { path, height: h }
      }

      // Standard fish ('goldfish', 'minnow', 'damsel')
      path.moveTo(nose, 0)
      path.quadraticCurveTo(ox + span * 0.55, -h / 2, ox + tail * 0.6, -h * 0.22)
      path.quadraticCurveTo(ox + tail * 0.15, 0, ox + tail * 0.6, h * 0.22)
      path.quadraticCurveTo(ox + span * 0.55, h / 2, nose, 0)
      path.closePath()

      // Caudal fin (rounded double-fan for goldfish, sharp fork for minnow/damsel)
      const fin = new Path2D()
      fin.moveTo(ox + tail * 0.62, 0)
      if (sil === 'goldfish') {
        fin.quadraticCurveTo(ox * 0.4, -h * 0.58 + wag, ox * 0.5, -h * 0.15 + wag)
        fin.quadraticCurveTo(ox * 0.4, h * 0.58 + wag, ox + tail * 0.62, 0)
      } else {
        fin.lineTo(ox, -h * 0.5 + wag)
        fin.lineTo(ox + tail * 0.35, wag * 0.5)
        fin.lineTo(ox, h * 0.5 + wag)
        fin.closePath()
      }
      path.addPath(fin)

      if (body.dorsal > 0.05) {
        const d = new Path2D()
        const peak = h * 0.5 * (0.4 + body.dorsal)
        d.moveTo(ox + span * 0.75, -h * 0.3)
        d.quadraticCurveTo(ox + span * 0.5, -peak, ox + tail * 0.8, -h * 0.26)
        d.closePath()
        path.addPath(d)
      }

      return { path, height: h }
    }
  }
}

/** One centerline drives both the continuous body and its eye through the entire swim cycle. */
export function elongatedProfile(body: BodyShape, len: number, phase = 0): {
  center: (u: number) => number; radius: (u: number) => number
} {
  const h = len * body.depth
  const ribbon = body.silhouette === 'ribbon-eel'
  const snake = body.form === 'seasnake'
  const waves = ribbon ? 2.5 : snake ? 2.2 : body.silhouette === 'amber-eel' ? 1.3 : 1.7
  const speed = ribbon ? 2.6 : snake ? 3.1 : 2.3
  return {
    center: u => Math.sin((1 - u) * Math.PI * waves + phase * speed) * h * (ribbon ? 0.24 : 0.2) * (1 - u * 0.8),
    radius: u => h * (ribbon ? 0.1 : snake ? 0.135 : 0.17) * (0.18 + 0.82 * Math.pow(u, 0.65)),
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
  const sil = body.silhouette
  switch (form) {
    case 'jellyfish':
      return { x: len * 0.58, y: -h * 0.18, r: Math.max(1, len * 0.045) }
    case 'seahorse':
      return { x: len * 0.63, y: -h * 0.34, r: Math.max(1, len * 0.039) }
    case 'eel':
    case 'seasnake': {
      const profile = elongatedProfile(body, len, animPhase)
      return { x: len * 0.93, y: profile.center(1) - profile.radius(1) * 0.22, r: Math.max(1, len * 0.027) }
    }
    case 'ray':
      return { x: len * 0.76, y: -h * 0.11, r: Math.max(1, len * 0.046) }
    case 'turtle':
      return { x: len * 0.88, y: -h * 0.08, r: Math.max(1, len * 0.045) }
    case 'fish':
    default: {
      const tail = len * body.tail
      const ox = tail * 0.5
      const span = len - tail
      if (sil === 'catfish') return { x: len * 0.81, y: h * 0.025, r: Math.max(1, len * 0.037) }
      if (['veil-koi', 'lyretail', 'tetra', 'damsel', 'banner-cardinal', 'glider-fish', 'rhomboid-barb'].includes(sil ?? '')) {
        return { x: len * (sil === 'banner-cardinal' ? 0.77 : 0.84), y: -h * 0.07, r: Math.max(1, len * 0.041) }
      }
      if (sil === 'beak-butterfly') {
        return { x: ox + span * 0.68, y: -h * 0.1, r: Math.max(1, len * 0.052) }
      }
      if (sil === 'spiky-puffer') {
        return { x: len * 0.72, y: -h * 0.1, r: Math.max(1.2, len * 0.06) }
      }
      if (sil === 'moorish-idol') {
        return { x: len * 0.79, y: -h * 0.08, r: Math.max(1, len * 0.04) }
      }
      return { x: ox + span * 0.8, y: -h * 0.1, r: Math.max(1, len * 0.055) }
    }
  }
}

/** Pattern stripes as local-space rectangles, for either renderer to use. */
export function patternBands(body: BodyShape, len: number): { x: number; w: number }[] {
  const tail = len * body.tail
  const ox = (body.form ?? 'fish') === 'fish' ? tail * 0.5 : 0
  const span = len - tail
  const sil = body.silhouette
  if (['wrasse', 'tetra', 'amber-eel', 'electric-eel', 'ribbon-eel', 'sea-turtle'].includes(sil ?? '')) return []
  if (sil === 'rhomboid-barb') return [0.35, 0.51, 0.67, 0.82].map(x => ({ x: len * x, w: len * 0.065 }))
  if (sil === 'moorish-idol' || sil === 'banner-cardinal') return [0.4, 0.62, 0.8].map(x => ({ x: len * x, w: len * 0.09 }))
  switch (body.pattern) {
    case 'stripes':
      return [0.3, 0.5, 0.7].map((t) => ({ x: ox + span * (0.12 + t * 0.82), w: Math.max(1, len * 0.05) }))
    case 'bands':
      return [0.25, 0.6].map((t) => ({ x: ox + span * (0.12 + t * 0.82), w: Math.max(2, len * 0.12) }))
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
  if (body.pattern !== 'spots' || body.silhouette === 'sea-turtle') return []
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
      r: Math.max(0.7, len * 0.025),
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

/** Separate, counterclockwise contours prevent overlapping parts cutting holes in each other. */
function addBodyEllipse(path: Path2D, x: number, y: number, rx: number, ry: number, angle: number): void {
  const oval = new Path2D()
  oval.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2, true)
  oval.closePath()
  path.addPath(oval)
}

function addBodyCapsule(path: Path2D, x0: number, y0: number, x1: number, y1: number, r: number): void {
  const angle = Math.atan2(y1 - y0, x1 - x0)
  const nx = -Math.sin(angle) * r
  const ny = Math.cos(angle) * r
  const capsule = new Path2D()
  capsule.moveTo(x0 + nx, y0 + ny)
  capsule.lineTo(x1 + nx, y1 + ny)
  capsule.arc(x1, y1, r, angle + Math.PI / 2, angle - Math.PI / 2, true)
  capsule.lineTo(x0 - nx, y0 - ny)
  capsule.arc(x0, y0, r, angle - Math.PI / 2, angle - Math.PI * 1.5, true)
  capsule.closePath()
  path.addPath(capsule)
}

function addBodyPolygon(path: Path2D, points: [number, number][]): void {
  const area = points.reduce((sum, [x, y], i) => {
    const next = points[(i + 1) % points.length]!
    return sum + x * next[1] - y * next[0]
  }, 0)
  const contour = area > 0 ? [...points].reverse() : points
  path.moveTo(...contour[0]!)
  for (const point of contour.slice(1)) path.lineTo(...point)
  path.closePath()
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

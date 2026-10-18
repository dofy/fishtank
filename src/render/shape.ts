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
        path.moveTo(cx - rx, rimY)
        path.bezierCurveTo(cx - rx, domeTop, cx + rx, domeTop, cx + rx, rimY)
        const lobes = 6
        const lobeW = (rx * 2) / lobes
        for (let i = lobes - 1; i >= 0; i--) {
          const x1 = cx - rx + (i + 0.5) * lobeW
          const x0 = cx - rx + i * lobeW
          path.quadraticCurveTo(x1, rimY + h * 0.06, x0, rimY)
        }
        path.closePath()
        for (let i = -3; i <= 3; i++) {
          const tx = cx + (i / 3.2) * rx * 0.85
          const lenT = h * (0.28 + (3 - Math.abs(i)) * 0.04)
          addCapsule(path, tx, rimY + h * 0.02, tx + wave * 0.6 + i * 1.2, rimY + lenT, Math.max(1, len * 0.018))
        }
        return { path, height: h }
      }

      if (sil === 'crown-jelly') {
        // Astral Crown Jelly: 3-spired royal coronet dome + flared collar + 5 beaded streamers
        const rimY = -h * 0.04
        const rx = len * (0.38 - pulse * 0.03)
        // Crown spires on top of bell
        path.moveTo(cx - rx, rimY)
        path.lineTo(cx - rx * 0.82, -h * 0.36)
        path.lineTo(cx - rx * 0.42, -h * 0.24)
        path.lineTo(cx, -h * (0.5 + pulse * 0.04))
        path.lineTo(cx + rx * 0.42, -h * 0.24)
        path.lineTo(cx + rx * 0.82, -h * 0.36)
        path.lineTo(cx + rx, rimY)
        path.closePath()
        // Flared skirt collar
        path.ellipse(cx, rimY + h * 0.03, rx * 1.08, h * 0.07, 0, 0, Math.PI * 2)
        // 5 undulating tentacles with glowing nodes
        for (let i = -2; i <= 2; i++) {
          const tx = cx + i * rx * 0.36
          const drop = h * (i === 0 ? 0.48 : Math.abs(i) === 1 ? 0.4 : 0.3)
          const midX = tx + wave * (i % 2 === 0 ? 1 : -0.8)
          addCapsule(path, tx, rimY + h * 0.06, midX, h * 0.22, Math.max(1.2, len * 0.024))
          addCapsule(path, midX, h * 0.22, tx - wave * 0.5, drop, Math.max(1, len * 0.02))
          path.moveTo(tx - wave * 0.5 + len * 0.038, drop)
          path.arc(tx - wave * 0.5, drop, Math.max(1.5, len * 0.038), 0, Math.PI * 2)
        }
        return { path, height: h }
      }

      // Default / 'ribbon-jelly' (Sakura Jellyfish): tall mushroom bell + 3 flowing S-curve oral ribbons
      const domeTop = -h * (0.48 + pulse * 0.05)
      const rimY = -h * 0.04
      const rx = len * (0.33 - pulse * 0.03)
      path.moveTo(cx - rx, rimY)
      path.bezierCurveTo(cx - rx * 0.95, domeTop, cx + rx * 0.95, domeTop, cx + rx, rimY)
      path.quadraticCurveTo(cx, rimY + h * 0.1, cx - rx, rimY)
      path.closePath()

      for (const off of [-0.52, 0, 0.52]) {
        const tx = cx + off * rx
        const s1 = wave + off * len * 0.08
        const s2 = -wave * 0.8 + off * len * 0.12
        const r = off === 0 ? Math.max(1.6, len * 0.036) : Math.max(1.2, len * 0.024)
        addCapsule(path, tx, rimY + h * 0.03, tx + s1, h * 0.22, r)
        addCapsule(path, tx + s1, h * 0.22, tx + s2, h * 0.46, r * 0.78)
      }
      return { path, height: h }
    }

    case 'seahorse': {
      const cx = len * 0.48
      const flutter = animPhase ? Math.sin(animPhase * 7.5) * (h * 0.04) : 0
      // Head
      path.ellipse(cx + len * 0.04, -h * 0.3, len * 0.13, h * 0.12, -0.15, 0, Math.PI * 2)
      // Snout
      const snoutLen = sil === 'leafy-seahorse' ? 0.34 : 0.26
      addCapsule(
        path,
        cx + len * 0.1,
        -h * 0.29,
        cx + len * snoutLen,
        -h * 0.26,
        Math.max(1.5, h * 0.046),
      )
      // Arching neck & belly
      path.moveTo(cx - len * 0.04, -h * 0.24)
      path.quadraticCurveTo(cx + len * 0.22, -h * 0.04, cx + len * 0.04, h * 0.18)
      path.quadraticCurveTo(cx - len * 0.16, h * 0.02, cx - len * 0.04, -h * 0.24)
      path.closePath()
      // Dorsal fin
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

      if (sil === 'leafy-seahorse') {
        // Golden Leafy Sea Dragon: tall royal coronet + leaf fronds along neck, back, and tail
        addCapsule(path, cx, -h * 0.38, cx - len * 0.08, -h * 0.49, Math.max(1.2, len * 0.025))
        addCapsule(path, cx + len * 0.04, -h * 0.39, cx + len * 0.05, -h * 0.5, Math.max(1.2, len * 0.025))
        path.ellipse(cx - len * 0.18, -h * 0.24, len * 0.09, h * 0.038, 0.5, 0, Math.PI * 2)
        path.ellipse(cx + len * 0.19, -h * 0.1, len * 0.08, h * 0.035, -0.4, 0, Math.PI * 2)
        path.ellipse(cx - len * 0.2, h * 0.22, len * 0.09, h * 0.038, -0.5, 0, Math.PI * 2)
      } else {
        // Coral Spiny Seahorse: thorny tubercles along crown and spine
        path.moveTo(cx - len * 0.02, -h * 0.38)
        path.lineTo(cx - len * 0.06, -h * 0.46)
        path.lineTo(cx + len * 0.04, -h * 0.4)
        path.closePath()
      }
      return { path, height: h }
    }

    case 'eel':
    case 'seasnake': {
      const segs = 14
      const isRibbon = sil === 'ribbon-eel'
      const isDragon = sil === 'sea-dragon'
      const waves = isRibbon ? 2.6 : form === 'seasnake' ? 2.2 : 1.4
      const amp = h * (isRibbon ? 0.28 : form === 'seasnake' ? 0.25 : 0.18)
      const baseThick = h * (isRibbon ? 0.14 : form === 'seasnake' ? 0.16 : 0.24)
      const travel = animPhase * 3.8

      for (let i = 0; i < segs; i++) {
        const t0 = i / segs
        const t1 = (i + 1) / segs
        const x0 = len * (0.06 + t0 * 0.86)
        const x1 = len * (0.06 + t1 * 0.86)
        const y0 = Math.sin(t0 * Math.PI * waves + travel) * amp
        const y1 = Math.sin(t1 * Math.PI * waves + travel) * amp
        const r = Math.max(1.3, baseThick * (0.4 + 0.6 * Math.sin(t0 * Math.PI)))
        addCapsule(path, x0, y0, x1, y1, r)
      }

      if (sil === 'electric-eel') {
        // Volt Electric Eel: deep ventral undulating electric organ + jagged dorsal spark spikes
        for (let i = 2; i < segs - 1; i++) {
          const t0 = i / segs
          const t1 = (i + 1) / segs
          const x0 = len * (0.06 + t0 * 0.86)
          const x1 = len * (0.06 + t1 * 0.86)
          const y0 = Math.sin(t0 * Math.PI * waves + travel) * amp + baseThick * 0.95
          const y1 = Math.sin(t1 * Math.PI * waves + travel) * amp + baseThick * 0.95
          addCapsule(path, x0, y0, x1, y1, Math.max(1.2, baseThick * 0.55))
          if (i % 3 === 0) {
            const sy = Math.sin(t0 * Math.PI * waves + travel) * amp - baseThick * 0.8
            path.moveTo(x0 - len * 0.03, sy + baseThick * 0.4)
            path.lineTo(x0 + len * 0.01, sy - baseThick * 0.95)
            path.lineTo(x0 + len * 0.04, sy + baseThick * 0.4)
            path.closePath()
          }
        }
      } else if (isRibbon) {
        // Aurora Ribbon Eel: continuous tall dorsal crest + flared snout leaf-nostrils
        for (let i = 1; i < segs; i++) {
          const t0 = i / segs
          const t1 = (i + 1) / segs
          const x0 = len * (0.06 + t0 * 0.86)
          const x1 = len * (0.06 + t1 * 0.86)
          const y0 = Math.sin(t0 * Math.PI * waves + travel) * amp - baseThick * 1.15
          const y1 = Math.sin(t1 * Math.PI * waves + travel) * amp - baseThick * 1.15
          addCapsule(path, x0, y0, x1, y1, Math.max(1.1, baseThick * 0.65))
        }
        const headY = Math.sin(Math.PI * waves + travel) * amp
        path.ellipse(len * 0.95, headY - baseThick * 0.5, len * 0.045, baseThick * 0.5, -0.4, 0, Math.PI * 2)
      } else if (isDragon) {
        // Leviathan Sea Serpent: dragon horns, dorsal spines & trident tail fan
        const headY = Math.sin(Math.PI * waves + travel) * amp
        addCapsule(path, len * 0.86, headY - baseThick * 0.5, len * 0.74, headY - baseThick * 2.1, Math.max(1.2, baseThick * 0.38))
        addCapsule(path, len * 0.88, headY + baseThick * 0.5, len * 0.8, headY + baseThick * 1.7, Math.max(1, baseThick * 0.3))
        for (let i = 3; i < segs - 1; i += 3) {
          const t0 = i / segs
          const sx = len * (0.06 + t0 * 0.86)
          const sy = Math.sin(t0 * Math.PI * waves + travel) * amp
          path.moveTo(sx - len * 0.035, sy - baseThick * 0.5)
          path.lineTo(sx - len * 0.01, sy - baseThick * 1.8)
          path.lineTo(sx + len * 0.035, sy - baseThick * 0.5)
          path.closePath()
        }
        const tailY = Math.sin(travel) * amp
        path.moveTo(len * 0.09, tailY)
        path.lineTo(0, tailY - baseThick * 1.6)
        path.lineTo(len * 0.03, tailY)
        path.lineTo(0, tailY + baseThick * 1.6)
        path.closePath()
      } else {
        // Banded Sea Snake: smooth body with broad oar paddle tail
        const tailY = Math.sin(travel) * amp
        path.ellipse(len * 0.08, tailY, len * 0.065, baseThick * 1.2, 0, 0, Math.PI * 2)
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
      addCapsule(path, nose - len * 0.06, -h * 0.1, len * 0.98, -h * 0.15, Math.max(1.2, h * 0.045))
      addCapsule(path, nose - len * 0.06, h * 0.1, len * 0.98, h * 0.15, Math.max(1.2, h * 0.045))
      // Whip tail
      addCapsule(path, discStart + len * 0.04, 0, len * 0.03, flap * 0.4, Math.max(1.2, h * 0.035))
      return { path, height: h }
    }

    case 'turtle': {
      const stroke = animPhase ? Math.sin(animPhase * 2.8) * 0.25 : 0
      path.ellipse(len * 0.46, -h * 0.03, len * 0.3, h * 0.32, 0, 0, Math.PI * 2)
      path.ellipse(len * 0.83, -h * 0.05, len * 0.11, h * 0.13, -0.1, 0, Math.PI * 2)
      path.ellipse(len * 0.62, -h * 0.34, len * 0.16, h * 0.08, -0.55 + stroke, 0, Math.PI * 2)
      path.ellipse(len * 0.62, h * 0.3, len * 0.16, h * 0.08, 0.55 - stroke, 0, Math.PI * 2)
      path.ellipse(len * 0.22, -h * 0.24, len * 0.11, h * 0.06, 0.45, 0, Math.PI * 2)
      path.ellipse(len * 0.22, h * 0.2, len * 0.11, h * 0.06, -0.45, 0, Math.PI * 2)
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
        path.ellipse(cx, 0, rx, ry, 0, 0, Math.PI * 2)
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
          addCapsule(path, bx, by, tx, ty, Math.max(1, len * 0.022))
        }
        return { path, height: h }
      }

      if (sil === 'glider-fish') {
        // Skywing Flying Fish: sleek torpedo + large swept-back delta wings top & bottom
        const bodyH = h * 0.46
        path.ellipse(ox + span * 0.55, 0, span * 0.46, bodyH * 0.5, 0, 0, Math.PI * 2)
        // Swept-back high glider wing
        const wing = new Path2D()
        wing.moveTo(ox + span * 0.68, -bodyH * 0.2)
        wing.lineTo(ox + span * 0.18, -h * 0.5 + wag * 0.6)
        wing.lineTo(ox + span * 0.36, -bodyH * 0.15)
        wing.closePath()
        path.addPath(wing)
        // Lower pelvic glider wing
        const pWing = new Path2D()
        pWing.moveTo(ox + span * 0.58, bodyH * 0.2)
        pWing.lineTo(ox + span * 0.22, h * 0.46 - wag * 0.5)
        pWing.lineTo(ox + span * 0.38, bodyH * 0.15)
        pWing.closePath()
        path.addPath(pWing)
        // Hypocercal forked tail (longer lower lobe)
        const fin = new Path2D()
        fin.moveTo(ox + tail * 0.5, 0)
        fin.lineTo(ox * 0.5, -h * 0.34 + wag)
        fin.lineTo(ox + tail * 0.25, 0)
        fin.lineTo(ox * 0.2, h * 0.46 + wag)
        fin.closePath()
        path.addPath(fin)
        return { path, height: h }
      }

      if (sil === 'moorish-idol') {
        // Golden Moorish Idol: steep triangular disc + tubular snout + ultra-long dorsal pennant whip
        path.moveTo(nose, h * 0.04)
        path.lineTo(nose - len * 0.13, -h * 0.05)
        path.quadraticCurveTo(ox + span * 0.58, -h * 0.46, ox + tail * 0.55, -h * 0.14)
        path.quadraticCurveTo(ox + tail * 0.3, 0, ox + tail * 0.55, h * 0.16)
        path.quadraticCurveTo(ox + span * 0.58, h * 0.46, nose - len * 0.12, h * 0.1)
        path.closePath()
        // Long whip streamer trailing past the tail
        addCapsule(path, ox + span * 0.56, -h * 0.36, ox * 0.15, -h * 0.46 + wag * 1.4, Math.max(1.3, len * 0.032))
        // Ventral spike fins
        path.moveTo(ox + span * 0.62, h * 0.3)
        path.lineTo(ox + span * 0.42, h * 0.5)
        path.lineTo(ox + span * 0.52, h * 0.26)
        path.closePath()
        // Forked tail
        path.moveTo(ox + tail * 0.55, 0)
        path.lineTo(ox * 0.6, -h * 0.28 + wag)
        path.lineTo(ox + tail * 0.3, 0)
        path.lineTo(ox * 0.6, h * 0.28 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'banner-cardinal') {
        // Banggai Starfin: diamond body + twin symmetrical high sickle dorsal & anal sails + long forked tail
        const bodyH = h * 0.52
        path.moveTo(nose, 0)
        path.quadraticCurveTo(ox + span * 0.58, -bodyH * 0.6, ox + tail * 0.55, -bodyH * 0.18)
        path.quadraticCurveTo(ox + tail * 0.3, 0, ox + tail * 0.55, bodyH * 0.18)
        path.quadraticCurveTo(ox + span * 0.58, bodyH * 0.6, nose, 0)
        path.closePath()
        // High sickle dorsal sail
        addCapsule(path, ox + span * 0.6, -bodyH * 0.3, ox + span * 0.24, -h * 0.48, Math.max(1.4, len * 0.042))
        // Matching sickle anal sail
        addCapsule(path, ox + span * 0.56, bodyH * 0.3, ox + span * 0.22, h * 0.48, Math.max(1.4, len * 0.042))
        // Deeply forked streamer tail
        addCapsule(path, ox + tail * 0.55, 0, ox * 0.3, -h * 0.38 + wag, Math.max(1.2, len * 0.032))
        addCapsule(path, ox + tail * 0.55, 0, ox * 0.3, h * 0.38 + wag, Math.max(1.2, len * 0.032))
        return { path, height: h }
      }

      if (sil === 'beak-butterfly') {
        // Copperband Butterflyfish: forceps beak snout + steep diamond body + fan tail
        const beak = len * 0.16
        const bodyNose = nose - beak
        addCapsule(path, bodyNose - len * 0.02, 0, nose, 0, Math.max(1.4, h * 0.055))
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
        path.ellipse(ox + span * 0.54, 0, span * 0.42, h * 0.38, 0, 0, Math.PI * 2)
        // Unicorn horn jutting forward from forehead
        addCapsule(path, ox + span * 0.82, -h * 0.16, nose + len * 0.06, -h * 0.2, Math.max(1.3, h * 0.048))
        // Lunate crescent tail with long tips
        path.moveTo(ox + tail * 0.65, 0)
        path.quadraticCurveTo(ox + tail * 0.2, -h * 0.42, ox * 0.3, -h * 0.48 + wag)
        path.quadraticCurveTo(ox + tail * 0.38, wag * 0.5, ox * 0.3, h * 0.48 + wag)
        path.quadraticCurveTo(ox + tail * 0.2, h * 0.42, ox + tail * 0.65, 0)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'catfish') {
        // Mossback Otocinclus: flat belly, arched back, high shark dorsal sail, downward mouth barbels
        path.moveTo(nose, h * 0.16)
        path.quadraticCurveTo(ox + span * 0.65, -h * 0.36, ox + tail * 0.5, h * 0.04)
        path.lineTo(ox + tail * 0.5, h * 0.18)
        path.lineTo(nose, h * 0.18)
        path.closePath()
        // High triangular dorsal sail
        path.moveTo(ox + span * 0.68, -h * 0.12)
        path.lineTo(ox + span * 0.48, -h * 0.5)
        path.lineTo(ox + span * 0.36, -h * 0.04)
        path.closePath()
        // Sucker barbels at snout
        addCapsule(path, nose - len * 0.04, h * 0.16, nose + len * 0.03, h * 0.3, Math.max(1, len * 0.025))
        // Forked tail
        path.moveTo(ox + tail * 0.55, h * 0.1)
        path.lineTo(ox * 0.5, -h * 0.26 + wag)
        path.lineTo(ox + tail * 0.3, h * 0.1)
        path.lineTo(ox * 0.5, h * 0.38 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'fire-goby') {
        // Blushing Firefish: slender body + tall forward-flicking dorsal antenna flag + tapering rear fins
        const bodyH = h * 0.45
        path.ellipse(ox + span * 0.56, 0, span * 0.44, bodyH * 0.48, 0, 0, Math.PI * 2)
        // Iconic tall flicking first dorsal spine
        addCapsule(path, ox + span * 0.62, -bodyH * 0.3, ox + span * 0.74, -h * 0.5, Math.max(1.3, len * 0.032))
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
        path.ellipse(ox + span * 0.54, 0, span * 0.42, h * 0.42, 0, 0, Math.PI * 2)
        for (let i = 0; i < 4; i++) {
          const sx = ox + span * (0.34 + i * 0.11)
          addCapsule(path, sx, -h * 0.3, sx - len * 0.04, -h * 0.49, Math.max(1.2, len * 0.028))
        }
        path.moveTo(ox + tail * 0.6, 0)
        path.lineTo(ox * 0.5, -h * 0.28 + wag)
        path.lineTo(ox * 0.5, h * 0.28 + wag)
        path.closePath()
        return { path, height: h }
      }

      if (sil === 'veil-koi') {
        // Prism Koi: plump koi body + ultra-long flowing twin veil tail ribbons + wide pectoral wings + barbels
        path.moveTo(nose, 0)
        path.quadraticCurveTo(ox + span * 0.62, -h * 0.42, ox + tail * 0.65, -h * 0.14)
        path.quadraticCurveTo(ox + tail * 0.45, 0, ox + tail * 0.65, h * 0.14)
        path.quadraticCurveTo(ox + span * 0.62, h * 0.42, nose, 0)
        path.closePath()
        // Flowing veil tail ribbons
        path.moveTo(ox + tail * 0.68, 0)
        path.quadraticCurveTo(ox + tail * 0.2, -h * 0.54, ox * 0.1, -h * 0.42 + wag * 1.3)
        path.quadraticCurveTo(ox + tail * 0.32, wag * 0.4, ox * 0.1, h * 0.42 + wag * 1.3)
        path.quadraticCurveTo(ox + tail * 0.2, h * 0.54, ox + tail * 0.68, 0)
        path.closePath()
        // Dorsal sail & sweeping ventral fin
        path.moveTo(ox + span * 0.68, -h * 0.24)
        path.quadraticCurveTo(ox + span * 0.42, -h * 0.52, ox + tail * 0.72, -h * 0.14)
        path.closePath()
        path.moveTo(ox + span * 0.66, h * 0.22)
        path.lineTo(ox + span * 0.44, h * 0.48)
        path.lineTo(ox + span * 0.54, h * 0.2)
        path.closePath()
        // Koi whisker barbels
        addCapsule(path, nose - len * 0.02, h * 0.03, nose + len * 0.04, h * 0.18, Math.max(1, len * 0.022))
        return { path, height: h }
      }

      if (sil === 'lyretail') {
        // Royal Goldtail: swallowtail with long outer filaments + twin ventral streamers + continuous crest
        path.ellipse(ox + span * 0.55, 0, span * 0.42, h * 0.34, 0, 0, Math.PI * 2)
        // Continuous dorsal crest
        path.moveTo(ox + span * 0.75, -h * 0.22)
        path.quadraticCurveTo(ox + span * 0.45, -h * 0.48, ox + tail * 0.68, -h * 0.18)
        path.closePath()
        // Swallowtail streamers
        addCapsule(path, ox + tail * 0.62, -h * 0.08, ox * 0.15, -h * 0.45 + wag, Math.max(1.3, len * 0.032))
        addCapsule(path, ox + tail * 0.62, h * 0.08, ox * 0.15, h * 0.45 + wag, Math.max(1.3, len * 0.032))
        // Ventral streamers
        addCapsule(path, ox + span * 0.56, h * 0.24, ox + span * 0.34, h * 0.48, Math.max(1.1, len * 0.026))
        return { path, height: h }
      }

      if (sil === 'wrasse') {
        // Neon Cleaner Wrasse: sleek cigar body + rounded spade paddle tail + full-length low dorsal ridge
        path.ellipse(ox + span * 0.54, 0, span * 0.45, h * 0.38, 0, 0, Math.PI * 2)
        path.ellipse(ox + tail * 0.32, wag * 0.5, tail * 0.42, h * 0.36, 0, 0, Math.PI * 2)
        return { path, height: h }
      }

      if (sil === 'rhomboid-barb' || sil === 'tetra') {
        // Angular diamond characin/barb with sharp dorsal, anal, and ventral fins
        path.moveTo(nose, 0)
        path.lineTo(ox + span * 0.56, -h * 0.38)
        path.lineTo(ox + tail * 0.55, -h * 0.12)
        path.lineTo(ox + tail * 0.55, h * 0.12)
        path.lineTo(ox + span * 0.56, h * 0.38)
        path.closePath()
        // Sharp high dorsal fin
        path.moveTo(ox + span * 0.62, -h * 0.3)
        path.lineTo(ox + span * 0.44, -h * 0.52)
        path.lineTo(ox + span * 0.38, -h * 0.2)
        path.closePath()
        // Anal & pelvic triangular fins
        path.moveTo(ox + span * 0.54, h * 0.3)
        path.lineTo(ox + span * 0.38, h * 0.48)
        path.lineTo(ox + tail * 0.65, h * 0.14)
        path.closePath()
        // Forked tail
        path.moveTo(ox + tail * 0.58, 0)
        path.lineTo(ox * 0.5, -h * 0.38 + wag)
        path.lineTo(ox + tail * 0.3, 0)
        path.lineTo(ox * 0.5, h * 0.38 + wag)
        path.closePath()
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

      if (sil === 'damsel') {
        // Pointed pelvic fin on damselfish
        path.moveTo(ox + span * 0.62, h * 0.32)
        path.lineTo(ox + span * 0.44, h * 0.52)
        path.lineTo(ox + span * 0.5, h * 0.28)
        path.closePath()
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
  const sil = body.silhouette
  switch (form) {
    case 'jellyfish':
      return { x: len * 0.58, y: -h * 0.18, r: Math.max(1, len * 0.045) }
    case 'seahorse':
      return { x: len * 0.53, y: -h * 0.31, r: Math.max(1, len * 0.048) }
    case 'eel':
    case 'seasnake': {
      const isRibbon = sil === 'ribbon-eel'
      const waves = isRibbon ? 2.6 : form === 'seasnake' ? 2.2 : 1.4
      const amp = h * (isRibbon ? 0.28 : form === 'seasnake' ? 0.25 : 0.18)
      const headY = Math.sin(0.9 * Math.PI * waves + animPhase * 3.8) * amp
      return { x: len * 0.86, y: headY - h * 0.04, r: Math.max(1, len * 0.042) }
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
      if (sil === 'beak-butterfly') {
        return { x: ox + span * 0.68, y: -h * 0.1, r: Math.max(1, len * 0.052) }
      }
      if (sil === 'spiky-puffer') {
        return { x: len * 0.72, y: -h * 0.1, r: Math.max(1.2, len * 0.06) }
      }
      if (sil === 'moorish-idol') {
        return { x: ox + span * 0.72, y: -h * 0.1, r: Math.max(1, len * 0.052) }
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

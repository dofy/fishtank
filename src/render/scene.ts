import { isAdult, syncDecor, tankFish } from '../core/game'
import { decorItem } from '../core/species'
import type { DecorId, DecorItem, Fish, GameState, Species } from '../core/types'
import { hashString } from './shape'

export interface Agent {
  fish: Fish
  species: Species
  x: number
  y: number
  /** -1 swims left, 1 swims right. */
  dir: 1 | -1
  speed: number
  /** Tail-beat / locomotion phase offset. */
  phase: number
  /** 0.65 for fry, 1 for adults. */
  scale: number
  /** Pitch angle in radians (in local facing space). */
  tilt?: number
  /** Preferred normalized depth (0.18..0.72). */
  baseDepth?: number
  /** True while dropping from the top of the tank into the water. */
  dropping?: boolean
  /** Vertical velocity during drop-in or pulsing. */
  vy?: number
  /** True once the dropping fish has crossed the waterline and spawned a splash. */
  splashed?: boolean
}

export interface SplashEffect {
  x: number
  y: number
  age: number
  duration: number
}

export interface DecorNode {
  item: DecorItem
  /** Pixel X coordinate on the tank floor. */
  x: number
  /** Orientation: 1 or -1. */
  flip: 1 | -1
  /** True when the user is hovering or dragging this decoration. */
  active: boolean
}

export interface SceneView {
  width: number
  height: number
  agents: Agent[]
  decors: DecorNode[]
  splashes?: SplashEffect[]
  /** Seconds since start, for idle motion. */
  time: number
  /** True in dark/night mode, turning on the aquarium decorative lamps. */
  night?: boolean
}

/** Swimming state lives outside the save: it is scenery, not progress. */
export class Scene {
  private agents = new Map<string, Agent>()
  private decors: DecorNode[] = []
  private splashes: SplashEffect[] = []
  private initialized = false
  activeDecorId: DecorId | null = null

  sync(
    state: GameState,
    lookup: (id: string) => Species,
    width: number,
    height: number,
    now: number,
  ): void {
    const live = new Set<string>()
    for (const fish of tankFish(state)) {
      live.add(fish.uid)
      const adult = isAdult(fish, now)
      const existing = this.agents.get(fish.uid)
      if (existing) {
        existing.fish = fish
        existing.scale = adult ? 1 : 0.65
        continue
      }
      const seed = hashString(fish.uid)
      const baseDepth = 0.2 + (((seed >> 10) % 1000) / 1000) * 0.52
      const shouldDrop = this.initialized
      const spawnX = width * (0.15 + ((seed % 1000) / 1000) * 0.7)
      this.agents.set(fish.uid, {
        fish,
        species: lookup(fish.speciesId),
        x: spawnX,
        y: shouldDrop ? -28 : height * baseDepth,
        dir: (seed & 1) === 0 ? 1 : -1,
        speed: 18 + ((seed >> 3) % 20),
        phase: ((seed >> 5) % 628) / 100,
        scale: adult ? 1 : 0.65,
        tilt: shouldDrop ? 0.42 : 0,
        baseDepth,
        dropping: shouldDrop,
        vy: shouldDrop ? 230 : 0,
        splashed: !shouldDrop,
      })
    }
    for (const uid of [...this.agents.keys()]) {
      if (!live.has(uid)) this.agents.delete(uid)
    }
    this.initialized = true

    this.decors = syncDecor(state).map((placed) => ({
      item: decorItem(placed.id),
      x: placed.x * width,
      flip: placed.flip === -1 ? -1 : 1,
      active: this.activeDecorId === placed.id,
    }))
  }

  /** Hit-test decorations on the tank floor or top ceiling (top-most / last placed first). */
  hitDecor(px: number, py: number, height: number): DecorId | null {
    const floorY = height - 14
    for (let i = this.decors.length - 1; i >= 0; i--) {
      const d = this.decors[i]!
      const hw = d.item.width * 0.5 + 8
      if (d.item.mount === 'top') {
        const bottom = 4 + d.item.height + 10
        if (px >= d.x - hw && px <= d.x + hw && py >= 0 && py <= bottom) {
          return d.item.id
        }
      } else {
        const top = floorY - d.item.height - 8
        if (px >= d.x - hw && px <= d.x + hw && py >= top && py <= height) {
          return d.item.id
        }
      }
    }
    return null
  }

  update(dt: number, width: number, height: number, time: number): void {
    // Update water entry splashes
    for (const s of this.splashes) s.age += dt
    this.splashes = this.splashes.filter((s) => s.age < s.duration)

    const minY = 28
    const maxY = Math.max(minY + 20, height - 44)

    for (const a of this.agents.values()) {
      const targetY = Math.min(maxY, Math.max(minY, height * (a.baseDepth ?? 0.45)))

      // Drop-in from above the tank when newly placed
      if (a.dropping) {
        const waterlineY = 16
        let vy = a.vy ?? 220
        if (a.y < waterlineY) {
          // Freefall in air
          vy += 420 * dt
          a.y += vy * dt
          a.tilt = 0.45
        } else {
          if (!a.splashed) {
            a.splashed = true
            this.splashes.push({ x: a.x, y: waterlineY, age: 0, duration: 0.75 })
          }
          // Underwater deceleration + spring toward target depth
          vy *= Math.exp(-5.2 * dt)
          a.y += vy * dt + (targetY - a.y) * Math.min(1, dt * 3.8)
          a.x += a.dir * a.speed * 0.5 * dt
          a.tilt = (a.tilt ?? 0) * Math.exp(-6 * dt)
          if (Math.abs(vy) < 12 && Math.abs(a.y - targetY) < 14) {
            a.dropping = false
            a.vy = 0
            a.tilt = 0
          }
        }
        a.vy = vy
        continue
      }

      const form = a.species.body.form ?? 'fish'
      const body = a.species.body
      const p = time + a.phase

      switch (form) {
        case 'jellyfish': {
          // Vertical pulsing propulsion: contract to rise, relax to parachute down
          const pulse = Math.sin(p * 2.2)
          const vy = pulse > 0 ? -pulse * 32 : -pulse * 15
          const vx = a.dir * a.speed * (0.28 + Math.max(0, pulse) * 0.25)
          a.x += vx * dt
          a.y += vy * dt + (targetY - a.y) * 0.35 * dt
          a.tilt = Math.sin(p * 1.1) * 0.08
          break
        }

        case 'seahorse': {
          // Upright slow hovering with figure-8 vertical bobbing
          const vx = a.dir * a.speed * 0.48
          const vy = Math.sin(p * 2.0) * 16 + Math.cos(p * 1.0) * 8
          a.x += vx * dt
          a.y += vy * dt + (targetY - a.y) * 0.5 * dt
          a.tilt = 0.05 + Math.sin(p * 2.0) * 0.04
          break
        }

        case 'eel':
        case 'seasnake': {
          // S-wave slithering trajectory across the water column
          const freq = form === 'seasnake' ? 3.2 : 2.6
          const amp = form === 'seasnake' ? 28 : 22
          const waveCos = Math.cos(p * freq)
          a.x += a.dir * a.speed * 1.25 * dt
          a.y += waveCos * amp * dt + (targetY - a.y) * 0.6 * dt
          a.tilt = waveCos * 0.16
          break
        }

        case 'ray': {
          // Wide, sweeping soaring arcs (glide dive and climb)
          const glide = Math.sin(p * 1.15)
          a.x += a.dir * a.speed * (1.05 + Math.abs(glide) * 0.25) * dt
          a.y += glide * 24 * dt + (targetY - a.y) * 0.4 * dt
          a.tilt = glide * 0.18
          break
        }

        case 'turtle': {
          // Flipper-stroke burst & long coasting glide
          const stroke = Math.max(0, Math.sin(p * 2.4))
          const speedMult = 0.55 + stroke * 0.95
          const vy = (stroke - 0.35) * -14
          a.x += a.dir * a.speed * speedMult * dt
          a.y += vy * dt + (targetY - a.y) * 0.5 * dt
          a.tilt = (stroke - 0.3) * -0.1
          break
        }

        case 'fish':
        default: {
          if (body.depth < 0.44) {
            // Slender/torpedo fish: quick dart-and-coast bursts
            const burst = Math.pow(Math.max(0, Math.sin(p * 2.8)), 2)
            const vy = Math.sin(p * 1.9) * 12
            a.x += a.dir * a.speed * (0.75 + burst * 1.15) * dt
            a.y += vy * dt + (targetY - a.y) * 0.6 * dt
            a.tilt = (vy / 40) * 0.14
          } else if (body.depth > 0.82) {
            // Round/deep reef fish (butterflyfish, puffer): calm hover & curious bobbing
            const cruise = 0.6 + 0.35 * Math.sin(p * 1.3)
            const vy = Math.sin(p * 1.6) * 10
            a.x += a.dir * a.speed * cruise * dt
            a.y += vy * dt + (targetY - a.y) * 0.5 * dt
            a.tilt = Math.sin(p * 1.6) * 0.06
          } else {
            // Standard reef fish: smooth cruising
            const vy = Math.sin(p * 1.4) * 11
            a.x += a.dir * a.speed * dt
            a.y += vy * dt + (targetY - a.y) * 0.5 * dt
            a.tilt = Math.sin(p * 1.4) * 0.08
          }
          break
        }
      }

      const halfLen = a.species.body.length * 4.2 * a.scale * 0.5
      const margin = Math.max(36, halfLen + 10)
      if (a.x < margin) {
        a.x = margin
        a.dir = 1
      } else if (a.x > width - margin) {
        a.x = width - margin
        a.dir = -1
      }
      a.y = Math.min(maxY, Math.max(minY, a.y))
    }
  }

  view(width: number, height: number, time: number, night = true): SceneView {
    return {
      width,
      height,
      agents: [...this.agents.values()],
      decors: this.decors,
      splashes: this.splashes,
      time,
      night,
    }
  }
}

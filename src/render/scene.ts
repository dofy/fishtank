import { isAdult, syncDecor, tankFish } from '../core/game'
import { decorItem } from '../core/species'
import type { DecorId, DecorItem, Fish, GameState, RailLightConfig, Species } from '../core/types'
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
  /** Remaining seconds of startle/flee burst when clicked. */
  scaredTimer?: number
  /** Horizontal escape speed while startled. */
  scaredVx?: number
  /** Vertical escape velocity while startled. */
  scaredVy?: number
  /** Recent click timestamps (ms) within 30s window, for electric eel 6-click discharge. */
  clickTimestamps?: number[]
  /** Remaining seconds of satiety cooldown after eating a pellet (9s). */
  eatCooldown?: number
  /** Remaining seconds that this fish is stunned by an electric eel discharge (3s). */
  shockedTimer?: number
  /** Remaining seconds that this electric eel is actively emitting lightning. */
  dischargingTimer?: number
  /** Cooldown before this electric eel can discharge again. */
  zapCooldown?: number
}

export interface SplashEffect {
  x: number
  y: number
  age: number
  duration: number
}

export interface FoodPellet {
  id: number
  x: number
  y: number
  vy: number
  seed: number
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
  foods?: FoodPellet[]
  /** Palette index (0..6) for each of the 3 overhead aquarium lamps. */
  lampColors?: [number, number, number]
  /** Seconds since start, for idle motion. */
  time: number
  /** True in dark/night mode, turning on the aquarium decorative lamps. */
  night?: boolean
  railLights?: RailLightConfig
  reducedMotion?: boolean
}

let nextPelletId = 1

/** Swimming state lives outside the save: it is scenery, not progress. */
export class Scene {
  private agents = new Map<string, Agent>()
  private decors: DecorNode[] = []
  private splashes: SplashEffect[] = []
  private foods: FoodPellet[] = []
  /** Current color index (0..6) for the 3 overhead lamps. */
  private lampColors: [number, number, number] = [1, 4, 1]
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
      const baseDepth = 0.28 + Math.random() * 0.56
      const shouldDrop = this.initialized
      const spawnX = width * (0.12 + Math.random() * 0.76)
      const dropVy = 260 + Math.random() * 190
      this.agents.set(fish.uid, {
        fish,
        species: lookup(fish.speciesId),
        x: spawnX,
        y: shouldDrop ? -32 : height * baseDepth,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 18 + ((seed >> 3) % 20),
        phase: Math.random() * Math.PI * 2,
        scale: adult ? 1 : 0.65,
        tilt: shouldDrop ? 0.52 : 0,
        baseDepth,
        dropping: shouldDrop,
        vy: shouldDrop ? dropVy : 0,
        splashed: !shouldDrop,
        zapCooldown: 8 + Math.random() * 14,
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

  /** Hit-test swimming fish in the tank (top-most first). */
  hitFish(px: number, py: number): string | null {
    const list = [...this.agents.values()]
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i]!
      if (a.dropping) continue
      const len = a.species.body.length * 4.2 * a.scale
      const h = Math.max(24, len * a.species.body.depth)
      if (Math.abs(px - a.x) <= len * 0.55 && Math.abs(py - a.y) <= h * 0.65) {
        return a.fish.uid
      }
    }
    return null
  }

  /** Startle a fish so it darts a long horizontal distance away from the click point. */
  scareFish(
    uid: string,
    clickX: number,
    clickY: number,
    width: number,
    height: number,
    now = Date.now(),
  ): 'scared' | 'zapped' | false {
    const a = this.agents.get(uid)
    if (!a || a.dropping) return false

    // Track clicks within a 30s sliding window; 6 clicks on a Volt Electric Eel triggers immediate discharge
    const recent = (a.clickTimestamps ?? []).filter((ts) => now - ts <= 30_000)
    recent.push(now)
    a.clickTimestamps = recent
    if (a.fish.speciesId === 'volteel' && recent.length >= 6) {
      a.clickTimestamps = []
      const night = typeof document !== 'undefined' && document.documentElement.dataset.mode !== 'light'
      this.triggerDischarge(a, undefined, night)
      return 'zapped'
    }

    const halfLen = a.species.body.length * 4.2 * a.scale * 0.5
    const margin = Math.max(40, halfLen + 14)

    // Pick horizontal escape direction with ample room to dart across the tank
    let escapeDir: 1 | -1 = a.x >= clickX ? 1 : -1
    if (escapeDir === -1 && a.x < margin + 160) escapeDir = 1
    else if (escapeDir === 1 && a.x > width - margin - 160) escapeDir = -1

    a.dir = escapeDir
    a.scaredTimer = 1.35
    a.scaredVx = 310 + Math.random() * 90
    const dy = a.y - clickY
    a.scaredVy = (dy >= 0 ? 1 : -1) * (55 + Math.random() * 40)
    a.baseDepth = Math.min(0.82, Math.max(0.22, (a.y + a.scaredVy * 0.4) / Math.max(1, height)))
    this.splashes.push({ x: a.x, y: a.y, age: 0, duration: 0.45 })
    return 'scared'
  }

  /** Drop one food pellet at (px, py) that sinks toward the bottom and disappears on the floor. */
  spawnFood(px: number, py: number, width: number, height: number): void {
    const clampedX = Math.min(width - 18, Math.max(18, px))
    const clampedY = Math.min(height - 26, Math.max(14, py))
    this.foods.push({
      id: nextPelletId++,
      x: clampedX,
      y: clampedY,
      vy: 24 + Math.random() * 8,
      seed: Math.random() * Math.PI * 2,
    })
  }

  /** Trigger an electric discharge from an electric eel, stunning all other fish for 3s. */
  private triggerDischarge(eel: Agent, onZap?: () => void, night = true): void {
    eel.dischargingTimer = 0.85
    eel.zapCooldown = 22 + Math.random() * 18
    for (const other of this.agents.values()) {
      if (other.fish.uid === eel.fish.uid || other.dropping) continue
      other.shockedTimer = 3.0
      other.scaredTimer = 0
    }
    // When lamps are lit in night mode, randomly switch one of the 3 overhead lamps to a new color from the 7-color palette
    if (night) {
      const lampIdx = Math.floor(Math.random() * 3) as 0 | 1 | 2
      const current = this.lampColors[lampIdx]
      const nextColor = (current + 1 + Math.floor(Math.random() * 6)) % 7
      this.lampColors[lampIdx] = nextColor
    }
    onZap?.()
  }

  update(
    dt: number,
    width: number,
    height: number,
    time: number,
    onEat?: () => void,
    onZap?: () => void,
    night = true,
  ): void {
    // Update water entry splashes
    for (const s of this.splashes) s.age += dt
    this.splashes = this.splashes.filter((s) => s.age < s.duration)

    // Update sinking food pellets; remove once they touch the sand floor
    const floorY = height - 18
    for (const f of this.foods) {
      f.y += f.vy * dt
      f.x += Math.sin(time * 2.6 + f.seed) * 7 * dt
      f.x = Math.min(width - 14, Math.max(14, f.x))
    }
    this.foods = this.foods.filter((f) => f.y < floorY)

    const minY = 28
    const maxY = Math.max(minY + 20, height - 44)

    for (const a of this.agents.values()) {
      if (a.eatCooldown && a.eatCooldown > 0) {
        a.eatCooldown = Math.max(0, a.eatCooldown - dt)
      }
      if (a.dischargingTimer && a.dischargingTimer > 0) {
        a.dischargingTimer = Math.max(0, a.dischargingTimer - dt)
      }
      if (a.zapCooldown && a.zapCooldown > 0) {
        a.zapCooldown = Math.max(0, a.zapCooldown - dt)
      }

      // Low-probability spontaneous electric discharge when Volt Electric Eel is swimming
      if (
        a.fish.speciesId === 'volteel' &&
        !a.dropping &&
        (!a.zapCooldown || a.zapCooldown <= 0) &&
        (!a.shockedTimer || a.shockedTimer <= 0) &&
        this.agents.size > 1 &&
        Math.random() < dt * 0.04
      ) {
        this.triggerDischarge(a, onZap, night)
      }

      const targetY = Math.min(maxY, Math.max(minY, height * (a.baseDepth ?? 0.45)))
      const halfLen = a.species.body.length * 4.2 * a.scale * 0.5
      const margin = Math.max(36, halfLen + 10)

      // 1. Drop-in from above the tank when newly placed
      if (a.dropping) {
        const waterlineY = 16
        let vy = a.vy ?? 220
        if (a.y < waterlineY) {
          vy += 420 * dt
          a.y += vy * dt
          a.tilt = 0.45
        } else {
          if (!a.splashed) {
            a.splashed = true
            this.splashes.push({ x: a.x, y: waterlineY, age: 0, duration: 0.75 })
          }
          vy *= Math.exp(-3.1 * dt)
          a.y = Math.min(maxY, a.y + vy * dt + (targetY - a.y) * Math.min(1, dt * 2.4))
          a.x += a.dir * a.speed * 0.65 * dt
          a.tilt = (a.tilt ?? 0) * Math.exp(-4.5 * dt)
          if (Math.abs(vy) < 14 && Math.abs(a.y - targetY) < 16) {
            a.dropping = false
            a.vy = 0
            a.tilt = 0
          }
        }
        a.vy = vy
        continue
      }

      // 1.5. Stunned for 3s when shocked by an electric eel
      if (a.shockedTimer && a.shockedTimer > 0) {
        a.shockedTimer = Math.max(0, a.shockedTimer - dt)
        a.y = Math.min(maxY, Math.max(minY, a.y + Math.sin(time * 36 + a.phase) * 6 * dt))
        a.tilt = Math.sin(time * 52 + a.phase) * 0.16
        if (a.shockedTimer <= 0) {
          a.tilt = 0
        }
        continue
      }

      // 2. Startled escape burst when clicked (or brisk swim-away after eating)
      if (a.scaredTimer && a.scaredTimer > 0) {
        a.scaredTimer = Math.max(0, a.scaredTimer - dt)
        const vx = a.scaredVx ?? a.speed * 3.5
        a.x += a.dir * vx * dt
        a.scaredVx = Math.max(a.speed * 1.4, vx * Math.exp(-1.45 * dt))
        a.y += (a.scaredVy ?? 0) * dt
        a.scaredVy = (a.scaredVy ?? 0) * Math.exp(-3.2 * dt)
        a.phase += dt * 11
        a.tilt = ((a.scaredVy ?? 0) / 140) * 0.22

        if (a.x < margin) {
          a.x = margin
          a.dir = 1
        } else if (a.x > width - margin) {
          a.x = width - margin
          a.dir = -1
        }
        a.y = Math.min(maxY, Math.max(minY, a.y))
        continue
      }

      // 3. Spot and chase nearest sinking food pellet within detection range (if not on 9s satiety cooldown)
      let nearestFood: FoodPellet | null = null
      if (!a.eatCooldown || a.eatCooldown <= 0) {
        let bestDist = 280
        for (const f of this.foods) {
          const d = Math.hypot(f.x - a.x, f.y - a.y)
          if (d < bestDist) {
            bestDist = d
            nearestFood = f
          }
        }
      }

      if (nearestFood) {
        const dx = nearestFood.x - a.x
        const dy = nearestFood.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        if (Math.abs(dx) > 3) {
          a.dir = dx >= 0 ? 1 : -1
        }
        const chaseSpeed = Math.max(58, a.speed * 2.5)
        a.x += (dx / dist) * chaseSpeed * dt
        a.y += (dy / dist) * chaseSpeed * dt
        a.phase += dt * 6
        a.tilt = Math.max(-0.38, Math.min(0.38, Math.atan2(dy, Math.abs(dx) + 8) * 0.7))

        // Mouth position in world space
        const mouthX = a.x + a.dir * (halfLen * 0.7)
        const mouthDist = Math.hypot(nearestFood.x - mouthX, nearestFood.y - a.y)
        if (mouthDist < 18 || dist < 15) {
          this.foods = this.foods.filter((f) => f.id !== nearestFood.id)
          a.eatCooldown = 9
          // Swim away after eating: pick a fresh cruising depth and briskly glide away
          a.dir = Math.random() < 0.65 ? (-a.dir as 1 | -1) : a.dir
          a.baseDepth = 0.25 + Math.random() * 0.52
          a.scaredTimer = 0.65
          a.scaredVx = 125 + Math.random() * 45
          a.scaredVy = (Math.random() - 0.5) * 55
          this.splashes.push({ x: nearestFood.x, y: nearestFood.y, age: 0.2, duration: 0.45 })
          onEat?.()
        }

        a.x = Math.min(width - margin, Math.max(margin, a.x))
        a.y = Math.min(maxY, Math.max(minY, a.y))
        continue
      }

      // 4. Normal species-specific locomotion
      const form = a.species.body.form ?? 'fish'
      const body = a.species.body
      const p = time + a.phase

      switch (form) {
        case 'jellyfish': {
          const pulse = Math.sin(p * 2.2)
          const vy = pulse > 0 ? -pulse * 32 : -pulse * 15
          const vx = a.dir * a.speed * (0.28 + Math.max(0, pulse) * 0.25)
          a.x += vx * dt
          a.y += vy * dt + (targetY - a.y) * 0.35 * dt
          a.tilt = Math.sin(p * 1.1) * 0.08
          break
        }

        case 'seahorse': {
          const vx = a.dir * a.speed * 0.48
          const vy = Math.sin(p * 2.0) * 16 + Math.cos(p * 1.0) * 8
          a.x += vx * dt
          a.y += vy * dt + (targetY - a.y) * 0.5 * dt
          a.tilt = 0.05 + Math.sin(p * 2.0) * 0.04
          break
        }

        case 'eel':
        case 'seasnake': {
          const freq = form === 'seasnake' ? 3.2 : 2.6
          const amp = form === 'seasnake' ? 28 : 22
          const waveCos = Math.cos(p * freq)
          a.x += a.dir * a.speed * 1.25 * dt
          a.y += waveCos * amp * dt + (targetY - a.y) * 0.6 * dt
          a.tilt = waveCos * 0.16
          break
        }

        case 'ray': {
          const glide = Math.sin(p * 1.15)
          a.x += a.dir * a.speed * (1.05 + Math.abs(glide) * 0.25) * dt
          a.y += glide * 24 * dt + (targetY - a.y) * 0.4 * dt
          a.tilt = glide * 0.18
          break
        }

        case 'turtle': {
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
            const burst = Math.pow(Math.max(0, Math.sin(p * 2.8)), 2)
            const vy = Math.sin(p * 1.9) * 12
            a.x += a.dir * a.speed * (0.75 + burst * 1.15) * dt
            a.y += vy * dt + (targetY - a.y) * 0.6 * dt
            a.tilt = (vy / 40) * 0.14
          } else if (body.depth > 0.82) {
            const cruise = 0.6 + 0.35 * Math.sin(p * 1.3)
            const vy = Math.sin(p * 1.6) * 10
            a.x += a.dir * a.speed * cruise * dt
            a.y += vy * dt + (targetY - a.y) * 0.5 * dt
            a.tilt = Math.sin(p * 1.6) * 0.06
          } else {
            const vy = Math.sin(p * 1.4) * 11
            a.x += a.dir * a.speed * dt
            a.y += vy * dt + (targetY - a.y) * 0.5 * dt
            a.tilt = Math.sin(p * 1.4) * 0.08
          }
          break
        }
      }

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
      foods: this.foods,
      lampColors: [...this.lampColors] as [number, number, number],
      time,
      night,
    }
  }
}

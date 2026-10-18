import { isAdult, tankFish } from '../core/game'
import type { Fish, GameState, Species } from '../core/types'
import { hashString } from './shape'

export interface Agent {
  fish: Fish
  species: Species
  x: number
  y: number
  /** -1 swims left, 1 swims right. */
  dir: 1 | -1
  speed: number
  /** Tail-beat phase offset, keeps a school from flapping in lockstep. */
  phase: number
  /** 0.55 for fry, 1 for adults. */
  scale: number
}

export interface SceneView {
  width: number
  height: number
  agents: Agent[]
  /** Seconds since start, for idle motion. */
  time: number
}

/** Swimming state lives outside the save: it is scenery, not progress. */
export class Scene {
  private agents = new Map<string, Agent>()

  sync(state: GameState, lookup: (id: string) => Species, width: number, height: number, now: number): void {
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
      this.agents.set(fish.uid, {
        fish,
        species: lookup(fish.speciesId),
        x: ((seed % 1000) / 1000) * width,
        y: height * (0.2 + (((seed >> 10) % 1000) / 1000) * 0.56),
        dir: (seed & 1) === 0 ? 1 : -1,
        speed: 14 + ((seed >> 3) % 18),
        phase: ((seed >> 5) % 628) / 100,
        scale: adult ? 1 : 0.65,
      })
    }
    for (const uid of [...this.agents.keys()]) if (!live.has(uid)) this.agents.delete(uid)
  }

  update(dt: number, width: number, height: number, time: number): void {
    for (const a of this.agents.values()) {
      a.x += a.dir * a.speed * dt
      a.y += Math.sin(time * 0.8 + a.phase) * 5 * dt
      const halfLen = a.species.body.length * 4.2 * a.scale * 0.5
      const margin = Math.max(36, halfLen + 10)
      if (a.x < margin) {
        a.x = margin
        a.dir = 1
      } else if (a.x > width - margin) {
        a.x = width - margin
        a.dir = -1
      }
      a.y = Math.min(height - 38, Math.max(28, a.y))
    }
  }

  view(width: number, height: number, time: number): SceneView {
    return { width, height, agents: [...this.agents.values()], time }
  }
}

import { isAdult, makeFish, recordVariant, rollUses, syncTank, capacity } from './game'
import { HIDDEN_SPECIES, poolForTier } from './species'
import { Rng, rng } from './rng'
import type { Fish, GameState, Grade } from './types'

export const REFORGE_INPUT_COUNT = 3
export const HIDDEN_CHANCE = 0.2
export const REFORGE_PITY = 10
export type ReforgeError = 'wrong-count' | 'not-mythic' | 'has-uses' | 'locked-material' | 'in-tank' | 'not-adult'

export function reforgeCandidates(state: GameState, now = Date.now()): Fish[] {
  const displayed = new Set(state.tankUids ?? [])
  return state.fish.filter(f => f.tier === 5 && f.uses === 0 && !f.locked && !displayed.has(f.uid) && isAdult(f, now))
}

export function reforgeMisses(state: GameState): number {
  const value = state.reforgeMisses
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < REFORGE_PITY ? value : 0
}

/** Pick one high grade plus two low grades; never change locks or display state. */
export function autoPickForReforge(state: GameState, now = Date.now()): string[] {
  const pool = reforgeCandidates(state, now).sort((a, b) => b.grade - a.grade || a.bornAt - b.bornAt)
  const lead = pool.shift()
  return lead ? [lead, ...pool.sort((a, b) => a.grade - b.grade || a.bornAt - b.bornAt).slice(0, 2)].map(f => f.uid) : []
}

/** Validate the whole transaction before consuming fish or advancing the saved pity. */
export function reforge(state: GameState, uids: string[], now = Date.now(), random: Rng = rng):
  { child: Fish; tier: 5; novel: boolean; guaranteed: boolean } | { error: ReforgeError } {
  if (uids.length !== REFORGE_INPUT_COUNT || new Set(uids).size !== REFORGE_INPUT_COUNT) return { error: 'wrong-count' }
  const materials = uids.map(id => state.fish.find(f => f.uid === id))
  if (materials.some(f => !f)) return { error: 'wrong-count' }
  const fish = materials as Fish[]
  if (fish.some(f => f.locked)) return { error: 'locked-material' }
  if (fish.some(f => f.tier !== 5)) return { error: 'not-mythic' }
  if (fish.some(f => f.uses !== 0)) return { error: 'has-uses' }
  if (fish.some(f => state.tankUids?.includes(f.uid))) return { error: 'in-tank' }
  if (fish.some(f => !isAdult(f, now))) return { error: 'not-adult' }

  const missing = HIDDEN_SPECIES.filter(s => !state.discovered.includes(s.id))
  const guaranteed = missing.length > 0 && reforgeMisses(state) >= REFORGE_PITY - 1
  const pool = guaranteed ? missing : random.next() < HIDDEN_CHANCE ? HIDDEN_SPECIES : poolForTier(5)
  const chosen = random.pick(pool)
  const novel = !state.discovered.includes(chosen.id)
  const newHidden = chosen.hidden && novel
  const grade = Math.max(...fish.map(f => f.grade)) as Grade
  const child = makeFish(chosen.id, 5, grade, now, { uses: rollUses(5, random) })
  const consumed = new Set(uids)
  state.fish = state.fish.filter(f => !consumed.has(f.uid))
  state.fish.push(child)
  state.reforgeMisses = missing.length === 0 || newHidden ? 0 : reforgeMisses(state) + 1
  recordVariant(state, chosen.id, grade)
  const tank = syncTank(state)
  if (tank.length < capacity(state)) state.tankUids = [...tank, child.uid]
  return { child, tier: 5, novel, guaranteed }
}

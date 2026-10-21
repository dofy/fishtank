import { hasSpecies } from './species'
import type { BreedGoal, Fish, GameState, Grade } from './types'

const BREED_GOALS = new Set<BreedGoal>(['species', 'variant', 'tier', 'target'])
const GRADES: Grade[] = [1, 2, 3, 4, 5]

function normalizedNickname(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const compact = value.trim().replace(/\s+/gu, ' ')
  if (!compact) return undefined
  return Array.from(compact).slice(0, 24).join('').trimEnd()
}

function fishByUid(state: GameState, uid: string): Fish | undefined {
  return state.fish.find(fish => fish.uid === uid)
}

export function setFishLocked(state: GameState, uid: string, value: boolean): boolean {
  const fish = fishByUid(state, uid)
  if (!fish) return false
  fish.locked = Boolean(value)
  return true
}

/** Protect only the specimens currently held; future arrivals keep their own lock state. */
export function lockOwnedSpecies(state: GameState, speciesId: Fish['speciesId']): number {
  let changed = 0
  for (const fish of state.fish) {
    if (fish.speciesId !== speciesId || fish.locked) continue
    fish.locked = true
    changed++
  }
  return changed
}

/** Normalize collection preferences and fish metadata from persisted/untrusted state. */
export function syncCollectionPreferences(state: GameState): void {
  // Retain nickname/favorite only as inert metadata from older saves.
  for (const fish of state.fish) {
    const nickname = normalizedNickname(fish.nickname)
    if (nickname === undefined) delete fish.nickname
    else fish.nickname = nickname
    if (typeof fish.favorite !== 'boolean') delete fish.favorite
    if (typeof fish.locked !== 'boolean') delete fish.locked
  }

  // Retain valid legacy metadata for save compatibility; gameplay never reads it.
  if (state.breedGoal !== undefined && !BREED_GOALS.has(state.breedGoal)) delete state.breedGoal

  const target = state.collectionTarget
  if (
    !target ||
    typeof target !== 'object' ||
    typeof target.speciesId !== 'string' ||
    !hasSpecies(target.speciesId) ||
    (target.grade !== undefined && !GRADES.includes(target.grade))
  ) {
    delete state.collectionTarget
    return
  }
  state.collectionTarget = target.grade === undefined
    ? { speciesId: target.speciesId }
    : { speciesId: target.speciesId, grade: target.grade }
}

import { SPECIES, hasSpecies } from './species'
import type { GameState, Grade, MilestoneId } from './types'

export interface MilestoneDescriptor {
  id: MilestoneId
  total: number
}

export interface MilestoneProgress extends MilestoneDescriptor {
  current: number
  unlocked: boolean
}

export const MILESTONES: readonly MilestoneDescriptor[] = [
  { id: 'first-friend', total: 1 },
  { id: 'tier-one', total: SPECIES.filter((item) => item.tier === 1).length },
  { id: 'jelly-family', total: SPECIES.filter((item) => item.body.form === 'jellyfish').length },
  { id: 'grade-five', total: 1 },
  { id: 'variant-collector', total: 25 },
  { id: 'reef-explorer', total: SPECIES.length },
  { id: 'reef-rookie', total: 5 },
  { id: 'reef-naturalist', total: 15 },
  { id: 'rare-encounter', total: 1 },
  { id: 'legend-encounter', total: 1 },
  { id: 'mythic-encounter', total: 1 },
  { id: 'eel-family', total: SPECIES.filter(item => item.body.form === 'eel').length },
  { id: 'color-palette', total: 5 },
  { id: 'variant-master', total: 60 },
]

export const MILESTONE_IDS: readonly MilestoneId[] = MILESTONES.map((item) => item.id)

const ID_SET = new Set<MilestoneId>(MILESTONE_IDS)
const TIER_ONE_IDS = new Set(SPECIES.filter((item) => item.tier === 1).map((item) => item.id))
const JELLY_IDS = new Set(
  SPECIES.filter((item) => item.body.form === 'jellyfish').map((item) => item.id),
)
const NONSTARTER_IDS = new Set(SPECIES.filter((item) => item.tier > 0).map((item) => item.id))

function isMilestoneId(value: unknown): value is MilestoneId {
  return typeof value === 'string' && ID_SET.has(value as MilestoneId)
}

function variantParts(key: string): { speciesId: string; grade: Grade } | null {
  const match = /^([^:]+):([1-5])$/.exec(key)
  if (!match || !hasSpecies(match[1]!)) return null
  return { speciesId: match[1]!, grade: Number(match[2]) as Grade }
}

function evidence(state: GameState): { species: Set<string>; variants: Set<string> } {
  const knownSpecies = new Set<string>()
  const knownVariants = new Set<string>()

  for (const speciesId of state.discovered ?? []) {
    if (hasSpecies(speciesId)) knownSpecies.add(speciesId)
  }
  for (const key of state.discoveredVariants ?? []) {
    const parts = typeof key === 'string' ? variantParts(key) : null
    if (!parts) continue
    knownSpecies.add(parts.speciesId)
    knownVariants.add(`${parts.speciesId}:${parts.grade}`)
  }
  for (const fish of state.fish ?? []) {
    if (!fish || !hasSpecies(fish.speciesId) || fish.grade < 1 || fish.grade > 5) continue
    knownSpecies.add(fish.speciesId)
    knownVariants.add(`${fish.speciesId}:${fish.grade}`)
  }
  return { species: knownSpecies, variants: knownVariants }
}

/** Calculate collection progress without mutating save state. */
export function milestoneProgress(state: GameState): MilestoneProgress[] {
  const known = evidence(state)
  const unlocked = new Set(
    Array.isArray(state.milestones?.unlocked)
      ? state.milestones.unlocked.filter(isMilestoneId)
      : [],
  )
  const nonstarterSpecies = [...known.species].filter((id) => NONSTARTER_IDS.has(id)).length
  const tierOne = [...known.species].filter((id) => TIER_ONE_IDS.has(id)).length
  const jellyfish = [...known.species].filter((id) => JELLY_IDS.has(id)).length
  const nonstarterVariants = [...known.variants].filter((key) => {
    const parts = variantParts(key)
    return parts !== null && NONSTARTER_IDS.has(parts.speciesId)
  })
  const gradeFive = nonstarterVariants.some((key) => key.endsWith(':5')) ? 1 : 0
  const currentById: Record<MilestoneId, number> = {
    'first-friend': Math.min(1, nonstarterSpecies),
    'tier-one': tierOne,
    'jelly-family': jellyfish,
    'grade-five': gradeFive,
    'variant-collector': Math.min(25, nonstarterVariants.length),
    'reef-explorer': known.species.size,
    'reef-rookie': Math.min(5, nonstarterSpecies),
    'reef-naturalist': Math.min(15, nonstarterSpecies),
    'rare-encounter': SPECIES.some(sp => sp.tier === 3 && known.species.has(sp.id)) ? 1 : 0,
    'legend-encounter': SPECIES.some(sp => sp.tier === 4 && known.species.has(sp.id)) ? 1 : 0,
    'mythic-encounter': SPECIES.some(sp => sp.tier === 5 && known.species.has(sp.id)) ? 1 : 0,
    'eel-family': SPECIES.filter(sp => sp.body.form === 'eel' && known.species.has(sp.id)).length,
    'color-palette': Math.max(0, ...[...NONSTARTER_IDS].map(id => [1, 2, 3, 4, 5].filter(g => known.variants.has(`${id}:${g}`)).length)),
    'variant-master': Math.min(60, nonstarterVariants.length),
  }

  return MILESTONES.map((item) => {
    const current = Math.min(item.total, currentById[item.id])
    return { ...item, current, unlocked: unlocked.has(item.id) || current >= item.total }
  })
}

/** Normalize metadata and permanently record every newly completed milestone. */
export function syncMilestones(state: GameState): void {
  const retained = Array.isArray(state.milestones?.unlocked)
    ? state.milestones.unlocked.filter(isMilestoneId)
    : []
  const unlocked = [...new Set(retained)]
  for (const progress of milestoneProgress(state)) {
    if (progress.current >= progress.total && !unlocked.includes(progress.id)) unlocked.push(progress.id)
  }

  const raw: unknown = state.milestones?.displayed
  const ids = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  const displayed = [...new Set(ids.filter(isMilestoneId))].filter(id => unlocked.includes(id))
  state.milestones = displayed.length ? { unlocked, displayed } : { unlocked }
}

/** Mount any number of earned medals. Invalid requests never replace existing choices. */
export function setDisplayedMilestones(state: GameState, ids: readonly MilestoneId[]): boolean {
  syncMilestones(state)
  if (new Set(ids).size !== ids.length || ids.some(id => !isMilestoneId(id) || !state.milestones!.unlocked.includes(id))) return false
  state.milestones = ids.length ? { unlocked: [...state.milestones!.unlocked], displayed: [...ids] } : { unlocked: [...state.milestones!.unlocked] }
  return true
}

/** Strict validation for imported/exported optional milestone metadata. */
export function validMilestones(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const metadata = value as { unlocked?: unknown; displayed?: unknown }
  if (!Array.isArray(metadata.unlocked) || metadata.unlocked.length > MILESTONE_IDS.length) return false
  if (!metadata.unlocked.every(isMilestoneId)) return false
  if (new Set(metadata.unlocked).size !== metadata.unlocked.length) return false
  if (metadata.displayed === undefined) return true
  // Original saves stored one plaque as a string.
  if (isMilestoneId(metadata.displayed)) return metadata.unlocked.includes(metadata.displayed)
  return Array.isArray(metadata.displayed) && metadata.displayed.length <= MILESTONE_IDS.length &&
    new Set(metadata.displayed).size === metadata.displayed.length &&
    metadata.displayed.every(id => isMilestoneId(id) && (metadata.unlocked as unknown[]).includes(id))
}

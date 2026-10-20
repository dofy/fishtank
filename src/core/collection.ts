import { gradeOdds, isAdult, tierOdds } from './game'
import { hasSpecies, poolForTier } from './species'
import type {
  BreedGoal,
  CollectionTarget,
  Fish,
  GameState,
  Grade,
  Tier,
} from './types'

export interface BreedForecast {
  /** Existing percentage units for offspring tiers 1..5. */
  tierOdds: number[]
  newSpeciesChance: number
  newVariantChance: number
  targetChance: number
  expectedTier: number
}

const BREED_GOALS = new Set<BreedGoal>(['species', 'variant', 'tier', 'target'])
const GRADES: Grade[] = [1, 2, 3, 4, 5]

function normalizedNickname(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const compact = value.trim().replace(/\s+/gu, ' ')
  if (!compact) return undefined
  return Array.from(compact).slice(0, 24).join('').trimEnd()
}

function compareUid(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function probability(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function fishByUid(state: GameState, uid: string): Fish | undefined {
  return state.fish.find((fish) => fish.uid === uid)
}

interface CollectionSnapshot {
  species: Set<string>
  variants: Set<string>
}

function collectionSnapshot(state: GameState): CollectionSnapshot {
  const species = new Set(Array.isArray(state.discovered) ? state.discovered : [])
  const variants = new Set<string>()
  const speciesWithGradeEvidence = new Set<string>()

  for (const fish of state.fish) {
    species.add(fish.speciesId)
    if (GRADES.includes(fish.grade)) {
      variants.add(`${fish.speciesId}:${fish.grade}`)
      speciesWithGradeEvidence.add(fish.speciesId)
    }
  }
  for (const key of state.discoveredVariants ?? []) {
    if (typeof key !== 'string') continue
    const separator = key.lastIndexOf(':')
    const speciesId = key.slice(0, separator)
    const grade = Number(key.slice(separator + 1)) as Grade
    if (separator < 1 || !GRADES.includes(grade)) continue
    species.add(speciesId)
    variants.add(`${speciesId}:${grade}`)
    speciesWithGradeEvidence.add(speciesId)
  }
  // This matches discoveredGradesFor(): legacy species without grade evidence
  // are treated as having discovered grade 1.
  for (const speciesId of species) {
    if (!speciesWithGradeEvidence.has(speciesId)) variants.add(`${speciesId}:1`)
  }
  return { species, variants }
}

function gradeProbabilities(parentGradeAvg: number): number[] {
  const weights = gradeOdds(parentGradeAvg)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return weights.map((weight) => weight / total)
}

function targetProbability(
  target: CollectionTarget | undefined,
  tierProbabilities: number[],
  gradeProbabilitiesForPair: number[],
): number {
  if (!target || !hasSpecies(target.speciesId)) return 0
  for (let tier = 1; tier <= 5; tier += 1) {
    const pool = poolForTier(tier as Tier)
    if (!pool.some((item) => item.id === target.speciesId)) continue
    const speciesChance = tierProbabilities[tier - 1]! / pool.length
    if (target.grade === undefined) return speciesChance
    return speciesChance * gradeProbabilitiesForPair[target.grade - 1]!
  }
  return 0
}

/** Calculate exact offspring odds without consuming RNG or changing game state. */
export function forecastBreed(state: GameState, a: Fish, b: Fish): BreedForecast {
  return forecastWithSnapshot(state, a, b, collectionSnapshot(state))
}

function forecastWithSnapshot(
  state: GameState,
  a: Fish,
  b: Fish,
  snapshot: CollectionSnapshot,
): BreedForecast {
  const percentages = [...tierOdds(a.tier, b.tier)]
  const tierProbabilities = percentages.map((chance) => chance / 100)
  const gradeProbabilitiesForPair = gradeProbabilities((a.grade + b.grade) / 2)
  let newSpeciesChance = 0
  let newVariantChance = 0
  let expectedTier = 0

  for (let tier = 1; tier <= 5; tier += 1) {
    const tierChance = tierProbabilities[tier - 1]!
    if (tierChance === 0) continue
    expectedTier += tier * tierChance
    const pool = poolForTier(tier as Tier)
    const speciesChance = tierChance / pool.length
    for (const species of pool) {
      if (!snapshot.species.has(species.id)) newSpeciesChance += speciesChance
      for (const grade of GRADES) {
        if (!snapshot.variants.has(`${species.id}:${grade}`)) {
          newVariantChance += speciesChance * gradeProbabilitiesForPair[grade - 1]!
        }
      }
    }
  }

  return {
    tierOdds: percentages,
    newSpeciesChance: probability(newSpeciesChance),
    newVariantChance: probability(newVariantChance),
    targetChance: probability(targetProbability(
      state.collectionTarget,
      tierProbabilities,
      gradeProbabilitiesForPair,
    )),
    expectedTier,
  }
}

export function targetReached(
  state: GameState,
  target: CollectionTarget | undefined = state.collectionTarget,
): boolean {
  if (!target || !hasSpecies(target.speciesId)) return false
  const snapshot = collectionSnapshot(state)
  if (target.grade === undefined) return snapshot.species.has(target.speciesId)
  return snapshot.variants.has(`${target.speciesId}:${target.grade}`)
}

interface CandidateGroup {
  tier: Tier
  grade: Grade
  fish: Fish[]
}

function eligibleForBreed(fish: Fish, now: number): boolean {
  return isAdult(fish, now) && (fish.tier === 0 || fish.uses > 0)
}

function expectedGrade(a: Fish, b: Fish): number {
  return gradeProbabilities((a.grade + b.grade) / 2)
    .reduce((sum, chance, index) => sum + chance * (index + 1), 0)
}

function goalScore(
  goal: BreedGoal,
  forecast: BreedForecast,
  targetIsComplete: boolean,
): number {
  switch (goal) {
    case 'variant': return forecast.newVariantChance
    case 'tier': return forecast.expectedTier
    case 'target': return targetIsComplete ? 0 : forecast.targetChance
    case 'species':
    default: return forecast.newSpeciesChance
  }
}

/**
 * Recommend an eligible pair. Inventory is collapsed to at most 30 tier-grade groups,
 * so repeated identical fish do not turn this into an O(n²) scan.
 */
export function recommendPair(
  state: GameState,
  goal: BreedGoal,
  now = Date.now(),
): { uids: [string, string]; forecast: BreedForecast } | null {
  const groupsByKey = new Map<string, CandidateGroup>()
  const eligible = state.fish
    .filter((fish) => eligibleForBreed(fish, now))
    .sort((a, b) => compareUid(a.uid, b.uid))

  for (const fish of eligible) {
    const key = `${fish.tier}:${fish.grade}`
    const group = groupsByKey.get(key)
    if (group) group.fish.push(fish)
    else groupsByKey.set(key, { tier: fish.tier, grade: fish.grade, fish: [fish] })
  }

  const groups = [...groupsByKey.values()].sort((a, b) =>
    a.tier - b.tier || a.grade - b.grade,
  )
  const actualGoal = BREED_GOALS.has(goal) ? goal : 'species'
  const snapshot = collectionSnapshot(state)
  const targetIsComplete = state.collectionTarget
    ? state.collectionTarget.grade === undefined
      ? snapshot.species.has(state.collectionTarget.speciesId)
      : snapshot.variants.has(`${state.collectionTarget.speciesId}:${state.collectionTarget.grade}`)
    : false
  let best: {
    uids: [string, string]
    forecast: BreedForecast
    score: number
    expectedGrade: number
  } | null = null

  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i; j < groups.length; j += 1) {
      const left = groups[i]!
      const right = groups[j]!
      if (i === j && left.fish.length < 2) continue
      const a = left.fish[0]!
      const b = i === j ? left.fish[1]! : right.fish[0]!
      const uids = [a.uid, b.uid].sort(compareUid) as [string, string]
      const forecast = forecastWithSnapshot(state, a, b, snapshot)
      const candidate = {
        uids,
        forecast,
        score: goalScore(actualGoal, forecast, targetIsComplete),
        expectedGrade: expectedGrade(a, b),
      }
      if (!best) {
        best = candidate
        continue
      }
      const scoreDifference = candidate.score - best.score
      const tierDifference = candidate.forecast.expectedTier - best.forecast.expectedTier
      const gradeDifference = candidate.expectedGrade - best.expectedGrade
      const uidDifference = compareUid(candidate.uids.join('\0'), best.uids.join('\0'))
      if (
        scoreDifference > 1e-12 ||
        (Math.abs(scoreDifference) <= 1e-12 && tierDifference > 1e-12) ||
        (Math.abs(scoreDifference) <= 1e-12 && Math.abs(tierDifference) <= 1e-12 && gradeDifference > 1e-12) ||
        (Math.abs(scoreDifference) <= 1e-12 && Math.abs(tierDifference) <= 1e-12 && Math.abs(gradeDifference) <= 1e-12 && uidDifference < 0)
      ) {
        best = candidate
      }
    }
  }

  return best ? { uids: best.uids, forecast: best.forecast } : null
}

export function renameFish(state: GameState, uid: string, nickname: string): boolean {
  const fish = fishByUid(state, uid)
  if (!fish) return false
  const normalized = normalizedNickname(nickname)
  if (normalized === undefined) delete fish.nickname
  else fish.nickname = normalized
  return true
}

export function setFishFavorite(state: GameState, uid: string, value: boolean): boolean {
  const fish = fishByUid(state, uid)
  if (!fish) return false
  fish.favorite = Boolean(value)
  return true
}

export function setFishLocked(state: GameState, uid: string, value: boolean): boolean {
  const fish = fishByUid(state, uid)
  if (!fish) return false
  fish.locked = Boolean(value)
  return true
}

/** Normalize collection preferences and fish metadata from persisted/untrusted state. */
export function syncCollectionPreferences(state: GameState): void {
  for (const fish of state.fish) {
    const nickname = normalizedNickname(fish.nickname)
    if (nickname === undefined) delete fish.nickname
    else fish.nickname = nickname
    if (typeof fish.favorite !== 'boolean') delete fish.favorite
    if (typeof fish.locked !== 'boolean') delete fish.locked
  }

  if (!BREED_GOALS.has(state.breedGoal as BreedGoal)) state.breedGoal = 'species'

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

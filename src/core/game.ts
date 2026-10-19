import {
  BREEDING_MATRIX,
  EXP_BY_TIER,
  GRADE_PARENT_BIAS,
  GRADE_WEIGHTS,
  GROWTH_MS_BY_TIER,
  HEART_COST_PER_BREED,
  HEART_MAX,
  HEART_REGEN_MS,
  PARENT_COOLDOWN_MS,
  SYNTHESIS_INPUT_COUNT,
  USES_BY_TIER,
  capacityForLevel,
  decorCapacityForLevel,
  gradeExpMultiplier,
  levelForExp,
  matrixKey,
} from './balance'
import { defaultAudioConfig } from './audio'
import { detectLocale } from './i18n'
import { Rng, rng as defaultRng } from './rng'
import {
  DECORATIONS,
  SPECIES,
  STARTER_DECOR,
  STARTER_SPECIES,
  decorItem,
  hasDecor,
  poolForTier,
} from './species'
import type {
  BreedOutcome,
  DecorId,
  Fish,
  FishSort,
  GameState,
  Grade,
  Locale,
  MergeFilter,
  PlacedDecor,
  SpeciesId,
  Tier,
} from './types'

export const SAVE_VERSION = 1

export function defaultMergeFilter(): MergeFilter {
  return {
    zeroUsesOnly: true,
    excludeInTank: false,
    tiers: [1, 2, 3, 4],
  }
}

let uidCounter = 0
function newUid(): string {
  uidCounter += 1
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}`
}

export function makeFish(
  speciesId: SpeciesId,
  tier: Tier,
  grade: Grade,
  now: number,
  opts: { adult?: boolean; uses?: number } = {},
): Fish {
  const growth = GROWTH_MS_BY_TIER[tier]
  const uses = opts.uses ?? USES_BY_TIER[tier]
  return {
    uid: newUid(),
    speciesId,
    tier,
    grade,
    uses,
    maxUses: uses,
    maturesAt: opts.adult ? null : now + growth,
    bornAt: now,
    birthExp: 0,
    expBanked: Boolean(opts.adult),
  }
}

export function variantKey(speciesId: SpeciesId, grade: Grade): string {
  return `${speciesId}:${grade}`
}

export function recordVariant(state: GameState, speciesId: SpeciesId, grade: Grade): boolean {
  if (!Array.isArray(state.discoveredVariants)) {
    state.discoveredVariants = []
  }
  const key = variantKey(speciesId, grade)
  const isNew = !state.discoveredVariants.includes(key)
  if (isNew) state.discoveredVariants.push(key)
  if (!state.discovered.includes(speciesId)) state.discovered.push(speciesId)
  return isNew
}

export function discoveredGradesFor(state: GameState, speciesId: SpeciesId): Grade[] {
  const set = new Set<Grade>()
  for (const f of state.fish) {
    if (f.speciesId === speciesId) set.add(f.grade)
  }
  for (const key of state.discoveredVariants ?? []) {
    const [sp, gStr] = key.split(':')
    if (sp === speciesId) {
      const g = Number(gStr) as Grade
      if (g >= 1 && g <= 5) set.add(g)
    }
  }
  if (state.discovered.includes(speciesId) && set.size === 0) {
    set.add(1)
  }
  return ([1, 2, 3, 4, 5] as Grade[]).filter((g) => set.has(g))
}

export function newGame(now = Date.now(), locale: Locale = detectLocale()): GameState {
  const fish = STARTER_SPECIES.map((id, idx) => makeFish(id, 0, 1, now + idx, { adult: true }))
  const uniqueStarters = [...new Set(STARTER_SPECIES)]
  return {
    version: SAVE_VERSION,
    fish,
    tankUids: fish.map((f) => f.uid),
    placedDecor: STARTER_DECOR.map((d) => ({ ...d })),
    mergeFilter: defaultMergeFilter(),
    tankSort: 'inTank',
    breedSort: 'tier',
    audio: defaultAudioConfig(),
    hearts: HEART_MAX,
    nextHeartAt: now + HEART_REGEN_MS,
    exp: 0,
    level: 1,
    discovered: uniqueStarters,
    discoveredVariants: uniqueStarters.map((id) => variantKey(id, 1)),
    theme: 'realistic',
    colorMode: 'auto',
    locale,
    lastTick: now,
  }
}

export function isAdult(fish: Fish, now: number): boolean {
  return fish.maturesAt === null || fish.maturesAt <= now
}

/** Max display slots in the visual aquarium tank for the current level. */
export function capacity(state: GameState): number {
  return capacityForLevel(state.level)
}

/** Synchronize tankUids with existing fish. */
export function syncTank(state: GameState): string[] {
  const cap = capacity(state)
  const validIds = new Set(state.fish.map((f) => f.uid))
  const current = (state.tankUids ?? []).filter((id) => validIds.has(id)).slice(0, cap)
  state.tankUids = current
  return current
}

/** Place or remove a fish from the visual aquarium tank. */
export function toggleTankFish(
  state: GameState,
  uid: string,
): 'placed' | 'removed' | 'tank-full' {
  const current = syncTank(state)
  if (current.includes(uid)) {
    state.tankUids = current.filter((id) => id !== uid)
    return 'removed'
  }
  if (current.length >= capacity(state)) {
    return 'tank-full'
  }
  state.tankUids = [...current, uid]
  return 'placed'
}

export function tankFish(state: GameState): Fish[] {
  const ids = new Set(syncTank(state))
  return state.fish.filter((f) => ids.has(f.uid))
}

// ---------------------------------------------------------------- decorations

export function decorCapacity(state: GameState): number {
  return decorCapacityForLevel(state.level)
}

export function isDecorUnlocked(state: GameState, id: DecorId): boolean {
  return hasDecor(id) && state.level >= decorItem(id).unlockLevel
}

export function syncDecor(state: GameState): PlacedDecor[] {
  if (!Array.isArray(state.placedDecor)) {
    state.placedDecor = STARTER_DECOR.map((d) => ({ ...d }))
  }
  const cap = decorCapacity(state)
  const seen = new Set<string>()
  const cleaned: PlacedDecor[] = []
  for (const item of state.placedDecor) {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue
    if (!isDecorUnlocked(state, item.id)) continue
    seen.add(item.id)
    cleaned.push({
      id: item.id,
      x: Math.min(0.94, Math.max(0.06, Number.isFinite(item.x) ? item.x : 0.5)),
      flip: item.flip === -1 ? -1 : 1,
    })
  }
  const capped = cleaned.slice(0, cap)
  state.placedDecor = capped
  return capped
}

/** Find a non-overlapping default X spot when placing a new decoration. */
function findOpenDecorX(existing: PlacedDecor[], mount: 'floor' | 'top' = 'floor'): number {
  const samePlane = existing.filter((e) => (decorItem(e.id).mount ?? 'floor') === mount)
  const candidates = [0.5, 0.3, 0.7, 0.18, 0.82, 0.4, 0.6, 0.24, 0.76, 0.1, 0.9]
  for (const c of candidates) {
    if (samePlane.every((e) => Math.abs(e.x - c) > 0.08)) return c
  }
  return 0.2 + ((samePlane.length * 0.15) % 0.6)
}

export function toggleDecor(
  state: GameState,
  id: DecorId,
): 'placed' | 'removed' | 'locked' | 'decor-full' {
  if (!isDecorUnlocked(state, id)) return 'locked'
  const list = syncDecor(state)
  const idx = list.findIndex((d) => d.id === id)
  if (idx !== -1) {
    state.placedDecor = list.filter((d) => d.id !== id)
    return 'removed'
  }
  if (list.length >= decorCapacity(state)) {
    return 'decor-full'
  }
  const mount = decorItem(id).mount ?? 'floor'
  const x = findOpenDecorX(list, mount)
  state.placedDecor = [...list, { id, x, flip: 1 }]
  return 'placed'
}

export function moveDecor(state: GameState, id: DecorId, x: number): boolean {
  const list = syncDecor(state)
  const idx = list.findIndex((d) => d.id === id)
  if (idx === -1) return false
  const target = list[idx]!
  target.x = Math.min(0.94, Math.max(0.06, x))
  // Bring the moved/clicked decoration to the top of the z-order
  if (idx !== list.length - 1) {
    list.splice(idx, 1)
    list.push(target)
  }
  return true
}

export function flipDecor(state: GameState, id: DecorId): boolean {
  const list = syncDecor(state)
  const target = list.find((d) => d.id === id)
  if (!target) return false
  target.flip = target.flip === -1 ? 1 : -1
  return true
}

export function decorProgress(state: GameState): { unlocked: number; total: number } {
  const unlocked = DECORATIONS.filter((d) => state.level >= d.unlockLevel).length
  return { unlocked, total: DECORATIONS.length }
}

// ---------------------------------------------------------------- simulation

export interface TickResult {
  maturedCount: number
  expGained: number
  levelUps: number
  heartsGained: number
}

/** Advance hearts, fry maturation and aquarium level to `now`. */
export function tick(state: GameState, now = Date.now()): TickResult {
  const result: TickResult = { maturedCount: 0, expGained: 0, levelUps: 0, heartsGained: 0 }

  if (state.hearts < HEART_MAX) {
    while (state.hearts < HEART_MAX && now >= state.nextHeartAt) {
      state.hearts += 1
      state.nextHeartAt += HEART_REGEN_MS
      result.heartsGained += 1
    }
    if (state.hearts >= HEART_MAX) state.nextHeartAt = now + HEART_REGEN_MS
  } else {
    state.nextHeartAt = now + HEART_REGEN_MS
  }

  for (const fish of state.fish) {
    if (!isAdult(fish, now)) continue
    if (fish.maturesAt !== null) {
      fish.maturesAt = null
      result.maturedCount += 1
    }
    if (!fish.expBanked) {
      fish.expBanked = true
      const totalExp = Math.round(EXP_BY_TIER[fish.tier] * gradeExpMultiplier(fish.grade))
      // Legacy saves lack the birth award and fish origin; retain their pending award.
      const gain = totalExp - (fish.birthExp ?? 0)
      state.exp += gain
      result.expGained += gain
    }
  }

  const level = levelForExp(state.exp)
  if (level > state.level) {
    result.levelUps = level - state.level
    state.level = level
  }

  syncTank(state)
  syncDecor(state)
  state.lastTick = now
  return result
}

export function tierOdds(a: Tier, b: Tier): [number, number, number, number, number] {
  const key = matrixKey(a, b)
  const odds = BREEDING_MATRIX[key]
  if (!odds) throw new Error(`missing breeding odds: ${key}`)
  return odds
}

function rollGrade(parentGradeAvg: number, random: Rng): Grade {
  const bias = GRADE_PARENT_BIAS * (parentGradeAvg - 1)
  const weights = ([1, 2, 3, 4, 5] as Grade[]).map((g) => {
    const base = GRADE_WEIGHTS[g]
    return Math.max(0.01, base * (1 + bias * (g - 1)) ** 1)
  })
  return (random.weighted(weights) + 1) as Grade
}

function rollUses(tier: Tier, random: Rng): number {
  if (tier === 0) return USES_BY_TIER[0]
  const center = USES_BY_TIER[tier]
  const weights = [1, 2, 3, 4, 5].map((u) => Math.max(1, 6 - Math.abs(u - center) * 2))
  return random.weighted(weights) + 1
}

export type BreedError =
  | 'no-hearts'
  | 'needs-two'
  | 'not-adult'
  | 'no-uses'

/** Attempt a pairing. Returns the child, or why it could not happen. */
export function breed(
  state: GameState,
  uidA: string,
  uidB: string,
  now = Date.now(),
  random: Rng = defaultRng,
): BreedOutcome | { error: BreedError } {
  if (uidA === uidB) return { error: 'needs-two' }
  const a = state.fish.find((f) => f.uid === uidA)
  const b = state.fish.find((f) => f.uid === uidB)
  if (!a || !b) return { error: 'needs-two' }
  if (state.hearts < HEART_COST_PER_BREED) return { error: 'no-hearts' }
  if (!isAdult(a, now) || !isAdult(b, now)) return { error: 'not-adult' }
  if ((a.tier > 0 && a.uses <= 0) || (b.tier > 0 && b.uses <= 0)) return { error: 'no-uses' }

  state.hearts -= HEART_COST_PER_BREED
  if (a.tier > 0) a.uses -= 1
  if (b.tier > 0) b.uses -= 1

  if (a.tier === 0) a.maturesAt = now + PARENT_COOLDOWN_MS
  if (b.tier === 0) b.maturesAt = now + PARENT_COOLDOWN_MS

  const odds = tierOdds(a.tier, b.tier)
  const tier = (random.weighted(odds) + 1) as Tier

  // Every species in the rolled tier has the same chance, regardless of the parents.
  const speciesId = random.pick(poolForTier(tier)).id

  const grade = rollGrade((a.grade + b.grade) / 2, random)
  const uses = rollUses(tier, random)
  const child = makeFish(speciesId, tier, grade, now, { uses })

  const totalExp = Math.round(EXP_BY_TIER[tier] * gradeExpMultiplier(grade))
  const immediateExp = Math.max(2, Math.floor(totalExp / 2))
  child.birthExp = immediateExp
  state.exp += immediateExp
  const nextLv = levelForExp(state.exp)
  if (nextLv > state.level) state.level = nextLv

  state.fish.push(child)

  const currentTank = syncTank(state)
  if (currentTank.length < capacity(state)) {
    state.tankUids = [...currentTank, child.uid]
  }

  const novel = !state.discovered.includes(speciesId)
  recordVariant(state, speciesId, grade)

  return { child, tier, novel, expGained: immediateExp }
}

export type SynthError = 'wrong-count' | 'max-tier' | 'starter-material'

/**
 * Consume ten fish (tiers 1..4) to mint one fish a tier higher.
 * If mixed tiers are supplied, the output tier is rolled weighted by each material's tier count,
 * capped at `maxInputTier + 1` (up to Mythic 5★), matching PC FISH's mixed-rarity synthesis.
 */
export function synthesize(
  state: GameState,
  uids: string[],
  now = Date.now(),
  random: Rng = defaultRng,
): { child: Fish; tier: Tier; novel: boolean } | { error: SynthError } {
  if (uids.length !== SYNTHESIS_INPUT_COUNT || new Set(uids).size !== SYNTHESIS_INPUT_COUNT) {
    return { error: 'wrong-count' }
  }
  const picked = uids
    .map((uid) => state.fish.find((f) => f.uid === uid))
    .filter((f): f is Fish => Boolean(f))
  if (picked.length !== SYNTHESIS_INPUT_COUNT) return { error: 'wrong-count' }
  if (picked.some((f) => f.tier === 0)) {
    return { error: 'starter-material' }
  }
  if (picked.some((f) => f.tier >= 5)) return { error: 'max-tier' }

  // Each material votes for (its tier + 1), so 10 same-tier fish = 100% (tier + 1),
  // and mixed tiers weight proportionally between their respective (tier + 1) outcomes.
  const baseTier = picked[random.int(picked.length)]!.tier
  const outTier = Math.min(5, baseTier + 1) as Tier
  const keep = new Set(uids)
  state.fish = state.fish.filter((f) => !keep.has(f.uid))

  const bestGrade = Math.max(...picked.map((f) => f.grade)) as Grade
  const speciesId = random.pick(poolForTier(outTier)).id
  const uses = rollUses(outTier, random)
  const child = makeFish(speciesId, outTier, bestGrade, now, { uses })
  state.fish.push(child)

  const currentTank = syncTank(state)
  if (currentTank.length < capacity(state)) {
    state.tankUids = [...currentTank, child.uid]
  }

  const isNovel = !state.discovered.includes(speciesId)
  recordVariant(state, speciesId, bestGrade)

  return { child, tier: outTier, novel: isNovel }
}

/** Release a fish. Mirrors selling, minus an economy we do not simulate. */
export function release(state: GameState, uid: string): boolean {
  const fish = state.fish.find((f) => f.uid === uid)
  if (!fish || fish.tier === 0) return false
  const before = state.fish.length
  state.fish = state.fish.filter((f) => f.uid !== uid)
  syncTank(state)
  return state.fish.length < before
}

export function syncMergeFilter(state: GameState): MergeFilter {
  if (!state.mergeFilter || typeof state.mergeFilter !== 'object') {
    state.mergeFilter = defaultMergeFilter()
    return state.mergeFilter
  }
  const f = state.mergeFilter
  f.zeroUsesOnly = Boolean(f.zeroUsesOnly)
  f.excludeInTank = Boolean(f.excludeInTank)
  const validTiers: Tier[] = Array.isArray(f.tiers)
    ? f.tiers.filter((t): t is Tier => t === 1 || t === 2 || t === 3 || t === 4)
    : [1, 2, 3, 4]
  f.tiers = [...new Set(validTiers)]
  return f
}

export function filterMergeCandidates(state: GameState): Fish[] {
  const filter = syncMergeFilter(state)
  const tankSet = new Set(syncTank(state))
  const tierSet = new Set(filter.tiers)
  return state.fish.filter((f) => {
    if (f.tier === 0 || f.tier >= 5) return false
    if (!tierSet.has(f.tier)) return false
    if (filter.zeroUsesOnly && f.uses > 0) return false
    if (filter.excludeInTank && tankSet.has(f.uid)) return false
    return true
  })
}

function compareFishBySort(a: Fish, b: Fish, sort: FishSort): number {
  switch (sort) {
    case 'tier':
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.grade !== a.grade) return b.grade - a.grade
      if (b.uses !== a.uses) return b.uses - a.uses
      return a.bornAt - b.bornAt
    case 'grade':
      if (b.grade !== a.grade) return b.grade - a.grade
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.uses !== a.uses) return b.uses - a.uses
      return a.bornAt - b.bornAt
    case 'uses':
      if (b.uses !== a.uses) return b.uses - a.uses
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.grade !== a.grade) return b.grade - a.grade
      return a.bornAt - b.bornAt
    case 'acquired':
    default:
      return a.bornAt - b.bornAt
  }
}

export function sortTankFish(
  list: Fish[],
  sort: FishSort,
  tankIds: Set<string>,
): Fish[] {
  return [...list].sort((a, b) => {
    if (sort === 'inTank') {
      const aIn = tankIds.has(a.uid) ? 1 : 0
      const bIn = tankIds.has(b.uid) ? 1 : 0
      if (aIn !== bIn) return bIn - aIn
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.grade !== a.grade) return b.grade - a.grade
      return a.bornAt - b.bornAt
    }
    return compareFishBySort(a, b, sort)
  })
}

export function sortBreedCandidates(list: Fish[], sort: FishSort, now = Date.now()): Fish[] {
  return [...list].sort((a, b) => {
    const aAdult = isAdult(a, now) ? 1 : 0
    const bAdult = isAdult(b, now) ? 1 : 0
    if (aAdult !== bAdult) return bAdult - aAdult
    return compareFishBySort(a, b, sort)
  })
}

/**
 * Pick up to 10 fish from all filtered candidates using the optimal "1 + 9" strategy:
 * 1 highest-grade fish (so the merged output inherits that grade) + up to 9 lowest-grade/lowest-tier fish.
 * If any single checked tier has >= 10 fish, prefers keeping all 10 within that tier for a 100% deterministic upgrade;
 * otherwise combines across all checked tiers so all filtered fish can be selected up to 10.
 */
export function autoPickForMerge(state: GameState): string[] {
  const filter = syncMergeFilter(state)
  const candidates = filterMergeCandidates(state)
  if (candidates.length === 0) return []
  const tiers = [...filter.tiers].sort((a, b) => a - b)

  const pickOnePlusNine = (pool: Fish[]): string[] => {
    if (pool.length === 0) return []
    const byHighGrade = [...pool].sort((a, b) => {
      if (b.grade !== a.grade) return b.grade - a.grade
      if (a.uses !== b.uses) return a.uses - b.uses
      if (a.tier !== b.tier) return a.tier - b.tier
      return a.bornAt - b.bornAt
    })
    const lead = byHighGrade[0]!
    const rest = pool
      .filter((f) => f.uid !== lead.uid)
      .sort((a, b) => {
        if (a.uses !== b.uses) return a.uses - b.uses
        if (a.tier !== b.tier) return a.tier - b.tier
        if (a.grade !== b.grade) return a.grade - b.grade
        return a.bornAt - b.bornAt
      })
      .slice(0, SYNTHESIS_INPUT_COUNT - 1)
    return [lead.uid, ...rest.map((f) => f.uid)]
  }

  for (const t of tiers) {
    const group = candidates.filter((f) => f.tier === t)
    if (group.length >= SYNTHESIS_INPUT_COUNT) {
      return pickOnePlusNine(group)
    }
  }

  return pickOnePlusNine(candidates)
}

export function collectionProgress(state: GameState): { owned: number; total: number } {
  return { owned: state.discovered.length, total: SPECIES.length }
}

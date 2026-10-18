import {
  BREEDING_MATRIX,
  EXP_BY_TIER,
  GRADE_PARENT_BIAS,
  GRADE_WEIGHTS,
  GROWTH_MS_BY_TIER,
  HEART_COST_PER_BREED,
  HEART_MAX,
  HEART_REGEN_MS,
  MATRIX_FALLBACK,
  PARENT_COOLDOWN_MS,
  SYNTHESIS_INPUT_COUNT,
  USES_BY_TIER,
  capacityForLevel,
  gradeExpMultiplier,
  levelForExp,
  matrixKey,
} from './balance'
import { detectLocale } from './i18n'
import { Rng, rng as defaultRng } from './rng'
import { SEASON_RECIPES, SPECIES, STARTER_SPECIES, poolForTier, species } from './species'
import type { BreedOutcome, Fish, GameState, Grade, Locale, SpeciesId, Tier } from './types'

export const SAVE_VERSION = 1

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
    expBanked: Boolean(opts.adult),
  }
}

export function newGame(now = Date.now(), locale: Locale = detectLocale()): GameState {
  const fish = STARTER_SPECIES.map((id, idx) => makeFish(id, 0, 1, now + idx, { adult: true }))
  return {
    version: SAVE_VERSION,
    fish,
    tankUids: fish.map((f) => f.uid),
    hearts: HEART_MAX,
    nextHeartAt: now + HEART_REGEN_MS,
    exp: 0,
    level: 1,
    discovered: [...new Set(STARTER_SPECIES)],
    crafted: [],
    theme: 'realistic',
    locale,
    lastTick: now,
  }
}

export function isAdult(fish: Fish, now: number): boolean {
  return fish.maturesAt === null || fish.maturesAt <= now
}

export function adults(state: GameState, now: number): Fish[] {
  return state.fish.filter((f) => isAdult(f, now))
}

/** Max display slots in the visual aquarium tank for the current level. */
export function capacity(state: GameState): number {
  return capacityForLevel(state.level)
}

/** Synchronize tankUids with existing fish and auto-fill open tank slots. */
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
      const gain = Math.round(EXP_BY_TIER[fish.tier] * gradeExpMultiplier(fish.grade))
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
  state.lastTick = now
  return result
}

export function tierOdds(a: Tier, b: Tier): [number, number, number, number, number] {
  return BREEDING_MATRIX[matrixKey(a, b)] ?? MATRIX_FALLBACK
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
  // PC FISH rolls 1..5 breeding uses per specimen, weighted around USES_BY_TIER[tier]
  const center = USES_BY_TIER[tier]
  const weights = [1, 2, 3, 4, 5].map((u) => Math.max(1, 6 - Math.abs(u - center) * 2))
  return random.weighted(weights) + 1
}

export type BreedError =
  | 'no-hearts'
  | 'needs-two'
  | 'not-adult'
  | 'no-uses'
  | 'seasonal-parent'

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
  if (species(a.speciesId).seasonal || species(b.speciesId).seasonal) {
    return { error: 'seasonal-parent' }
  }

  state.hearts -= HEART_COST_PER_BREED
  if (a.tier > 0) a.uses -= 1
  if (b.tier > 0) b.uses -= 1

  // Starter goldfish return to fry state briefly after breeding (3 min parent cooldown)
  if (a.tier === 0) a.maturesAt = now + PARENT_COOLDOWN_MS
  if (b.tier === 0) b.maturesAt = now + PARENT_COOLDOWN_MS

  const odds = tierOdds(a.tier, b.tier)
  const tier = (random.weighted(odds) + 1) as Tier

  // Species is drawn from the parents first, then from the tier pool, so a
  // pairing can both deepen a line and discover something new.
  const parentOptions = [a.speciesId, b.speciesId].filter((id) => species(id).tier === tier)
  const pool = poolForTier(tier)
  const fromParents = parentOptions.length > 0 && random.next() < 0.45
  const speciesId = fromParents ? random.pick(parentOptions) : random.pick(pool).id

  const grade = rollGrade((a.grade + b.grade) / 2, random)
  const uses = rollUses(tier, random)
  const child = makeFish(speciesId, tier, grade, now, { uses })

  // Award immediate breeding EXP (half upfront, half on maturation) so active breeding levels the tank right away
  const totalExp = Math.round(EXP_BY_TIER[tier] * gradeExpMultiplier(grade))
  const immediateExp = Math.max(2, Math.floor(totalExp / 2))
  state.exp += immediateExp
  const nextLv = levelForExp(state.exp)
  if (nextLv > state.level) state.level = nextLv

  state.fish.push(child)

  // Auto-place child into the aquarium tank if there is an open slot
  const currentTank = syncTank(state)
  if (currentTank.length < capacity(state)) {
    state.tankUids = [...currentTank, child.uid]
  }

  const novel = !state.discovered.includes(speciesId)
  if (novel) state.discovered.push(speciesId)

  return { child, tier, novel, expGained: immediateExp }
}

export type SynthError = 'wrong-count' | 'mixed-tier' | 'max-tier' | 'seasonal-material'

/** Consume exactly ten same-tier fish to mint one fish a tier higher. */
export function synthesize(
  state: GameState,
  uids: string[],
  now = Date.now(),
  random: Rng = defaultRng,
): { child: Fish } | { error: SynthError } {
  if (uids.length !== SYNTHESIS_INPUT_COUNT) return { error: 'wrong-count' }
  const picked = uids
    .map((uid) => state.fish.find((f) => f.uid === uid))
    .filter((f): f is Fish => Boolean(f))
  if (picked.length !== SYNTHESIS_INPUT_COUNT) return { error: 'wrong-count' }
  if (picked.some((f) => species(f.speciesId).seasonal || f.tier === 0)) {
    return { error: 'seasonal-material' }
  }

  const tier = picked[0]!.tier
  if (picked.some((f) => f.tier !== tier)) return { error: 'mixed-tier' }
  if (tier >= 5) return { error: 'max-tier' }

  const outTier = (tier + 1) as Tier
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

  if (!state.discovered.includes(speciesId)) state.discovered.push(speciesId)

  return { child }
}

export interface MaterialStatus {
  speciesId: SpeciesId
  have: number
  need: number
  minTier: Tier
  /** uids eligible to be consumed, newest last. */
  eligible: string[]
}

export function recipeStatus(state: GameState, recipeId: string, now = Date.now()) {
  const recipe = SEASON_RECIPES.find((r) => r.id === recipeId)
  if (!recipe) throw new Error(`unknown recipe: ${recipeId}`)
  const materials: MaterialStatus[] = recipe.materials.map((m) => {
    const eligible = state.fish
      .filter((f) => f.speciesId === m.speciesId && f.tier >= m.minTier && isAdult(f, now))
      .map((f) => f.uid)
    return { speciesId: m.speciesId, have: eligible.length, need: m.count, minTier: m.minTier, eligible }
  })
  const ready = materials.every((m) => m.have >= m.need)
  return { recipe, materials, ready }
}

export type CraftError = 'missing-materials' | 'unknown-recipe'

export function craft(
  state: GameState,
  recipeId: string,
  now = Date.now(),
): { child: Fish } | { error: CraftError } {
  const found = SEASON_RECIPES.find((r) => r.id === recipeId)
  if (!found) return { error: 'unknown-recipe' }
  const status = recipeStatus(state, recipeId, now)
  if (!status.ready) return { error: 'missing-materials' }

  const consume = new Set<string>()
  for (const m of status.materials) for (const uid of m.eligible.slice(0, m.need)) consume.add(uid)
  state.fish = state.fish.filter((f) => !consume.has(f.uid))

  const child = makeFish(found.output, 1, 1, now, { adult: true, uses: 0 })
  state.fish.push(child)

  const currentTank = syncTank(state)
  if (currentTank.length < capacity(state)) {
    state.tankUids = [...currentTank, child.uid]
  }

  if (!state.discovered.includes(found.output)) state.discovered.push(found.output)
  if (!state.crafted.includes(recipeId)) state.crafted.push(recipeId)

  return { child }
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

export function collectionProgress(state: GameState): { owned: number; total: number } {
  return { owned: state.discovered.length, total: SPECIES.length }
}

import type { Grade, Tier } from './types'

/**
 * Balance constants.
 *
 * Numbers marked SOURCE are taken from the community guides for
 * PC FISH: Taskbar Aquarium (NANOO, 2026) and reproduced here so this
 * project's pacing matches a game that is known to feel good.
 * Numbers marked TUNED are our own, because the original never
 * published them. See docs/BALANCE.md for the full provenance table.
 */

/** SOURCE: one breeding attempt costs one heart. */
export const HEART_COST_PER_BREED = 1

/** SOURCE: hearts cap at 5. */
export const HEART_MAX = 5

/** SOURCE: one heart regenerates about every 7 minutes. */
export const HEART_REGEN_MS = 7 * 60 * 1000

/** SOURCE: synthesis consumes exactly 10 fish. */
export const SYNTHESIS_INPUT_COUNT = 10

/** SOURCE: parent breeding cooldown (~3 minutes). */
export const PARENT_COOLDOWN_MS = 3 * 60_000

/** SOURCE: tank display capacity, decoration slot capacity, and cumulative EXP per aquarium level. */
export const LEVELS: { level: number; totalExp: number; capacity: number; decorCapacity: number }[] = [
  { level: 1, totalExp: 0, capacity: 3, decorCapacity: 3 },
  { level: 2, totalExp: 10, capacity: 4, decorCapacity: 4 },
  { level: 3, totalExp: 60, capacity: 5, decorCapacity: 5 },
  { level: 4, totalExp: 260, capacity: 6, decorCapacity: 6 },
  { level: 5, totalExp: 760, capacity: 7, decorCapacity: 7 },
  { level: 6, totalExp: 1_760, capacity: 8, decorCapacity: 8 },
  { level: 7, totalExp: 4_760, capacity: 9, decorCapacity: 9 },
  { level: 8, totalExp: 12_760, capacity: 10, decorCapacity: 10 },
  { level: 9, totalExp: 27_760, capacity: 11, decorCapacity: 11 },
  { level: 10, totalExp: 57_760, capacity: 12, decorCapacity: 12 },
]

/**
 * SOURCE: offspring tier distribution by combined parent tiers.
 * Key is `${lowTier}+${highTier}`. Values are percentages for
 * tiers 1..5 and always sum to 100.
 */
export const BREEDING_MATRIX: Record<string, [number, number, number, number, number]> = {
  '0+0': [100, 0, 0, 0, 0],
  '0+1': [90, 10, 0, 0, 0],
  '1+1': [76, 20, 4, 0, 0],
  '1+2': [48.9, 41.6, 9.5, 0, 0],
  '2+2': [37.7, 44.3, 15, 3, 0],
  '1+3': [37.7, 44.3, 15, 3, 0],
  '2+3': [0, 50.5, 43, 6.5, 0],
  '1+4': [0, 50.5, 43, 6.5, 0],
  '3+3': [0, 40.5, 47.5, 10, 2],
  '2+4': [0, 40.5, 47.5, 10, 2],
  '3+4': [0, 0, 52.1, 44.4, 3.5],
  '2+5': [0, 0, 52.1, 44.4, 3.5],
  '4+4': [0, 0, 43.7, 51.3, 5],
  '3+5': [0, 0, 43.7, 51.3, 5],
  '4+5': [0, 0, 0, 70, 30],
  '5+5': [0, 0, 0, 45, 55],
}

/** Rows the original matrix leaves undefined, filled by nearest neighbour. */
export const MATRIX_FALLBACK: [number, number, number, number, number] = [0, 0, 0, 45, 55]

/**
 * SOURCE: starter goldfish have infinite uses (represented as 999);
 * bred/merged fish get 1..5 breeding uses (defaulted by tier if not rolled).
 */
export const USES_BY_TIER: Record<Tier, number> = { 0: 999, 1: 5, 2: 4, 3: 3, 4: 2, 5: 2 }

/** SOURCE: fry maturation / cooldown time in ms (~5–20 minutes for offspring, 3m for starter). */
export const GROWTH_MS_BY_TIER: Record<Tier, number> = {
  0: PARENT_COOLDOWN_MS,
  1: 5 * 60_000,
  2: 7 * 60_000,
  3: 10 * 60_000,
  4: 15 * 60_000,
  5: 20 * 60_000,
}

/** TUNED: EXP banked when a fry is bred/matures, by tier. */
export const EXP_BY_TIER: Record<Tier, number> = { 0: 5, 1: 10, 2: 40, 3: 160, 4: 640, 5: 2_560 }

/** TUNED: EXP multiplier contributed by visual grade. */
export function gradeExpMultiplier(grade: Grade): number {
  return 1 + 0.25 * (grade - 1)
}

/** TUNED: grade roll weights, biased low, nudged up by parent grades. */
export const GRADE_WEIGHTS: Record<Grade, number> = { 1: 56, 2: 26, 3: 12, 4: 5, 5: 1 }

/** TUNED: each point of average parent grade shifts weight toward high grades. */
export const GRADE_PARENT_BIAS = 0.35

/** Sort the two parent tiers into a matrix key. */
export function matrixKey(a: Tier, b: Tier): string {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return `${lo}+${hi}`
}

export function levelForExp(exp: number): number {
  let level = 1
  for (const row of LEVELS) if (exp >= row.totalExp) level = row.level
  return level
}

export function capacityForLevel(level: number): number {
  const row = LEVELS.find((r) => r.level === level)
  return row ? row.capacity : LEVELS[0]!.capacity
}

export function decorCapacityForLevel(level: number): number {
  const row = LEVELS.find((r) => r.level === level)
  return row ? row.decorCapacity : LEVELS[0]!.decorCapacity
}

/** Cumulative EXP needed for the next level, or null at max level. */
export function nextLevelExp(level: number): number | null {
  const row = LEVELS.find((r) => r.level === level + 1)
  return row ? row.totalExp : null
}

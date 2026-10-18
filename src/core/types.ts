/** Rarity tier. 0 = starter stock, 1..5 = the five star ratings. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5

/** Visual quality grade, independent of rarity tier. */
export type Grade = 1 | 2 | 3 | 4 | 5

export type SpeciesId = string

export interface Species {
  id: SpeciesId
  /** Display name. */
  name: string
  /** Lowest tier this species can appear at. */
  tier: Tier
  /** True for the limited season-crafted creatures. */
  seasonal?: boolean
  /** Procedural body description, consumed by every renderer. */
  body: BodyShape
}

/**
 * Renderer-neutral body description. A theme may either draw this
 * procedurally or ignore it and blit `sprites/<speciesId>.png` instead.
 */
export interface BodyShape {
  /** Body length relative to a 16 px grid cell. */
  length: number
  /** Body height relative to its length, 0..1. */
  depth: number
  /** Tail size relative to body length, 0..1. */
  tail: number
  /** Dorsal fin prominence, 0..1. */
  dorsal: number
  /** Surface pattern. */
  pattern: 'plain' | 'stripes' | 'bands' | 'spots' | 'gradient'
  /** Base hue in degrees, 0..360. Themes may remap or discard it. */
  hue: number
  /** Base saturation, 0..1. */
  sat: number
  /** Base lightness, 0..1. */
  light: number
}

export interface Fish {
  uid: string
  speciesId: SpeciesId
  tier: Tier
  grade: Grade
  /** Remaining breeding attempts. Zero means synthesis or sale only. */
  uses: number
  /** Epoch ms when the fry becomes an adult. Null once adult. */
  maturesAt: number | null
  /** Epoch ms of birth, for the "acquisition order" sort. */
  bornAt: number
  /** True once its maturation EXP has been banked. */
  expBanked: boolean
}

export type Locale = 'zh' | 'en'

export interface GameState {
  version: number
  fish: Fish[]
  hearts: number
  /** Epoch ms the next heart finishes regenerating. */
  nextHeartAt: number
  exp: number
  level: number
  /** Species ids ever owned, for the collection book. */
  discovered: SpeciesId[]
  /** Season recipe ids already crafted at least once. */
  crafted: string[]
  theme: string
  locale?: Locale
  /** Epoch ms of the last simulation tick. */
  lastTick: number
}

export interface BreedOutcome {
  child: Fish
  /** Tier the dice actually produced. */
  tier: Tier
  /** Whether the child is a species neither parent is. */
  novel: boolean
}

export interface SeasonRecipe {
  id: string
  /** Species produced. */
  output: SpeciesId
  /** Material requirements: species id, count, minimum tier. */
  materials: { speciesId: SpeciesId; count: number; minTier: Tier }[]
}

/** Rarity tier. 0 = starter goldfish, 1..5 = the five star ratings. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5

/** Visual quality grade, independent of rarity tier. */
export type Grade = 1 | 2 | 3 | 4 | 5

export type SpeciesId = string
export type DecorId = string

export interface Species {
  id: SpeciesId
  /** Display name. */
  name: string
  /** Lowest tier this species can appear at. */
  tier: Tier
  /** Procedural body description, consumed by every renderer. */
  body: BodyShape
}

export interface DecorItem {
  id: DecorId
  name: string
  /** Aquarium level required to unlock this decoration. */
  unlockLevel: number
  /** Visual width in CSS pixels in the tank. */
  width: number
  /** Visual height in CSS pixels in the tank. */
  height: number
  /** Primary hue in degrees, 0..360. */
  hue: number
  sat: number
  light: number
}

export interface PlacedDecor {
  id: DecorId
  /** Normalized horizontal coordinate across the tank bottom (0.05..0.95). */
  x: number
  /** Horizontal orientation: 1 (normal) or -1 (flipped). */
  flip?: 1 | -1
}

export type BodyForm =
  | 'fish'
  | 'jellyfish'
  | 'seahorse'
  | 'eel'
  | 'seasnake'
  | 'ray'
  | 'turtle'

/**
 * Renderer-neutral body description. A theme may either draw this
 * procedurally or ignore it and blit `sprites/<speciesId>.png` instead.
 */
export interface BodyShape {
  /** Silhouette form. Defaults to 'fish'. */
  form?: BodyForm
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
  /** Remaining breeding attempts. */
  uses: number
  /** Initial breeding attempts rolled at birth, for x/y display. */
  maxUses?: number
  /** Epoch ms when the fry becomes an adult or finishes breeding cooldown. Null once ready. */
  maturesAt: number | null
  /** Epoch ms of birth, for the "acquisition order" sort. */
  bornAt: number
  /** True once its maturation EXP has been banked. */
  expBanked: boolean
}

export type Locale = 'zh' | 'en'
export type ColorMode = 'auto' | 'light' | 'dark'
export type FishSort = 'inTank' | 'tier' | 'grade' | 'uses' | 'acquired'
export type BgmTrackId = 'lofi' | 'tide' | 'chiptune'

export interface AudioConfig {
  sfxEnabled: boolean
  sfxVolume: number
  bgmEnabled: boolean
  bgmVolume: number
  bgmTrack: BgmTrackId
}

export interface MergeFilter {
  /** Only include fish with 0 remaining breeding attempts. */
  zeroUsesOnly: boolean
  /** Exclude fish currently placed in the aquarium display tank. */
  excludeInTank: boolean
  /** Allowed rarity tiers (1..4). */
  tiers: Tier[]
}

export interface GameState {
  version: number
  fish: Fish[]
  /** Fish uids currently placed in the visual aquarium tank (capped by tank capacity). */
  tankUids?: string[]
  /** Decorations currently placed on the bottom of the aquarium tank. */
  placedDecor?: PlacedDecor[]
  /** Filter and auto-select settings on the Merge tab. */
  mergeFilter?: MergeFilter
  /** Preferred sort order on the Tank tab. */
  tankSort?: FishSort
  /** Preferred sort order on the Breed tab. */
  breedSort?: FishSort
  /** Audio settings (SFX & Lo-Fi BGM). */
  audio?: AudioConfig
  hearts: number
  /** Epoch ms the next heart finishes regenerating. */
  nextHeartAt: number
  exp: number
  level: number
  /** Species ids ever owned, for the collection book. */
  discovered: SpeciesId[]
  /** Variant keys (`${speciesId}:${grade}`) ever owned, for the 5-grade variant catalog. */
  discoveredVariants?: string[]
  theme: string
  colorMode?: ColorMode
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
  /** EXP gained from this breeding action. */
  expGained: number
}

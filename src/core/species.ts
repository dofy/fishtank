import type { DecorId, DecorItem, PlacedDecor, Species, SpeciesId, Tier } from './types'

/**
 * Species table. The renderers draw every entry procedurally from `body`,
 * so adding a species is one object here plus, if a theme wants bespoke art,
 * one PNG in public/themes/<theme>/sprites/<id>.png.
 */
export const SPECIES: Species[] = [
  // Tier 0 — starter stock, handed out at level 1.
  { id: 'goldfin', name: 'Goldfin Starter', tier: 0, body: { form: 'fish', length: 12, depth: 0.5, tail: 0.35, dorsal: 0.3, pattern: 'plain', hue: 32, sat: 0.8, light: 0.55 } },
  { id: 'greyminnow', name: 'Grey Minnow', tier: 0, body: { form: 'fish', length: 11, depth: 0.4, tail: 0.3, dorsal: 0.25, pattern: 'plain', hue: 210, sat: 0.1, light: 0.6 } },

  // Tier 1 — Common.
  { id: 'copperband', name: 'Copperband Butterflyfish', tier: 1, body: { form: 'fish', length: 14, depth: 0.85, tail: 0.3, dorsal: 0.6, pattern: 'stripes', hue: 38, sat: 0.75, light: 0.6 } },
  { id: 'moonhorn', name: 'Moonhorn Tang', tier: 1, body: { form: 'fish', length: 15, depth: 0.8, tail: 0.35, dorsal: 0.5, pattern: 'bands', hue: 48, sat: 0.6, light: 0.62 } },
  { id: 'neoncleaner', name: 'Neon Cleaner Wrasse', tier: 1, body: { form: 'fish', length: 13, depth: 0.35, tail: 0.3, dorsal: 0.2, pattern: 'stripes', hue: 196, sat: 0.7, light: 0.55 } },
  { id: 'mossback', name: 'Mossback Otocinclus', tier: 1, body: { form: 'fish', length: 12, depth: 0.38, tail: 0.28, dorsal: 0.35, pattern: 'spots', hue: 96, sat: 0.35, light: 0.4 } },
  { id: 'sapphiredamsel', name: 'Sapphire Damselfish', tier: 1, body: { form: 'fish', length: 13, depth: 0.55, tail: 0.32, dorsal: 0.4, pattern: 'gradient', hue: 214, sat: 0.8, light: 0.5 } },
  { id: 'banggai', name: 'Banggai Starfin', tier: 1, body: { form: 'fish', length: 14, depth: 0.7, tail: 0.5, dorsal: 0.7, pattern: 'spots', hue: 220, sat: 0.2, light: 0.55 } },
  { id: 'moonjelly', name: 'Moon Jellyfish', tier: 1, body: { form: 'jellyfish', length: 14, depth: 0.85, tail: 0.45, dorsal: 0.2, pattern: 'spots', hue: 195, sat: 0.75, light: 0.68 } },

  // Tier 2 — Uncommon.
  { id: 'goldbutterfly', name: 'Golden Butterflyfish', tier: 2, body: { form: 'fish', length: 16, depth: 0.85, tail: 0.3, dorsal: 0.6, pattern: 'bands', hue: 44, sat: 0.9, light: 0.6 } },
  { id: 'neonstreak', name: 'Neon Streak Tetra', tier: 2, body: { form: 'fish', length: 12, depth: 0.42, tail: 0.3, dorsal: 0.2, pattern: 'stripes', hue: 178, sat: 0.85, light: 0.52 } },
  { id: 'blushingfire', name: 'Blushing Firefish', tier: 2, body: { form: 'fish', length: 15, depth: 0.4, tail: 0.4, dorsal: 0.8, pattern: 'gradient', hue: 8, sat: 0.8, light: 0.58 } },
  { id: 'creampuff', name: 'Cream Puff Puffer', tier: 2, body: { form: 'fish', length: 13, depth: 0.95, tail: 0.25, dorsal: 0.2, pattern: 'spots', hue: 36, sat: 0.3, light: 0.75 } },
  { id: 'coralseahorse', name: 'Coral Seahorse', tier: 2, body: { form: 'seahorse', length: 14, depth: 0.92, tail: 0.3, dorsal: 0.5, pattern: 'bands', hue: 342, sat: 0.78, light: 0.62 } },
  { id: 'bandedkrait', name: 'Banded Sea Snake', tier: 2, body: { form: 'seasnake', length: 19, depth: 0.36, tail: 0.2, dorsal: 0.1, pattern: 'bands', hue: 190, sat: 0.55, light: 0.58 } },

  // Tier 3 — Rare.
  { id: 'royalgoldtail', name: 'Royal Goldtail', tier: 3, body: { form: 'fish', length: 17, depth: 0.6, tail: 0.55, dorsal: 0.45, pattern: 'gradient', hue: 268, sat: 0.6, light: 0.5 } },
  { id: 'skywing', name: 'Skywing Flying Fish', tier: 3, body: { form: 'fish', length: 18, depth: 0.4, tail: 0.45, dorsal: 0.9, pattern: 'plain', hue: 200, sat: 0.5, light: 0.65 } },
  { id: 'emberbarb', name: 'Ember Barb', tier: 3, body: { form: 'fish', length: 15, depth: 0.55, tail: 0.4, dorsal: 0.35, pattern: 'bands', hue: 16, sat: 0.85, light: 0.5 } },
  { id: 'volteel', name: 'Volt Electric Eel', tier: 3, body: { form: 'eel', length: 21, depth: 0.34, tail: 0.2, dorsal: 0.5, pattern: 'stripes', hue: 202, sat: 0.9, light: 0.56 } },
  { id: 'crystaljelly', name: 'Sakura Jellyfish', tier: 3, body: { form: 'jellyfish', length: 16, depth: 0.9, tail: 0.5, dorsal: 0.3, pattern: 'gradient', hue: 318, sat: 0.82, light: 0.65 } },

  // Tier 4 — Legendary.
  { id: 'goldenmoorish', name: 'Golden Moorish Idol', tier: 4, body: { form: 'fish', length: 18, depth: 0.9, tail: 0.35, dorsal: 1, pattern: 'bands', hue: 50, sat: 0.85, light: 0.6 } },
  { id: 'voidray', name: 'Void Manta Ray', tier: 4, body: { form: 'ray', length: 20, depth: 0.82, tail: 0.45, dorsal: 0.3, pattern: 'spots', hue: 268, sat: 0.58, light: 0.38 } },
  { id: 'auroraeel', name: 'Aurora Ribbon Eel', tier: 4, body: { form: 'eel', length: 22, depth: 0.32, tail: 0.2, dorsal: 0.6, pattern: 'stripes', hue: 155, sat: 0.78, light: 0.52 } },
  { id: 'goldenseahorse', name: 'Golden Seahorse', tier: 4, body: { form: 'seahorse', length: 16, depth: 0.95, tail: 0.35, dorsal: 0.65, pattern: 'spots', hue: 45, sat: 0.92, light: 0.6 } },
  { id: 'jadeturtle', name: 'Jade Sea Turtle', tier: 4, body: { form: 'turtle', length: 19, depth: 0.78, tail: 0.2, dorsal: 0.25, pattern: 'spots', hue: 138, sat: 0.62, light: 0.46 } },

  // Tier 5 — Mythic.
  { id: 'prismkoi', name: 'Prism Koi', tier: 5, body: { form: 'fish', length: 22, depth: 0.6, tail: 0.65, dorsal: 0.4, pattern: 'gradient', hue: 320, sat: 0.7, light: 0.6 } },
  { id: 'leviathanfry', name: 'Leviathan Sea Serpent', tier: 5, body: { form: 'seasnake', length: 24, depth: 0.42, tail: 0.3, dorsal: 0.8, pattern: 'spots', hue: 188, sat: 0.75, light: 0.44 } },
  { id: 'astraljelly', name: 'Astral Crown Jelly', tier: 5, body: { form: 'jellyfish', length: 19, depth: 0.95, tail: 0.55, dorsal: 0.5, pattern: 'spots', hue: 276, sat: 0.85, light: 0.62 } },
]

const BY_ID = new Map<SpeciesId, Species>(SPECIES.map((s) => [s.id, s]))

export function hasSpecies(id: SpeciesId): boolean {
  return BY_ID.has(id)
}

export function species(id: SpeciesId): Species {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`unknown species: ${id}`)
  return s
}

/** Species that can appear at a given tier. */
export function poolForTier(tier: Tier): Species[] {
  const pool = SPECIES.filter((s) => s.tier === tier)
  return pool.length > 0 ? pool : SPECIES.filter((s) => s.tier <= tier)
}

export const STARTER_SPECIES: SpeciesId[] = ['goldfin', 'goldfin', 'greyminnow']

/**
 * Aquarium decorations unlocked across Levels 1..10 (matching PC FISH:
 * 3 starter decorations at Level 1 + 1 new decoration per level up to Level 10).
 * Custom sprites can be placed at public/themes/<theme>/sprites/decor-<id>.png.
 */
export const DECORATIONS: DecorItem[] = [
  { id: 'kelp', name: 'Seaweed Cluster', unlockLevel: 1, mount: 'floor', width: 48, height: 92, hue: 142, sat: 0.55, light: 0.42 },
  { id: 'rocks', name: 'Reef Stones', unlockLevel: 1, mount: 'floor', width: 64, height: 42, hue: 205, sat: 0.16, light: 0.46 },
  { id: 'shell', name: 'Pearl Giant Clam', unlockLevel: 1, mount: 'floor', width: 50, height: 44, hue: 330, sat: 0.55, light: 0.68 },
  { id: 'fairylights', name: 'Rainbow String Lights', unlockLevel: 1, mount: 'top', width: 128, height: 34, hue: 46, sat: 0.9, light: 0.65 },
  { id: 'coral', name: 'Staghorn Coral', unlockLevel: 2, mount: 'floor', width: 62, height: 74, hue: 12, sat: 0.78, light: 0.62 },
  { id: 'mushroom', name: 'Luminous Sea Shrooms', unlockLevel: 2, mount: 'floor', width: 56, height: 58, hue: 174, sat: 0.82, light: 0.56 },
  { id: 'starfish', name: 'Starfish Rock', unlockLevel: 3, mount: 'floor', width: 56, height: 48, hue: 26, sat: 0.85, light: 0.58 },
  { id: 'starlamps', name: 'Starlight Pendants', unlockLevel: 3, mount: 'top', width: 96, height: 52, hue: 50, sat: 0.92, light: 0.68 },
  { id: 'driftwood', name: 'Sunken Driftwood', unlockLevel: 4, mount: 'floor', width: 84, height: 56, hue: 28, sat: 0.48, light: 0.36 },
  { id: 'anemone', name: 'Glowing Anemone', unlockLevel: 5, mount: 'floor', width: 58, height: 64, hue: 286, sat: 0.72, light: 0.62 },
  { id: 'lanterns', name: 'Festival Lanterns', unlockLevel: 5, mount: 'top', width: 112, height: 46, hue: 14, sat: 0.88, light: 0.58 },
  { id: 'arch', name: 'Stone Archway', unlockLevel: 6, mount: 'floor', width: 86, height: 78, hue: 198, sat: 0.14, light: 0.5 },
  { id: 'crystal', name: 'Amethyst Geode', unlockLevel: 6, mount: 'floor', width: 62, height: 68, hue: 272, sat: 0.76, light: 0.58 },
  { id: 'chest', name: 'Treasure Chest', unlockLevel: 7, mount: 'floor', width: 60, height: 54, hue: 40, sat: 0.75, light: 0.52 },
  { id: 'jellylamps', name: 'Neon Jelly Chandelier', unlockLevel: 7, mount: 'top', width: 108, height: 54, hue: 308, sat: 0.85, light: 0.64 },
  { id: 'anchor', name: 'Ancient Anchor', unlockLevel: 8, mount: 'floor', width: 58, height: 82, hue: 210, sat: 0.22, light: 0.4 },
  { id: 'castle', name: 'Sunken Castle', unlockLevel: 9, mount: 'floor', width: 88, height: 96, hue: 38, sat: 0.35, light: 0.66 },
  { id: 'statue', name: 'Abyssal Idol', unlockLevel: 10, mount: 'floor', width: 64, height: 94, hue: 175, sat: 0.32, light: 0.46 },
]

const DECOR_BY_ID = new Map<DecorId, DecorItem>(DECORATIONS.map((d) => [d.id, d]))

export function hasDecor(id: DecorId): boolean {
  return DECOR_BY_ID.has(id)
}

export function decorItem(id: DecorId): DecorItem {
  const d = DECOR_BY_ID.get(id)
  if (!d) throw new Error(`unknown decor: ${id}`)
  return d
}

export const STARTER_DECOR: PlacedDecor[] = [
  { id: 'kelp', x: 0.14, flip: 1 },
  { id: 'rocks', x: 0.5, flip: 1 },
  { id: 'shell', x: 0.84, flip: 1 },
]

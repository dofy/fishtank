import { syncAudioConfig } from './audio'
import { USES_BY_TIER } from './balance'
import { SAVE_VERSION, makeFish, newGame, syncDecor, syncMergeFilter, syncTank, tick } from './game'
import { detectLocale } from './i18n'
import { STARTER_DECOR, STARTER_SPECIES, hasSpecies } from './species'
import type { GameState } from './types'

const KEY = 'fishtank.save.v1'

export function load(now = Date.now()): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return newGame(now)
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== SAVE_VERSION) return newGame(now)
    if (!Array.isArray(parsed.fish)) return newGame(now)
    if (parsed.locale !== 'zh' && parsed.locale !== 'en') {
      parsed.locale = detectLocale()
    }
    if (
      parsed.colorMode !== 'auto' &&
      parsed.colorMode !== 'light' &&
      parsed.colorMode !== 'dark'
    ) {
      parsed.colorMode = 'auto'
    }
    if (
      parsed.breedSort !== 'tier' &&
      parsed.breedSort !== 'grade' &&
      parsed.breedSort !== 'uses' &&
      parsed.breedSort !== 'acquired'
    ) {
      parsed.breedSort = 'tier'
    }
    if (
      parsed.tankSort !== 'inTank' &&
      parsed.tankSort !== 'tier' &&
      parsed.tankSort !== 'grade' &&
      parsed.tankSort !== 'uses' &&
      parsed.tankSort !== 'acquired'
    ) {
      parsed.tankSort = 'inTank'
    }

    parsed.fish = parsed.fish.filter((f) => f && hasSpecies(f.speciesId))
    parsed.discovered = Array.isArray(parsed.discovered)
      ? parsed.discovered.filter((id) => hasSpecies(id))
      : [...new Set(STARTER_SPECIES)]

    // Ensure at least the 3 starter goldfish exist and have infinite uses
    const starters = parsed.fish.filter((f) => f.tier === 0)
    for (const s of starters) {
      s.uses = USES_BY_TIER[0]
      s.maxUses = USES_BY_TIER[0]
    }
    while (parsed.fish.filter((f) => f.tier === 0).length < STARTER_SPECIES.length) {
      const idx = parsed.fish.filter((f) => f.tier === 0).length
      const spId = STARTER_SPECIES[idx] ?? 'goldfin'
      parsed.fish.unshift(makeFish(spId, 0, 1, now, { adult: true }))
    }

    for (const f of parsed.fish) {
      if (!f.maxUses || f.maxUses < f.uses) {
        f.maxUses = Math.max(f.uses, USES_BY_TIER[f.tier])
      }
    }

    if (!Array.isArray(parsed.tankUids) || parsed.tankUids.length === 0) {
      parsed.tankUids = parsed.fish.slice(0, 3).map((f) => f.uid)
    }
    if (!Array.isArray(parsed.placedDecor)) {
      parsed.placedDecor = STARTER_DECOR.map((d) => ({ ...d }))
    }
    syncTank(parsed)
    syncDecor(parsed)
    syncMergeFilter(parsed)
    parsed.audio = syncAudioConfig(parsed.audio)

    // Offline progress: one catch-up tick covers however long the tab was shut.
    tick(parsed, now)
    return parsed
  } catch {
    return newGame(now)
  }
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private windows and blocked storage both land here. The run continues
    // in memory; losing a cozy aquarium is not worth an error dialog.
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

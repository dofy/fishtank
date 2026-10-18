import { SAVE_VERSION, newGame, tick } from './game'
import type { GameState } from './types'

const KEY = 'fishtank.save.v1'

export function load(now = Date.now()): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return newGame(now)
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== SAVE_VERSION) return newGame(now)
    if (!Array.isArray(parsed.fish)) return newGame(now)
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

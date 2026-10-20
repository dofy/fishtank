import { syncRailLightConfig } from './lighting'
import { hasDecor } from './species'
import type { GameState, TankPreset } from './types'

// Compatibility only: layout presets no longer have a gameplay entry or actions.
const MAX_TANK_PRESETS = 6
const MAX_PRESET_NAME = 24
const MAX_DISPLAY_SLOTS = 12

function nameText(value: string): string {
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, MAX_PRESET_NAME).join('')
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Preserve valid legacy metadata without applying it to the current aquarium. */
export function validTankPresets(value: unknown): value is TankPreset[] {
  if (!Array.isArray(value) || value.length > MAX_TANK_PRESETS) return false
  const ids = new Set<string>()
  for (const p of value) {
    if (!record(p) || typeof p.id !== 'string' || !p.id.trim() || p.id.length > 80 || ids.has(p.id)) return false
    ids.add(p.id)
    if (typeof p.name !== 'string' || !nameText(p.name) || Array.from(p.name).length > MAX_PRESET_NAME) return false
    if (!Array.isArray(p.tankUids) || p.tankUids.length > MAX_DISPLAY_SLOTS ||
      p.tankUids.some(uid => typeof uid !== 'string' || !uid || uid.length > 200) ||
      new Set(p.tankUids).size !== p.tankUids.length) return false
    if (!Array.isArray(p.placedDecor) || p.placedDecor.length > MAX_DISPLAY_SLOTS) return false
    const decorIds = new Set<string>()
    for (const d of p.placedDecor) {
      if (!record(d) || typeof d.id !== 'string' || !hasDecor(d.id) || decorIds.has(d.id)) return false
      decorIds.add(d.id)
      if (typeof d.x !== 'number' || !Number.isFinite(d.x) || d.x < 0.06 || d.x > 0.94) return false
      if (d.flip !== undefined && d.flip !== 1 && d.flip !== -1) return false
    }
    if ((p.colorMode !== 'auto' && p.colorMode !== 'light' && p.colorMode !== 'dark') || !record(p.railLights)) return false
    if (typeof p.railLights.animated !== 'boolean' || typeof p.railLights.frequency !== 'number' ||
      !Number.isFinite(p.railLights.frequency) || p.railLights.frequency < 0.2 || p.railLights.frequency > 2) return false
  }
  return true
}

/** Prune corrupt optional legacy layouts without discarding fish or progression. */
export function syncTankPresets(state: GameState): void {
  if (state.tankPresets === undefined) { delete state.activeTankPresetId; return }
  const ids = new Set<string>()
  state.tankPresets = (Array.isArray(state.tankPresets) ? state.tankPresets : [])
    .filter(p => {
      if (!validTankPresets([p]) || ids.has(p.id)) return false
      ids.add(p.id)
      return true
    })
    .slice(0, MAX_TANK_PRESETS)
    .map(p => ({ ...p, name: nameText(p.name), tankUids: [...p.tankUids],
      placedDecor: p.placedDecor.map(d => ({ ...d })), railLights: syncRailLightConfig(p.railLights) }))
  if (!state.tankPresets.some(p => p.id === state.activeTankPresetId)) delete state.activeTankPresetId
}

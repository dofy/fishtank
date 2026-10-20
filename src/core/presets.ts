import { capacityForLevel, decorCapacityForLevel } from './balance'
import { syncRailLightConfig } from './lighting'
import { decorItem, hasDecor } from './species'
import type { GameState, TankPreset } from './types'

export const MAX_TANK_PRESETS = 6
export const MAX_PRESET_NAME = 24
const MAX_DISPLAY_SLOTS = 12
let nextId = 0

export type PresetError = 'name' | 'limit' | 'missing'
export type PresetSaveResult = { preset: TankPreset } | { error: PresetError }
export type PresetApplyResult = { missingFish: number; skippedDecor: number } | { error: 'missing' | 'storage' }

function nameText(value: string): string {
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, MAX_PRESET_NAME).join('')
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Saved fish may no longer exist; only applying a preset resolves ownership. */
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

/** Ignore broken optional local layouts without throwing away the main save. */
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

/** Compare presentation settings only; growth, names and rendering themes are unrelated. */
export function tankPresetStatus(state: GameState): { preset: TankPreset; modified: boolean } | undefined {
  const preset = state.tankPresets?.find(p => p.id === state.activeTankPresetId)
  if (!preset) return undefined
  const expected = resolveTankPreset(state, preset).layout
  const fish = state.tankUids ?? []
  const decor = state.placedDecor ?? []
  const lights = syncRailLightConfig(state.railLights)
  const modified = fish.length !== expected.tankUids.length || expected.tankUids.some(uid => !fish.includes(uid)) ||
    decor.length !== expected.placedDecor.length || expected.placedDecor.some((d, i) => {
      const current = decor[i]
      return !current || d.id !== current.id || Math.abs(d.x - current.x) > 0.00001 || (d.flip ?? 1) !== (current.flip ?? 1)
    }) || (state.colorMode ?? 'auto') !== expected.colorMode ||
    lights.animated !== expected.railLights.animated || lights.frequency !== expected.railLights.frequency
  return { preset, modified }
}

export function resolveTankPreset(state: GameState, preset: TankPreset): {
  layout: Pick<TankPreset, 'tankUids' | 'placedDecor' | 'colorMode' | 'railLights'>
  missingFish: number
  skippedDecor: number
} {
  const owned = new Set(state.fish.map(f => f.uid))
  const tankUids = [...new Set(preset.tankUids)].filter(uid => owned.has(uid)).slice(0, capacityForLevel(state.level))
  const placedDecor = preset.placedDecor.filter(d => hasDecor(d.id) && decorItem(d.id).unlockLevel <= state.level)
    .slice(0, decorCapacityForLevel(state.level)).map(d => ({ ...d }))
  return {
    layout: { tankUids, placedDecor, colorMode: preset.colorMode, railLights: { ...preset.railLights } },
    missingFish: preset.tankUids.length - tankUids.length,
    skippedDecor: preset.placedDecor.length - placedDecor.length,
  }
}

export function saveTankPreset(state: GameState, name: string, overwriteId?: string): PresetSaveResult {
  const normalized = nameText(name)
  if (!normalized) return { error: 'name' }
  const list = state.tankPresets ?? []
  const existing = overwriteId ? list.find(p => p.id === overwriteId) : undefined
  if (overwriteId && !existing) return { error: 'missing' }
  if (!existing && list.length >= MAX_TANK_PRESETS) return { error: 'limit' }
  // Use the same resolver for capture and application, including an intentionally empty tank.
  const current = resolveTankPreset(state, {
    id: '', name: '', tankUids: state.tankUids ?? [], placedDecor: state.placedDecor ?? [],
    colorMode: state.colorMode ?? 'auto', railLights: syncRailLightConfig(state.railLights),
  }).layout
  nextId++
  let id = existing?.id ?? `layout-${Date.now().toString(36)}-${nextId.toString(36)}`
  while (!existing && list.some(p => p.id === id)) { nextId++; id = `layout-${Date.now().toString(36)}-${nextId.toString(36)}` }
  const preset: TankPreset = { id, name: normalized, ...current }
  state.tankPresets = existing ? list.map(p => p.id === existing.id ? preset : p) : [...list, preset]
  state.activeTankPresetId = id
  return { preset }
}

export function renameTankPreset(state: GameState, id: string, name: string): boolean {
  const normalized = nameText(name)
  if (!normalized || !state.tankPresets?.some(p => p.id === id)) return false
  state.tankPresets = state.tankPresets.map(p => p.id === id ? { ...p, name: normalized } : p)
  return true
}

export function deleteTankPreset(state: GameState, id: string): boolean {
  if (!state.tankPresets?.some(p => p.id === id)) return false
  state.tankPresets = state.tankPresets.filter(p => p.id !== id)
  if (state.activeTankPresetId === id) delete state.activeTankPresetId
  return true
}

export function applyTankPreset(state: GameState, id: string): PresetApplyResult {
  const preset = state.tankPresets?.find(p => p.id === id)
  if (!preset) return { error: 'missing' }
  const { layout, missingFish, skippedDecor } = resolveTankPreset(state, preset)
  Object.assign(state, layout)
  state.activeTankPresetId = id
  return { missingFish, skippedDecor }
}

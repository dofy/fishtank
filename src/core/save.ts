import { syncAudioConfig } from './audio'
import {
  EXP_BY_TIER,
  HEART_MAX,
  USES_BY_TIER,
  capacityForLevel,
  decorCapacityForLevel,
  gradeExpMultiplier,
} from './balance'
import { syncCollectionPreferences } from './collection'
import { syncTankPresets, validTankPresets } from './presets'
import {
  SAVE_VERSION,
  makeFish,
  newGame,
  recordVariant,
  syncDecor,
  syncMergeFilter,
  syncTank,
  tick,
} from './game'
import { detectLocale } from './i18n'
import { syncRailLightConfig } from './lighting'
import { syncMilestones, validMilestones } from './milestones'
import {
  STARTER_DECOR,
  STARTER_SPECIES,
  decorItem,
  hasDecor,
  hasSpecies,
  species,
} from './species'
import type { GameState, Grade, Tier } from './types'

const KEY = 'fishtank.save.v1'
const RECENT_BACKUP_KEY = 'fishtank.backup.recent.v1'
const PRE_RESTORE_BACKUP_KEY = 'fishtank.backup.pre-restore.v1'
const BACKUP_FORMAT = 'fishtank-backup'
const BACKUP_VERSION = 1
const BACKUP_INTERVAL_MS = 5 * 60_000
const MAX_SAVE_BYTES = 5 * 1024 * 1024
const MAX_FISH = 20_000
const MAX_SHORT_STRING = 200

export type SaveErrorCode =
  | 'too-large'
  | 'invalid-json'
  | 'invalid-format'
  | 'unsupported-version'
  | 'invalid-state'
  | 'too-many-fish'
  | 'duplicate-uid'

export class SaveDataError extends Error {
  constructor(readonly code: SaveErrorCode) {
    super(code)
    this.name = 'SaveDataError'
  }
}

export interface ParsedSaveImport {
  state: GameState
  exportedAt: string | null
}

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  state: GameState
}

function fail(code: SaveErrorCode): never {
  throw new SaveDataError(code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isTimestamp(value: unknown): value is number {
  return isSafeNonNegativeInteger(value)
}

function isShortString(value: unknown, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= MAX_SHORT_STRING && (allowEmpty || value.length > 0)
}

function assertStringArray(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxLength) fail('invalid-state')
  if (!value.every((item) => isShortString(item))) fail('invalid-state')
  return value as string[]
}

function assertOptionalPreferences(state: Record<string, unknown>): void {
  if (state.locale !== undefined && state.locale !== 'zh' && state.locale !== 'en') fail('invalid-state')
  if (
    state.colorMode !== undefined &&
    state.colorMode !== 'auto' &&
    state.colorMode !== 'light' &&
    state.colorMode !== 'dark'
  ) fail('invalid-state')

  const breedSorts = ['tier', 'grade', 'uses', 'acquired']
  if (state.breedSort !== undefined && !breedSorts.includes(String(state.breedSort))) fail('invalid-state')
  const tankSorts = ['inTank', ...breedSorts]
  if (state.tankSort !== undefined && !tankSorts.includes(String(state.tankSort))) fail('invalid-state')
}

/** Reject unsafe save data before a normalizer can silently discard it. */
function assertValidState(value: unknown): asserts value is GameState {
  if (!isRecord(value)) fail('invalid-state')
  if (value.version !== SAVE_VERSION) fail('unsupported-version')
  if (!Array.isArray(value.fish)) fail('invalid-state')
  if (value.fish.length > MAX_FISH) fail('too-many-fish')

  const uids = new Set<string>()
  for (const item of value.fish) {
    if (!isRecord(item)) fail('invalid-state')
    if (!isShortString(item.uid) || uids.has(item.uid)) {
      if (typeof item.uid === 'string' && uids.has(item.uid)) fail('duplicate-uid')
      fail('invalid-state')
    }
    uids.add(item.uid)
    if (!isShortString(item.speciesId) || !hasSpecies(item.speciesId)) fail('invalid-state')
    if (!Number.isInteger(item.tier) || item.tier !== species(item.speciesId).tier) fail('invalid-state')
    if (!Number.isInteger(item.grade) || (item.grade as number) < 1 || (item.grade as number) > 5) fail('invalid-state')
    if (item.tier === 0 && item.grade !== 1) fail('invalid-state')
    if (!isSafeNonNegativeInteger(item.uses)) fail('invalid-state')
    if (
      item.maxUses !== undefined &&
      (!isSafeNonNegativeInteger(item.maxUses) || item.maxUses < item.uses)
    ) fail('invalid-state')
    if (item.maturesAt !== null && !isTimestamp(item.maturesAt)) fail('invalid-state')
    if (!isTimestamp(item.bornAt)) fail('invalid-state')
    if (item.birthExp !== undefined) {
      const maxFishExp = Math.round(
        EXP_BY_TIER[item.tier as Tier] * gradeExpMultiplier(item.grade as Grade),
      )
      if (!isSafeNonNegativeInteger(item.birthExp) || item.birthExp > maxFishExp) fail('invalid-state')
    }
    if (typeof item.expBanked !== 'boolean') fail('invalid-state')
    if (item.nickname !== undefined && typeof item.nickname !== 'string') fail('invalid-state')
    if (item.favorite !== undefined && typeof item.favorite !== 'boolean') fail('invalid-state')
    if (item.locked !== undefined && typeof item.locked !== 'boolean') fail('invalid-state')
  }

  if (!Number.isInteger(value.hearts) || (value.hearts as number) < 0 || (value.hearts as number) > HEART_MAX) fail('invalid-state')
  if (!isTimestamp(value.nextHeartAt) || !isSafeNonNegativeInteger(value.exp)) fail('invalid-state')
  if (!Number.isInteger(value.level) || (value.level as number) < 1 || (value.level as number) > 10) fail('invalid-state')
  if (!isShortString(value.theme) || !isTimestamp(value.lastTick)) fail('invalid-state')

  const discovered = assertStringArray(value.discovered, 10_000)
  if (new Set(discovered).size !== discovered.length || discovered.some((id) => !hasSpecies(id))) fail('invalid-state')
  if (value.discoveredVariants !== undefined) {
    const variants = assertStringArray(value.discoveredVariants, 50_000)
    if (new Set(variants).size !== variants.length) fail('invalid-state')
    for (const key of variants) {
      const match = /^([^:]+):([1-5])$/.exec(key)
      if (!match || !hasSpecies(match[1]!)) fail('invalid-state')
    }
  }

  if (value.tankUids !== undefined) {
    const tankUids = assertStringArray(value.tankUids, MAX_FISH)
    if (new Set(tankUids).size !== tankUids.length || tankUids.some((uid) => !uids.has(uid))) fail('invalid-state')
    if (tankUids.length > capacityForLevel(value.level as number)) fail('invalid-state')
  }

  if (value.placedDecor !== undefined) {
    if (!Array.isArray(value.placedDecor)) fail('invalid-state')
    if (value.placedDecor.length > decorCapacityForLevel(value.level as number)) fail('invalid-state')
    const decorIds = new Set<string>()
    for (const item of value.placedDecor) {
      if (!isRecord(item) || !isShortString(item.id) || !hasDecor(item.id)) fail('invalid-state')
      if (decorIds.has(item.id)) fail('invalid-state')
      decorIds.add(item.id)
      if (decorItem(item.id).unlockLevel > (value.level as number)) fail('invalid-state')
      if (typeof item.x !== 'number' || !Number.isFinite(item.x) || item.x < 0.06 || item.x > 0.94) fail('invalid-state')
      if (item.flip !== undefined && item.flip !== 1 && item.flip !== -1) fail('invalid-state')
    }
  }

  if (value.collectionTarget !== undefined) {
    if (!isRecord(value.collectionTarget) || !isShortString(value.collectionTarget.speciesId)) fail('invalid-state')
    if (!hasSpecies(value.collectionTarget.speciesId)) fail('invalid-state')
    if (
      value.collectionTarget.grade !== undefined &&
      (!Number.isInteger(value.collectionTarget.grade) ||
        (value.collectionTarget.grade as number) < 1 ||
        (value.collectionTarget.grade as number) > 5)
    ) fail('invalid-state')
  }
  if (
    value.breedGoal !== undefined && value.breedGoal !== 'species' &&
    value.breedGoal !== 'variant' && value.breedGoal !== 'tier' && value.breedGoal !== 'target'
  ) fail('invalid-state')

  assertOptionalPreferences(value)
  if (value.tankPresets !== undefined && !validTankPresets(value.tankPresets)) fail('invalid-state')
  if (value.activeTankPresetId !== undefined && (typeof value.activeTankPresetId !== 'string' ||
    !value.tankPresets?.some(p => p.id === value.activeTankPresetId))) fail('invalid-state')
  if (value.milestones !== undefined && !validMilestones(value.milestones)) fail('invalid-state')
}

function normalizeState(
  state: GameState,
  now: number,
  advanceOffline: boolean,
): GameState {
  if (state.locale !== 'zh' && state.locale !== 'en') state.locale = detectLocale()
  if (state.colorMode !== 'auto' && state.colorMode !== 'light' && state.colorMode !== 'dark') state.colorMode = 'auto'
  if (
    state.breedSort !== 'tier' && state.breedSort !== 'grade' &&
    state.breedSort !== 'uses' && state.breedSort !== 'acquired'
  ) state.breedSort = 'tier'
  if (
    state.tankSort !== 'inTank' && state.tankSort !== 'tier' && state.tankSort !== 'grade' &&
    state.tankSort !== 'uses' && state.tankSort !== 'acquired'
  ) state.tankSort = 'inTank'

  state.fish = state.fish.filter((fish) => fish && hasSpecies(fish.speciesId))
  state.discovered = Array.isArray(state.discovered)
    ? state.discovered.filter((id) => hasSpecies(id))
    : [...new Set(STARTER_SPECIES)]

  for (const starter of state.fish.filter((fish) => fish.tier === 0)) {
    starter.uses = USES_BY_TIER[0]
    starter.maxUses = USES_BY_TIER[0]
  }
  while (state.fish.filter((fish) => fish.tier === 0).length < STARTER_SPECIES.length) {
    const idx = state.fish.filter((fish) => fish.tier === 0).length
    const speciesId = STARTER_SPECIES[idx] ?? 'goldfin'
    state.fish.unshift(makeFish(speciesId, 0, 1, now, { adult: true }))
  }

  const hasVariantHistory = Array.isArray(state.discoveredVariants)
  for (const fish of state.fish) {
    if (!fish.maxUses || fish.maxUses < fish.uses) fish.maxUses = Math.max(fish.uses, USES_BY_TIER[fish.tier])
    recordVariant(state, fish.speciesId, fish.grade, false)
  }
  if (!hasVariantHistory) {
    for (const speciesId of state.discovered) {
      if (!state.discoveredVariants?.some((key) => key.startsWith(`${speciesId}:`))) {
        recordVariant(state, speciesId, 1, false)
      }
    }
  }

  // An explicit empty tank is intentional, including after importing a save.
  if (!Array.isArray(state.tankUids)) state.tankUids = state.fish.slice(0, 3).map((fish) => fish.uid)
  if (!Array.isArray(state.placedDecor)) state.placedDecor = STARTER_DECOR.map((decor) => ({ ...decor }))
  syncTank(state)
  syncDecor(state)
  syncMergeFilter(state)
  state.audio = syncAudioConfig(state.audio)
  state.railLights = syncRailLightConfig(state.railLights)
  syncCollectionPreferences(state)
  syncTankPresets(state)
  syncMilestones(state)
  if (advanceOffline) tick(state, now)
  return state
}

function parseEnvelope(value: unknown): { state: unknown; exportedAt: string | null } {
  if (!isRecord(value)) fail('invalid-format')
  if ('format' in value || 'state' in value || 'exportedAt' in value) {
    if (value.format !== BACKUP_FORMAT) fail('invalid-format')
    if (value.version !== BACKUP_VERSION) fail('unsupported-version')
    if (typeof value.exportedAt !== 'string') fail('invalid-format')
    const date = new Date(value.exportedAt)
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.exportedAt) fail('invalid-format')
    return { state: value.state, exportedAt: value.exportedAt }
  }
  return { state: value, exportedAt: null }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

export function exportSave(state: GameState, now = Date.now()): string {
  assertValidState(state)
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    state,
  }
  const serialized = JSON.stringify(envelope)
  if (byteLength(serialized) > MAX_SAVE_BYTES) fail('too-large')
  return serialized
}

export function parseSaveImport(text: string, now = Date.now()): ParsedSaveImport {
  if (typeof text !== 'string') fail('invalid-format')
  if (byteLength(text) > MAX_SAVE_BYTES) fail('too-large')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    fail('invalid-json')
  }
  const envelope = parseEnvelope(parsed)
  assertValidState(envelope.state)
  const state = normalizeState(envelope.state, now, true)
  assertValidState(state)
  return { state, exportedAt: envelope.exportedAt }
}

export function load(now = Date.now()): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return newGame(now)
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.fish)) return newGame(now)
    return normalizeState(parsed, now, true)
  } catch {
    return newGame(now)
  }
}

function primarySaveText(state: GameState): string {
  assertValidState(state)
  const serialized = JSON.stringify(state)
  if (byteLength(serialized) > MAX_SAVE_BYTES) fail('too-large')
  return serialized
}

function backupExportedAt(raw: string | null): number | null {
  if (!raw) return null
  try {
    const envelope = parseEnvelope(JSON.parse(raw) as unknown)
    return envelope.exportedAt ? Date.parse(envelope.exportedAt) : null
  } catch {
    return null
  }
}

function backupTextForPreviousSave(raw: string, fallback: GameState, now: number): string {
  try {
    const parsed = JSON.parse(raw) as unknown
    assertValidState(parsed)
    return exportSave(parsed, now)
  } catch {
    return exportSave(fallback, now)
  }
}

export function save(state: GameState, now = Date.now()): boolean {
  let serialized: string
  try {
    serialized = primarySaveText(state)
  } catch {
    return false
  }
  try {
    const previous = localStorage.getItem(KEY)
    const previousRecent = localStorage.getItem(RECENT_BACKUP_KEY)
    const lastBackupAt = backupExportedAt(previousRecent)
    const backupDue = previous !== null && (lastBackupAt === null || now - lastBackupAt >= BACKUP_INTERVAL_MS)
    if (!backupDue) {
      localStorage.setItem(KEY, serialized)
      return true
    }

    const backup = backupTextForPreviousSave(previous, state, now)
    try {
      localStorage.setItem(RECENT_BACKUP_KEY, backup)
      localStorage.setItem(KEY, serialized)
      return true
    } catch {
      try {
        if (previousRecent === null) localStorage.removeItem(RECENT_BACKUP_KEY)
        else localStorage.setItem(RECENT_BACKUP_KEY, previousRecent)
      } catch {
        // Best effort only: the primary save is deliberately written last.
      }
      return false
    }
  } catch {
    return false
  }
}

export function saveImportedState(state: GameState, currentState: GameState, now = Date.now()): boolean {
  let replacement: string
  let snapshot: string
  try {
    replacement = primarySaveText(state)
    snapshot = exportSave(currentState, now)
  } catch {
    return false
  }

  let previousPrimary: string | null
  let previousSnapshot: string | null
  try {
    previousPrimary = localStorage.getItem(KEY)
    previousSnapshot = localStorage.getItem(PRE_RESTORE_BACKUP_KEY)
  } catch {
    return false
  }

  try {
    localStorage.setItem(PRE_RESTORE_BACKUP_KEY, snapshot)
    localStorage.setItem(KEY, replacement)
    return true
  } catch {
    try {
      if (previousSnapshot === null) localStorage.removeItem(PRE_RESTORE_BACKUP_KEY)
      else localStorage.setItem(PRE_RESTORE_BACKUP_KEY, previousSnapshot)
    } catch {
      // Keep attempting to restore the primary even if the snapshot slot is unavailable.
    }
    try {
      if (previousPrimary === null) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, previousPrimary)
    } catch {
      // Normal localStorage failures are atomic per key; the write order protects primary data.
    }
    return false
  }
}

export function getSaveBackup(now = Date.now(), slot: 'latest' | 'recent' | 'pre-restore' = 'latest'): ParsedSaveImport | null {
  try {
    const keys = slot === 'pre-restore' ? [PRE_RESTORE_BACKUP_KEY]
      : slot === 'recent' ? [RECENT_BACKUP_KEY] : [RECENT_BACKUP_KEY, PRE_RESTORE_BACKUP_KEY]
    const candidates = keys
      .map((key) => localStorage.getItem(key))
      .filter((raw): raw is string => raw !== null)
      .map((raw) => {
        try {
          return parseSaveImport(raw, now)
        } catch {
          return null
        }
      })
      .filter((item): item is ParsedSaveImport => item !== null && item.exportedAt !== null)
    candidates.sort((a, b) => Date.parse(b.exportedAt!) - Date.parse(a.exportedAt!))
    return candidates[0] ?? null
  } catch {
    return null
  }
}

export function wipe(): void {
  for (const key of [KEY, RECENT_BACKUP_KEY, PRE_RESTORE_BACKUP_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Keep clearing the remaining save keys when storage is partly available.
    }
  }
}

import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
let server, game, presets, save, species
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, hmr: false } })
  game = await server.ssrLoadModule('/src/core/game.ts')
  presets = await server.ssrLoadModule('/src/core/presets.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
  species = await server.ssrLoadModule('/src/core/species.ts')
})
after(async () => server?.close())
const clone = value => JSON.parse(JSON.stringify(value))

test('captures independent display references, normalized positions, orientation and lighting', () => {
  const state = game.newGame(NOW, 'zh')
  state.colorMode = 'dark'
  state.railLights = { animated: false, frequency: 1.2 }
  state.placedDecor[0].x = 0.23
  state.placedDecor[0].flip = -1
  const { preset } = presets.saveTankPreset(state, '夜景')
  assert.deepEqual(preset.tankUids, state.tankUids)
  assert.deepEqual(preset.placedDecor, state.placedDecor)
  state.tankUids.pop()
  state.placedDecor[0].x = 0.8
  state.railLights.frequency = 2
  assert.equal(preset.tankUids.length, 3)
  assert.equal(preset.placedDecor[0].x, 0.23)
  assert.equal(preset.placedDecor[0].flip, -1)
  assert.deepEqual(preset.railLights, { animated: false, frequency: 1.2 })
})

test('name limits count Unicode code points; empty names never create or overwrite a layout', () => {
  const state = game.newGame(NOW, 'en')
  const { preset } = presets.saveTankPreset(state, '  ' + '🐠'.repeat(30) + '  ')
  assert.equal(Array.from(preset.name).length, 24)
  assert.equal(preset.name, '🐠'.repeat(24))
  const before = clone(state)
  assert.deepEqual(presets.saveTankPreset(state, '\u0000\n ', preset.id), { error: 'name' })
  assert.equal(presets.renameTankPreset(state, preset.id, '   '), false)
  assert.deepEqual(state, before)
})

test('six slots are bounded; overwriting retains the ID and deleting permits a new slot', () => {
  const state = game.newGame(NOW)
  for (let i = 0; i < 6; i++) assert.ok(presets.saveTankPreset(state, `Layout ${i}`).preset)
  const before = clone(state)
  assert.deepEqual(presets.saveTankPreset(state, 'overflow'), { error: 'limit' })
  assert.deepEqual(state, before)
  const first = state.tankPresets[0].id
  state.tankUids = []
  assert.equal(presets.saveTankPreset(state, 'Empty', first).preset.id, first)
  assert.equal(state.tankPresets.length, 6)
  assert.equal(presets.renameTankPreset(state, first, 'Quiet water'), true)
  assert.equal(state.tankPresets[0].name, 'Quiet water')
  assert.equal(presets.deleteTankPreset(state, first), true)
  assert.ok(presets.saveTankPreset(state, 'Another').preset)
  assert.equal(new Set(state.tankPresets.map(p => p.id)).size, 6)
})

test('applying preserves inventory, protection, progression, breeding state and theme', () => {
  const state = game.newGame(NOW)
  state.fish[0].nickname = 'Old friend'
  state.fish[0].locked = true
  state.fish[0].favorite = true
  const { preset } = presets.saveTankPreset(state, 'Night')
  state.tankUids = [state.fish[1].uid]
  state.placedDecor = []
  state.colorMode = 'light'
  const before = clone(state)
  assert.deepEqual(presets.applyTankPreset(state, preset.id), { missingFish: 0, skippedDecor: 0 })
  const ignored = new Set(['tankUids', 'placedDecor', 'colorMode', 'railLights'])
  for (const key of Object.keys(before)) if (!ignored.has(key)) assert.deepEqual(state[key], before[key], key)
  assert.deepEqual(state.tankUids, preset.tankUids)
})

test('missing fish and current capacity are respected without substituting or recreating fish', () => {
  const state = game.newGame(NOW)
  state.level = 10
  for (let i = 0; i < 9; i++) state.fish.push(game.makeFish('neoncleaner', 1, 1, NOW, { adult: true }))
  state.tankUids = state.fish.map(f => f.uid)
  const { preset } = presets.saveTankPreset(state, 'Full')
  state.fish = state.fish.slice(1)
  state.level = 1
  const inventory = clone(state.fish)
  assert.deepEqual(presets.applyTankPreset(state, preset.id), { missingFish: 9, skippedDecor: 0 })
  assert.deepEqual(state.tankUids, inventory.slice(0, 3).map(f => f.uid))
  assert.deepEqual(state.fish, inventory)
  assert.equal(preset.tankUids.length, 12)
})

test('unavailable decorations are skipped; saved order, positions and flips remain independent', () => {
  const state = game.newGame(NOW)
  state.level = 10
  state.placedDecor = species.DECORATIONS.slice(0, 12).map((d, i) => ({ id: d.id, x: 0.06 + i * 0.07, flip: -1 }))
  const { preset } = presets.saveTankPreset(state, 'Reef')
  state.level = 1
  const expected = preset.placedDecor.filter(d => species.decorItem(d.id).unlockLevel <= 1).slice(0, 3)
  const result = presets.applyTankPreset(state, preset.id)
  assert.equal(result.skippedDecor, 12 - expected.length)
  assert.deepEqual(state.placedDecor, expected)
  state.placedDecor[0].x = 0.5
  assert.equal(preset.placedDecor[0].x, 0.06)
})

test('empty layouts remain empty through application, export and import', () => {
  const state = game.newGame(NOW)
  state.tankUids = []
  state.placedDecor = []
  const { preset } = presets.saveTankPreset(state, 'Open water')
  state.tankUids = state.fish.map(f => f.uid)
  state.placedDecor = clone(species.STARTER_DECOR)
  presets.applyTankPreset(state, preset.id)
  const parsed = save.parseSaveImport(save.exportSave(state, NOW), NOW).state
  assert.deepEqual(parsed.tankUids, [])
  assert.deepEqual(parsed.placedDecor, [])
  assert.deepEqual(parsed.tankPresets[0], preset)
})

test('missing preset operations are atomic', () => {
  const state = game.newGame(NOW)
  const before = clone(state)
  assert.deepEqual(presets.applyTankPreset(state, 'no-such-layout'), { error: 'missing' })
  assert.deepEqual(presets.saveTankPreset(state, 'Missing', 'no-such-layout'), { error: 'missing' })
  assert.equal(presets.renameTankPreset(state, 'no-such-layout', 'X'), false)
  assert.equal(presets.deleteTankPreset(state, 'no-such-layout'), false)
  assert.deepEqual(state, before)
})

test('import accepts stale fish references and future-unlocked decorations, never inventing ownership', () => {
  const state = game.newGame(NOW)
  state.level = 10
  state.placedDecor = [{ id: species.DECORATIONS.at(-1).id, x: 0.94, flip: -1 }]
  const { preset } = presets.saveTankPreset(state, 'Later')
  preset.id = 'layout-with-"-quote'
  state.activeTankPresetId = preset.id
  preset.tankUids = ['fish-no-longer-owned']
  state.level = 1
  state.placedDecor = []
  const restored = save.parseSaveImport(save.exportSave(state, NOW), NOW).state
  assert.deepEqual(restored.tankPresets[0], preset)
  assert.deepEqual(presets.applyTankPreset(restored, preset.id), { missingFish: 1, skippedDecor: 1 })
  assert.equal(restored.fish.length, 3)
  assert.deepEqual(restored.tankUids, [])
})

test('malformed preset imports are rejected before optional fields can be dropped', () => {
  const state = game.newGame(NOW)
  presets.saveTankPreset(state, 'Safe')
  for (const mutate of [
    s => { s.tankPresets = {} },
    s => { s.tankPresets = Array(7).fill(s.tankPresets[0]) },
    s => { s.tankPresets.push(clone(s.tankPresets[0])) },
    s => { s.tankPresets[0].tankUids.push(s.tankPresets[0].tankUids[0]) },
    s => { s.tankPresets[0].placedDecor[0].id = 'unknown-decor' },
    s => { s.tankPresets[0].placedDecor[0].x = 1 },
    s => { s.tankPresets[0].placedDecor[0].flip = 0 },
    s => { s.tankPresets[0].railLights.frequency = 20 },
    s => { s.tankPresets[0].colorMode = { toString: 1 } },
    s => { s.tankPresets[0].name = '' },
    s => { s.tankPresets[0].name = '🐠'.repeat(25) },
  ]) {
    const bad = clone(state); mutate(bad)
    assert.throws(() => save.parseSaveImport(JSON.stringify(bad), NOW), e => e.code === 'invalid-state')
  }
})

test('damaged optional local presets are pruned without changing owned fish or valid layouts', () => {
  const state = game.newGame(NOW)
  presets.saveTankPreset(state, 'Safe')
  const valid = clone(state.tankPresets[0]), inventory = clone(state.fish)
  state.tankPresets.push({ id: 'broken' }, clone(valid))
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(state) } })
    const loaded = save.load(NOW)
    assert.deepEqual(loaded.tankPresets, [valid])
    assert.deepEqual(loaded.fish, inventory)
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else delete globalThis.localStorage
  }
})

test('current layout tracks save, apply, rename, overwrite and deletion without switching to identical copies', () => {
  const state = game.newGame(NOW)
  assert.equal(presets.tankPresetStatus(state), undefined)
  const first = presets.saveTankPreset(state, 'First').preset
  const second = presets.saveTankPreset(state, 'Identical').preset
  assert.equal(presets.tankPresetStatus(state).preset.id, second.id)
  presets.applyTankPreset(state, first.id)
  assert.equal(presets.tankPresetStatus(state).preset.id, first.id)
  assert.equal(presets.tankPresetStatus(state).modified, false)
  presets.renameTankPreset(state, first.id, 'Renamed')
  assert.equal(presets.tankPresetStatus(state).preset.name, 'Renamed')
  state.placedDecor[0].x = 0.65
  assert.equal(presets.tankPresetStatus(state).modified, true)
  presets.saveTankPreset(state, 'Renamed', first.id)
  assert.equal(presets.tankPresetStatus(state).modified, false)
  presets.deleteTankPreset(state, second.id)
  assert.equal(state.activeTankPresetId, first.id)
  presets.deleteTankPreset(state, first.id)
  assert.equal(presets.tankPresetStatus(state), undefined)
  assert.equal(state.activeTankPresetId, undefined)
})

test('presentation edits mark current layout modified; reverting clears it and unrelated game changes do not', () => {
  const original = game.newGame(NOW)
  presets.saveTankPreset(original, 'Reef')
  for (const mutate of [
    s => s.tankUids.pop(),
    s => s.placedDecor.pop(),
    s => { s.placedDecor[0].x += 0.1 },
    s => { s.placedDecor[0].flip = -1 },
    s => s.placedDecor.reverse(),
    s => { s.colorMode = 'dark' },
    s => { s.railLights.animated = !s.railLights.animated },
    s => { s.railLights.frequency = 2 },
  ]) {
    const state = clone(original); mutate(state)
    assert.equal(presets.tankPresetStatus(state).modified, true)
    presets.applyTankPreset(state, state.activeTankPresetId)
    assert.equal(presets.tankPresetStatus(state).modified, false)
  }
  const state = clone(original)
  state.theme = 'lcd'; state.fish[0].nickname = 'Friend'; state.fish[0].grade = 3
  state.fish[0].favorite = true; state.hearts--; state.exp++; state.tankUids.reverse()
  state.placedDecor[0].flip = 1
  assert.equal(presets.tankPresetStatus(state).modified, false)
})

test('skipped ownership and capacity are not unsaved edits after applying a layout', () => {
  const state = game.newGame(NOW)
  const preset = presets.saveTankPreset(state, 'Reef').preset
  preset.tankUids.push('missing-fish')
  preset.placedDecor.push({ id: species.DECORATIONS.at(-1).id, x: 0.5 })
  const result = presets.applyTankPreset(state, preset.id)
  assert.ok(result.missingFish > 0 && result.skippedDecor > 0)
  assert.equal(presets.tankPresetStatus(state).modified, false)
})

test('active and modified layout state survive save round trips; invalid active references are rejected or pruned', () => {
  const state = game.newGame(NOW)
  presets.saveTankPreset(state, 'Reef')
  state.placedDecor[0].x = 0.65
  const restored = save.parseSaveImport(save.exportSave(state, NOW), NOW).state
  assert.equal(restored.activeTankPresetId, state.activeTankPresetId)
  assert.equal(presets.tankPresetStatus(restored).modified, true)
  for (const id of ['missing', 123, {}, null]) {
    const bad = clone(state); bad.activeTankPresetId = id
    assert.throws(() => save.parseSaveImport(JSON.stringify(bad), NOW), e => e.code === 'invalid-state')
    presets.syncTankPresets(bad)
    assert.equal(bad.activeTankPresetId, undefined)
    assert.deepEqual(bad.fish, state.fish)
  }
  const old = clone(state); delete old.activeTankPresetId
  assert.equal(save.parseSaveImport(JSON.stringify(old), NOW).state.activeTankPresetId, undefined)
})

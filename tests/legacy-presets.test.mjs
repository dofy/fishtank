import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
let server, game, save, legacy
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, hmr: false } })
  game = await server.ssrLoadModule('/src/core/game.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
  legacy = await server.ssrLoadModule('/src/core/legacy-presets.ts')
})
after(async () => server?.close())
const clone = value => JSON.parse(JSON.stringify(value))

function legacyState() {
  const state = game.newGame(NOW, 'en')
  state.fish[0].nickname = 'Captain'
  state.fish[0].locked = true
  state.tankPresets = [{
    id: 'old-layout', name: 'Old night layout', tankUids: ['no-longer-owned'],
    placedDecor: [{ id: 'kelp', x: 0.7, flip: -1 }],
    colorMode: 'dark', railLights: { animated: false, frequency: 1.2 },
  }]
  state.activeTankPresetId = 'old-layout'
  return state
}

test('legacy preset metadata survives import/export without changing current fish, layout or lights', () => {
  const state = legacyState()
  const incoming = save.parseSaveImport(JSON.stringify(state), NOW).state
  const restored = save.parseSaveImport(save.exportSave(incoming, NOW), NOW).state
  for (const key of ['fish', 'tankUids', 'placedDecor', 'colorMode', 'railLights', 'exp', 'hearts']) {
    assert.deepEqual(restored[key], state[key], key)
  }
  assert.deepEqual(restored.tankPresets, state.tankPresets)
  assert.equal(restored.activeTankPresetId, state.activeTankPresetId)
})

test('removed preset feature still rejects corrupt legacy metadata during strict import', () => {
  for (const mutate of [
    s => { s.tankPresets = {} },
    s => { s.tankPresets = Array(7).fill(s.tankPresets[0]) },
    s => { s.tankPresets.push(clone(s.tankPresets[0])) },
    s => { s.tankPresets[0].tankUids.push('no-longer-owned') },
    s => { s.tankPresets[0].placedDecor[0].x = 1 },
    s => { s.tankPresets[0].placedDecor[0].id = 'invalid-decor' },
    s => { s.tankPresets[0].railLights.frequency = 20 },
    s => { s.activeTankPresetId = 'missing-layout' },
  ]) {
    const state = legacyState(); mutate(state)
    assert.throws(() => save.parseSaveImport(JSON.stringify(state), NOW), e => e.code === 'invalid-state')
  }
})

test('legacy local normalization prunes corrupt presets without touching the active aquarium', () => {
  const state = legacyState(), before = clone(state), valid = clone(state.tankPresets[0])
  state.tankPresets.push({ id: 'broken' }, clone(valid))
  legacy.syncTankPresets(state)
  assert.deepEqual(state.tankPresets, [valid])
  for (const key of ['fish', 'tankUids', 'placedDecor', 'colorMode', 'railLights']) {
    assert.deepEqual(state[key], before[key], key)
  }
  state.activeTankPresetId = 'missing-layout'
  legacy.syncTankPresets(state)
  assert.equal(state.activeTankPresetId, undefined)
})

test('fresh games and old saves without presets never gain legacy layout metadata', () => {
  const state = game.newGame(NOW, 'en')
  const restored = save.parseSaveImport(save.exportSave(state, NOW), NOW).state
  assert.equal(restored.tankPresets, undefined)
  assert.equal(restored.activeTankPresetId, undefined)
})

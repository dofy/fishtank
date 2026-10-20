import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
const PRIMARY_KEY = 'fishtank.save.v1'
const storage = new Map()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let server, game, milestones, save, species

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
  })
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
  })
  game = await server.ssrLoadModule('/src/core/game.ts')
  milestones = await server.ssrLoadModule('/src/core/milestones.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
  species = await server.ssrLoadModule('/src/core/species.ts')
})

after(async () => {
  await server?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

beforeEach(() => storage.clear())

const clone = value => JSON.parse(JSON.stringify(value))
const byId = (state, id) => milestones.milestoneProgress(state).find(item => item.id === id)

test('retains six original ids and defines fourteen stable medals and a starter game has no unlocks', () => {
  assert.deepEqual(milestones.MILESTONE_IDS.slice(0,6), [
    'first-friend',
    'tier-one',
    'jelly-family',
    'grade-five',
    'variant-collector',
    'reef-explorer',
  ])
  assert.equal(milestones.MILESTONES.length, 14)
  const state = game.newGame(NOW, 'en')
  assert.ok(milestones.milestoneProgress(state).every(item => item.unlocked === false))
  assert.equal(byId(state, 'reef-explorer').current, 2)
})

test('recordVariant unlocks from exact history and unlocks survive release', () => {
  const state = game.newGame(NOW, 'en')
  const fish = game.makeFish('copperband', 1, 5, NOW, { adult: true })
  state.fish.push(fish)
  assert.equal(game.recordVariant(state, fish.speciesId, fish.grade), true)
  assert.deepEqual(state.milestones.unlocked, ['first-friend', 'grade-five'])
  assert.equal(game.recordVariant(state, fish.speciesId, fish.grade), false)
  assert.deepEqual(state.milestones.unlocked, ['first-friend', 'grade-five'])
  assert.equal(game.release(state, fish.uid), true)
  assert.equal(byId(state, 'grade-five').unlocked, true)
})

test('species and grade progress avoid legacy and starter false positives', () => {
  const state = game.newGame(NOW, 'en')
  const tierOne = species.SPECIES.filter(item => item.tier === 1)
  state.discovered.push(...tierOne.map(item => item.id))
  state.discoveredVariants.push('goldfin:5', `${tierOne[0].id}:4`)
  milestones.syncMilestones(state)
  assert.equal(byId(state, 'tier-one').current, tierOne.length)
  assert.equal(byId(state, 'tier-one').unlocked, true)
  assert.equal(byId(state, 'grade-five').current, 0)
  assert.equal(byId(state, 'variant-collector').current, 1)

  state.fish.push(game.makeFish(tierOne[1].id, 1, 5, NOW, { adult: true }))
  assert.equal(byId(state, 'grade-five').current, 1, 'a surviving exact-grade fish is evidence')
})

test('jelly, variant and full-reef thresholds use historic ownership', () => {
  const state = game.newGame(NOW, 'en')
  const nonstarters = species.SPECIES.filter(item => item.tier > 0)
  const variants = nonstarters.flatMap(item =>
    [1, 2, 3, 4, 5].map(grade => `${item.id}:${grade}`),
  )
  state.discovered = species.SPECIES.map(item => item.id)
  state.discoveredVariants = variants.slice(0, 25)
  milestones.syncMilestones(state)
  assert.equal(byId(state, 'jelly-family').current, 3)
  assert.equal(byId(state, 'jelly-family').unlocked, true)
  assert.equal(byId(state, 'variant-collector').current, 25)
  assert.equal(byId(state, 'variant-collector').unlocked, true)
  assert.equal(byId(state, 'reef-explorer').current, 29)
  assert.equal(byId(state, 'reef-explorer').unlocked, true)
})

test('sync is idempotent and a plaque can only use an unlocked unique id', () => {
  const state = game.newGame(NOW, 'en')
  state.discovered.push('copperband')
  milestones.syncMilestones(state)
  const once = clone(state.milestones)
  milestones.syncMilestones(state)
  assert.deepEqual(state.milestones, once)
  assert.equal(milestones.setDisplayedMilestones(state, ['reef-explorer']), false)
  assert.equal(milestones.setDisplayedMilestones(state, ['first-friend']), true)
  assert.deepEqual(state.milestones.displayed, ['first-friend'])
  assert.equal(milestones.setDisplayedMilestones(state, []), true)
  assert.equal(state.milestones.displayed, undefined)
})

test('strict imports reject malformed optional milestone metadata', () => {
  const invalid = [
    null,
    {},
    { unlocked: 'first-friend' },
    { unlocked: ['missing'] },
    { unlocked: ['first-friend', 'first-friend'] },
    { unlocked: [], displayed: 'first-friend' },
    { unlocked: [...milestones.MILESTONE_IDS, 'first-friend'] },
  ]
  for (const metadata of invalid) {
    const state = game.newGame(NOW, 'en')
    state.milestones = metadata
    assert.throws(
      () => save.parseSaveImport(JSON.stringify(state), NOW),
      error => error?.name === 'SaveDataError' && error.code === 'invalid-state',
    )
  }
})

test('legacy imports derive unlocks after variant normalization', () => {
  const state = game.newGame(NOW, 'en')
  state.discovered.push('copperband')
  delete state.discoveredVariants
  delete state.milestones
  const parsed = save.parseSaveImport(JSON.stringify(state), NOW)
  assert.ok(parsed.state.discoveredVariants.includes('copperband:1'))
  assert.deepEqual(parsed.state.milestones, { unlocked: ['first-friend'] })
})

test('local load prunes corrupt milestone metadata without losing fish', () => {
  const state = game.newGame(NOW, 'en')
  const fish = game.makeFish('copperband', 1, 5, NOW, { adult: true })
  state.fish.push(fish)
  state.discovered.push(fish.speciesId)
  state.discoveredVariants.push(`${fish.speciesId}:${fish.grade}`)
  state.milestones = {
    unlocked: ['missing', 'first-friend', 'first-friend', 'grade-five'],
    displayed: 'missing',
  }
  storage.set(PRIMARY_KEY, JSON.stringify(state))
  const loaded = save.load(NOW)
  assert.ok(loaded.fish.some(item => item.uid === fish.uid))
  assert.deepEqual(loaded.milestones, { unlocked: ['first-friend', 'grade-five'] })
})

test('displayed plaque survives export and restore', () => {
  const state = game.newGame(NOW, 'en')
  game.recordVariant(state, 'copperband', 1)
  assert.equal(milestones.setDisplayedMilestones(state, ['first-friend']), true)
  const restored = save.parseSaveImport(save.exportSave(state, NOW), NOW).state
  assert.deepEqual(restored.milestones, {
    unlocked: ['first-friend'],
    displayed: ['first-friend'],
  })
})


test('all fourteen medals have reachable, distinct collection thresholds', () => {
  const state = game.newGame(NOW, 'en')
  for (const sp of species.SPECIES.filter(sp => sp.tier > 0)) for (const grade of [1,2,3,4,5]) game.recordVariant(state, sp.id, grade)
  assert.equal(new Set(milestones.MILESTONE_IDS).size,14)
  assert.ok(milestones.milestoneProgress(state).every(p => p.unlocked && p.current === p.total))
  assert.equal(byId(state,'eel-family').total,3)
  assert.equal(byId(state,'color-palette').current,5)
  assert.equal(byId(state,'variant-master').current,60)
  assert.equal(milestones.setDisplayedMilestones(state,milestones.MILESTONE_IDS),true)
  const restored = save.parseSaveImport(save.exportSave(state,NOW),NOW).state
  assert.deepEqual(restored.milestones.displayed,milestones.MILESTONE_IDS)
})

test('multi-medal display toggles independently and rejects duplicate or locked awards', () => {
  const state = game.newGame(NOW,'en');game.recordVariant(state,'copperband',5)
  assert.equal(milestones.setDisplayedMilestones(state,['first-friend','grade-five']),true)
  const old = clone(state.milestones.displayed)
  assert.equal(milestones.setDisplayedMilestones(state,['first-friend','reef-explorer']),false)
  assert.deepEqual(state.milestones.displayed,old)
  assert.equal(milestones.setDisplayedMilestones(state,['first-friend','first-friend']),false)
  assert.deepEqual(state.milestones.displayed,old)
  assert.equal(milestones.setDisplayedMilestones(state,['grade-five']),true)
  assert.deepEqual(state.milestones.displayed,['grade-five'])
  for(const displayed of [['first-friend','first-friend'],['reef-explorer'],42]){
    const incoming=clone(state);incoming.milestones.displayed=displayed
    assert.throws(()=>save.parseSaveImport(JSON.stringify(incoming),NOW),e=>e.code==='invalid-state')
  }
})

test('legacy single-plaque saves migrate without mounting extra newly unlocked medals', () => {
  const state=game.newGame(NOW,'en');game.recordVariant(state,'copperband',5)
  state.milestones.displayed='first-friend'
  const restored=save.parseSaveImport(JSON.stringify(state),NOW).state
  assert.deepEqual(restored.milestones.displayed,['first-friend'])
  assert.ok(restored.milestones.unlocked.includes('grade-five'))
})

test('full-grade medal requires five grades of one non-starter species', () => {
  const state=game.newGame(NOW,'en')
  for(const [i,sp]of species.SPECIES.filter(s=>s.tier===1).slice(0,5).entries())game.recordVariant(state,sp.id,i+1)
  assert.equal(byId(state,'color-palette').current,1)
  for(const grade of [1,2,3,4,5])game.recordVariant(state,'copperband',grade)
  assert.equal(byId(state,'color-palette').unlocked,true)
})

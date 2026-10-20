import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
let server
let collection
let game
let species
let Rng

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
  })
  collection = await server.ssrLoadModule('/src/core/collection.ts')
  game = await server.ssrLoadModule('/src/core/game.ts')
  ;({ SPECIES: species } = await server.ssrLoadModule('/src/core/species.ts'))
  ;({ Rng } = await server.ssrLoadModule('/src/core/rng.ts'))
})

after(async () => server?.close())

function fishAt(tier, grade = 1, opts = {}) {
  const speciesId = species.find((item) => item.tier === tier).id
  return game.makeFish(speciesId, tier, grade, NOW, { adult: true, ...opts })
}

test('gradeOdds exposes the exact weights used by breeding', () => {
  assert.deepEqual(game.gradeOdds(1), [56, 26, 12, 5, 1])
  assert.deepEqual(game.gradeOdds(3), [56, 44.199999999999996, 28.799999999999997, 15.499999999999998, 3.8])

  const state = game.newGame(NOW, 'zh')
  const a = fishAt(1, 2)
  const b = fishAt(1, 4)
  state.fish = [a, b]
  const seen = []
  const random = new Rng(7)
  random.weighted = (weights) => { seen.push([...weights]); return 0 }
  game.breed(state, a.uid, b.uid, NOW, random)
  assert.deepEqual(seen[1], game.gradeOdds(3))
})

test('locking is reversible and leaves legacy metadata inert', () => {
  const state = game.newGame(NOW, 'zh')
  const fish = state.fish[0]
  fish.nickname = 'Legacy name'
  fish.favorite = true
  assert.equal(collection.setFishLocked(state, fish.uid, true), true)
  assert.equal(fish.locked, true)
  assert.equal(collection.setFishLocked(state, fish.uid, false), true)
  assert.equal(fish.locked, false)
  assert.equal(fish.nickname, 'Legacy name')
  assert.equal(fish.favorite, true)
  assert.equal(collection.setFishLocked(state, 'missing', true), false)
})

test('fish metadata normalizes safely and legacy recommendation fields stay inert', () => {
  const state = game.newGame(NOW, 'zh')
  const fish = state.fish[0]
  delete state.breedGoal
  state.collectionTarget = { speciesId: 'missing', grade: 9 }
  fish.nickname = '  Old\t Name  '
  fish.favorite = 'yes'
  fish.locked = 1
  collection.syncCollectionPreferences(state)
  assert.equal(state.breedGoal, undefined)
  assert.equal(state.collectionTarget, undefined)
  assert.equal(fish.nickname, 'Old Name')
  assert.equal(fish.favorite, undefined)
  assert.equal(fish.locked, undefined)

  state.breedGoal = 'target'
  state.collectionTarget = { speciesId: 'copperband', grade: 5 }
  collection.syncCollectionPreferences(state)
  assert.equal(state.breedGoal, 'target')
  assert.deepEqual(state.collectionTarget, { speciesId: 'copperband', grade: 5 })
})

test('locked fish are excluded from merge selection and atomically reject manual synthesis', () => {
  const state = game.newGame(NOW, 'zh')
  const materials = Array.from({ length: 11 }, () => fishAt(1, 2, { uses: 0 }))
  const locked = materials[0]
  locked.locked = true
  locked.favorite = true
  state.fish.push(...materials)
  assert.equal(game.filterMergeCandidates(state).includes(locked), false)
  assert.equal(game.autoPickForMerge(state).includes(locked.uid), false)
  const before = JSON.stringify(state)
  const result = game.synthesize(state, materials.slice(0, 10).map((fish) => fish.uid), NOW, new Rng(5))
  assert.deepEqual(result, { error: 'locked-material' })
  assert.equal(JSON.stringify(state), before)
})

test('release protection is independent from favorites and keeps starter rules', () => {
  const state = game.newGame(NOW, 'zh')
  const favorite = fishAt(1)
  favorite.favorite = true
  const locked = fishAt(1)
  locked.locked = true
  state.fish.push(favorite, locked)
  assert.equal(game.release(state, locked.uid), false)
  assert.ok(state.fish.includes(locked))
  assert.equal(game.release(state, favorite.uid), true)
  assert.equal(game.release(state, state.fish.find((fish) => fish.tier === 0).uid), false)
})


test('legacy recommendation settings do not affect actual breeding outcomes', () => {
  const plain = game.newGame(NOW, 'zh')
  const legacy = JSON.parse(JSON.stringify(plain))
  legacy.breedGoal = 'target'
  legacy.collectionTarget = { speciesId: 'copperband', grade: 5 }
  const parents = plain.fish.slice(0, 2).map(f => f.uid)
  const a = game.breed(plain, ...parents, NOW, new Rng(178))
  const b = game.breed(legacy, ...parents, NOW, new Rng(178))
  const { uid: firstUid, ...firstChild } = a.child
  const { uid: secondUid, ...secondChild } = b.child
  assert.deepEqual(firstChild, secondChild)
  assert.equal(a.expGained, b.expGained)
  assert.equal(plain.hearts, legacy.hearts)
  assert.equal(plain.breedGoal, undefined)
  assert.equal(plain.collectionTarget, undefined)
})

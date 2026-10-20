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

function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: ${actual} !== ${expected}`)
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

test('forecast uses the exact tier, uniform species and grade distributions', () => {
  const state = game.newGame(NOW, 'zh')
  const [a, b] = state.fish
  state.collectionTarget = { speciesId: 'copperband', grade: 1 }
  const before = JSON.stringify(state)
  const originalRandom = Math.random
  try {
    Math.random = () => { throw new Error('forecast must not use RNG') }
    const forecast = collection.forecastBreed(state, a, b)
    assert.deepEqual(forecast.tierOdds, [100, 0, 0, 0, 0])
    close(forecast.newSpeciesChance, 1, 'all tier-1 species are new')
    close(forecast.newVariantChance, 1, 'all tier-1 variants are new')
    close(forecast.targetChance, 0.56 / 7, 'target species and grade chance')
    close(forecast.expectedTier, 1, 'expected tier')
  } finally {
    Math.random = originalRandom
  }
  assert.equal(JSON.stringify(state), before)
})

test('forecast respects surviving specimens, variant history and legacy grade-1 fallback', () => {
  const state = game.newGame(NOW, 'zh')
  const a = fishAt(0, 5)
  const b = fishAt(0, 5)
  const specimen = game.makeFish('copperband', 1, 5, NOW, { adult: true })
  state.fish = [a, b, specimen]
  state.discovered = [...state.discovered, 'moonhorn']
  state.discoveredVariants = ['neoncleaner:3']
  const forecast = collection.forecastBreed(state, a, b)
  const gradeWeights = game.gradeOdds(5)
  const total = gradeWeights.reduce((sum, value) => sum + value, 0)
  const knownVariantChance = (
    gradeWeights[4] + // surviving copperband grade 5
    gradeWeights[0] + // legacy-discovered moonhorn falls back to grade 1
    gradeWeights[2]   // neoncleaner grade 3 from history
  ) / total / 7
  close(forecast.newSpeciesChance, 4 / 7, 'three of seven species are known')
  close(forecast.newVariantChance, 1 - knownVariantChance, 'known variant evidence')
})

test('targetReached retains completed species and grade goals from history', () => {
  const state = game.newGame(NOW, 'zh')
  state.collectionTarget = { speciesId: 'copperband', grade: 5 }
  assert.equal(collection.targetReached(state), false)
  state.discoveredVariants.push('copperband:5')
  assert.equal(collection.targetReached(state), true)
  state.discovered.push('moonhorn')
  assert.equal(collection.targetReached(state, { speciesId: 'moonhorn' }), true)
  assert.equal(collection.targetReached(state, { speciesId: 'moonhorn', grade: 1 }), true)
  assert.equal(collection.targetReached(state, { speciesId: 'moonhorn', grade: 2 }), false)
})

test('recommendPair ignores immature and exhausted fish but permits protected parents', () => {
  const state = game.newGame(NOW, 'zh')
  const lockedA = fishAt(2, 3)
  const lockedB = fishAt(3, 4)
  lockedA.locked = true
  lockedB.locked = true
  const exhausted = fishAt(5, 5, { uses: 0 })
  const juvenile = fishAt(5, 5)
  juvenile.maturesAt = NOW + 1
  state.fish = [lockedA, lockedB, exhausted, juvenile]
  const result = collection.recommendPair(state, 'tier', NOW)
  assert.deepEqual(result.uids, [lockedA.uid, lockedB.uid].sort())
  close(result.forecast.expectedTier, 2.56, 'expected tier')

  lockedB.uses = 0
  assert.equal(collection.recommendPair(state, 'tier', NOW), null)
})

test('recommendations optimize the requested goal and use deterministic tier-grade fallbacks', () => {
  const state = game.newGame(NOW, 'zh')
  const starters = state.fish.slice(0, 2)
  const mythics = [fishAt(5, 2), fishAt(5, 4)]
  state.fish = [...starters, ...mythics]
  state.discovered = species.map((item) => item.id).filter((id) => id !== 'copperband')
  state.discoveredVariants = species
    .filter((item) => item.id !== 'copperband')
    .flatMap((item) => [1, 2, 3, 4, 5].map((grade) => `${item.id}:${grade}`))

  const speciesPair = collection.recommendPair(state, 'species', NOW)
  assert.deepEqual(speciesPair.uids, starters.map((fish) => fish.uid).sort())
  close(speciesPair.forecast.newSpeciesChance, 1 / 7, 'starter pair has best missing-species chance')

  state.collectionTarget = { speciesId: 'copperband', grade: 5 }
  const targetPair = collection.recommendPair(state, 'target', NOW)
  assert.deepEqual(targetPair.uids, starters.map((fish) => fish.uid).sort())

  state.discoveredVariants.push('copperband:5')
  const completedPair = collection.recommendPair(state, 'target', NOW)
  assert.deepEqual(completedPair.uids, mythics.map((fish) => fish.uid).sort())
  assert.equal(collection.recommendPair(state, 'tier', NOW).forecast.expectedTier, 4.55)
})

test('recommendPair groups a large identical inventory and never mutates it', () => {
  const state = game.newGame(NOW, 'zh')
  state.fish = Array.from({ length: 20_000 }, () => fishAt(2, 3))
  const expected = state.fish.map((fish) => fish.uid).sort().slice(0, 2)
  const before = JSON.stringify(state)
  const result = collection.recommendPair(state, 'tier', NOW)
  assert.deepEqual(result.uids, expected)
  assert.equal(JSON.stringify(state), before)
})

test('rename and bookmark helpers normalize Unicode names without coupling favorite and lock', () => {
  const state = game.newGame(NOW, 'zh')
  const fish = state.fish[0]
  assert.equal(collection.renameFish(state, fish.uid, '  Blue \n\t Moon  '), true)
  assert.equal(fish.nickname, 'Blue Moon')
  assert.equal(collection.renameFish(state, fish.uid, '🐟'.repeat(30)), true)
  assert.equal(Array.from(fish.nickname).length, 24)
  assert.equal(collection.renameFish(state, fish.uid, '   '), true)
  assert.equal('nickname' in fish, false)
  assert.equal(collection.setFishFavorite(state, fish.uid, true), true)
  assert.equal(fish.favorite, true)
  assert.equal(Boolean(fish.locked), false)
  assert.equal(collection.setFishLocked(state, fish.uid, true), true)
  assert.equal(fish.favorite, true)
  assert.equal(fish.locked, true)
  assert.equal(collection.renameFish(state, 'missing', 'name'), false)
})

test('old and malformed collection preferences normalize to safe defaults', () => {
  const state = game.newGame(NOW, 'zh')
  const fish = state.fish[0]
  delete state.breedGoal
  state.collectionTarget = { speciesId: 'missing', grade: 9 }
  fish.nickname = '  Old\t Name  '
  fish.favorite = 'yes'
  fish.locked = 1
  collection.syncCollectionPreferences(state)
  assert.equal(state.breedGoal, 'species')
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

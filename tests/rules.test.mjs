import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
const storage = new Map()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let server
let game
let balance
let save
let Rng
let species

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  })
  // Use the existing Vite dependency to load TypeScript without another test runtime.
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null },
  })
  game = await server.ssrLoadModule('/src/core/game.ts')
  balance = await server.ssrLoadModule('/src/core/balance.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
  ;({ Rng } = await server.ssrLoadModule('/src/core/rng.ts'))
  ;({ SPECIES: species } = await server.ssrLoadModule('/src/core/species.ts'))
})

beforeEach(() => storage.clear())

after(async () => {
  await server?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

const oddsByTotal = [
  [100, 0, 0, 0, 0],
  [90, 10, 0, 0, 0],
  [76, 20, 4, 0, 0],
  [48.9, 41.6, 9.5, 0, 0],
  [37.7, 44.3, 15, 3, 0],
  [0, 50.5, 43, 6.5, 0],
  [0, 40.5, 47.5, 10, 2],
  [0, 0, 52.1, 44.4, 3.5],
  [0, 0, 43.7, 51.3, 5],
  [0, 0, 0, 70, 30],
  [0, 0, 0, 45, 55],
]

for (let a = 0; a <= 5; a++) {
  for (let b = a; b <= 5; b++) {
    test(`breeding ${a}+${b} uses the combined-tier odds in either parent order`, () => {
      assert.deepEqual(game.tierOdds(a, b), oddsByTotal[a + b])
      assert.deepEqual(game.tierOdds(b, a), oddsByTotal[a + b])
      assert.equal(game.tierOdds(a, b).reduce((sum, n) => sum + n, 0), 100)
    })
  }
}

function fishAt(tier, grade = 1, adult = true) {
  return game.makeFish(species.find((sp) => sp.tier === tier).id, tier, grade, NOW, { adult })
}

function breedAt(tier, grade) {
  const state = game.newGame(NOW, 'zh')
  const parentTier = tier <= 3 ? 1 : tier - 2
  const parents = [fishAt(parentTier), fishAt(parentTier)]
  state.fish.push(...parents)
  const random = new Rng(123)
  const rolls = [tier - 1, grade - 1, 0]
  // Select exact valid outcomes to cover all 25 tier/grade combinations, including odd EXP totals.
  random.weighted = (weights) => {
    const index = rolls.shift()
    assert.ok(weights[index] > 0)
    return index
  }
  const outcome = game.breed(state, parents[0].uid, parents[1].uid, NOW, random)
  assert.ok(!('error' in outcome))
  assert.equal(outcome.child.tier, tier)
  assert.equal(outcome.child.grade, grade)
  return { state, outcome }
}

test('every species in the rolled tier gets an equal interval regardless of parent species', () => {
  for (let aTier = 0; aTier <= 5; aTier++) {
    for (let bTier = aTier; bTier <= 5; bTier++) {
      for (let tier = 1; tier <= 5; tier++) {
        if (oddsByTotal[aTier + bTier][tier - 1] === 0) continue
        const pool = species.filter((sp) => sp.tier === tier)
        for (const sameSpecies of [true, false]) {
          for (const [index, expected] of pool.entries()) {
            const state = game.newGame(NOW, 'zh')
            const a = fishAt(aTier)
            const bPool = species.filter((sp) => sp.tier === bTier)
            const b = game.makeFish(bPool[sameSpecies ? 0 : bPool.length - 1].id, bTier, 1, NOW, { adult: true })
            state.fish = [a, b]
            const random = new Rng(123)
            // Force the star tier, then probe the middle of each equally sized species interval.
            const rolls = [tier - 1, 0, 0]
            random.weighted = () => rolls.shift()
            random.next = () => (index + 0.5) / pool.length
            const outcome = game.breed(state, a.uid, b.uid, NOW, random)
            assert.ok(!('error' in outcome))
            assert.equal(outcome.child.speciesId, expected.id, `${a.speciesId}+${b.speciesId}, tier ${tier}, interval ${index}`)
          }
        }
      }
    }
  }
})

test('parent grade weighting is unchanged for all 25 grade pairings', () => {
  for (let gradeA = 1; gradeA <= 5; gradeA++) {
    for (let gradeB = 1; gradeB <= 5; gradeB++) {
      const state = game.newGame(NOW, 'zh')
      const a = fishAt(1, gradeA)
      const b = fishAt(1, gradeB)
      state.fish = [a, b]
      const weightsSeen = []
      const random = new Rng(123)
      random.weighted = (weights) => { weightsSeen.push(weights); return 0 }
      const outcome = game.breed(state, a.uid, b.uid, NOW, random)
      assert.ok(!('error' in outcome))
      assert.deepEqual(weightsSeen[0], [76, 20, 4, 0, 0])
      const bias = 0.35 * ((gradeA + gradeB) / 2 - 1)
      assert.deepEqual(weightsSeen[1], [56, 26 * (1 + bias), 12 * (1 + 2 * bias), 5 * (1 + 3 * bias), 1 + 4 * bias])
      assert.deepEqual(weightsSeen[2], [1, 1, 2, 4, 6])
    }
  }
})

test('seeded breeding has no parent species surplus while preserving tier and grade distributions', () => {
  const state = game.newGame(NOW, 'zh')
  const a = game.makeFish('goldfin', 0, 1, NOW, { adult: true })
  const b = game.makeFish('neoncleaner', 1, 1, NOW, { adult: true })
  const random = new Rng(0x12345678)
  const trials = 70_000
  const counts = new Map()
  const grades = [0, 0, 0, 0, 0]
  let common = 0
  for (let i = 0; i < trials; i++) {
    state.fish = [a, b]
    state.hearts = 5
    a.maturesAt = null
    b.uses = 5
    const outcome = game.breed(state, a.uid, b.uid, NOW, random)
    assert.ok(!('error' in outcome))
    if (outcome.tier === 1) common++
    else assert.equal(outcome.tier, 2)
    const child = outcome.child
    counts.set(child.speciesId, (counts.get(child.speciesId) ?? 0) + 1)
    grades[child.grade - 1]++
  }
  assert.ok(Math.abs(common / trials - 0.9) < 0.01)
  for (const sp of species.filter((sp) => sp.tier > 0 && sp.tier <= 2)) {
    const tierCount = sp.tier === 1 ? common : trials - common
    const poolSize = species.filter((s) => s.tier === sp.tier).length
    assert.ok(Math.abs((counts.get(sp.id) ?? 0) / tierCount - 1 / poolSize) < 0.015, `species bias: ${sp.id}`)
  }
  for (const [index, expected] of [0.56, 0.26, 0.12, 0.05, 0.01].entries()) {
    assert.ok(Math.abs(grades[index] / trials - expected) < 0.01, `grade ${index + 1} distribution`)
  }
})

test('birth and maturation together award exactly the rounded total EXP, once', () => {
  for (let tier = 1; tier <= 5; tier++) {
    for (let grade = 1; grade <= 5; grade++) {
      const { state, outcome } = breedAt(tier, grade)
      const total = Math.round(balance.EXP_BY_TIER[tier] * balance.gradeExpMultiplier(grade))
      const birth = Math.floor(total / 2)
      assert.equal(outcome.expGained, birth)
      assert.equal(state.exp, birth)
      assert.equal(game.tick(state, outcome.child.maturesAt - 1).expGained, 0)
      assert.equal(game.tick(state, outcome.child.maturesAt).expGained, total - birth)
      assert.equal(state.exp, total)
      assert.equal(game.tick(state, NOW + 24 * 60 * 60_000).expGained, 0)
      assert.equal(state.exp, total)
    }
  }
})

test('offline loading settles only the remaining breeding EXP and never claims it twice', () => {
  const { state, outcome } = breedAt(1, 2)
  const maturesAt = outcome.child.maturesAt
  const total = Math.round(10 * 1.25)
  save.save(state)
  const before = save.load(maturesAt - 1)
  assert.equal(before.exp, Math.floor(total / 2))
  save.save(before)
  const after = save.load(maturesAt)
  assert.equal(after.exp, total)
  save.save(after)
  assert.equal(save.load(maturesAt + 1).exp, total)
})

test('ten distinct materials are consumed; merged fish inherit the best grade and full maturation EXP', () => {
  const state = game.newGame(NOW, 'zh')
  const materials = Array.from({ length: 10 }, (_, i) => fishAt(1, i === 0 ? 5 : 1))
  state.fish.push(...materials)
  const outcome = game.synthesize(state, materials.map((f) => f.uid), NOW, new Rng(123))
  assert.ok(!('error' in outcome))
  assert.equal(state.fish.length, 4)
  assert.ok(materials.every((f) => !state.fish.some((owned) => owned.uid === f.uid)))
  assert.equal(outcome.child.tier, 2)
  assert.equal(outcome.child.grade, 5)
  assert.equal(state.exp, 0)
  save.save(state)
  const loaded = save.load(outcome.child.maturesAt)
  assert.equal(loaded.exp, 80)
  assert.equal(game.tick(loaded, NOW + 24 * 60 * 60_000).expGained, 0)
})

test('legacy pending fish retain their full maturation award when the birth award is unknown', () => {
  const state = game.newGame(NOW, 'zh')
  const fry = fishAt(1, 2, false)
  delete fry.birthExp
  state.fish.push(fry)
  state.exp = 100
  save.save(state)
  assert.equal(save.load(fry.maturesAt).exp, 113)
})

for (const keepFish of [true, false]) {
  test(`loading preserves grade-5-only history after ${keepFish ? 'keeping' : 'releasing'} the specimen`, () => {
    const state = game.newGame(NOW, 'zh')
    const fish = fishAt(1, 5)
    state.fish.push(fish)
    game.recordVariant(state, fish.speciesId, fish.grade)
    if (!keepFish) game.release(state, fish.uid)
    save.save(state)
    const loaded = save.load(NOW)
    assert.deepEqual(game.discoveredGradesFor(loaded, fish.speciesId), [5])
    assert.ok(loaded.discovered.includes(fish.speciesId))
    save.save(loaded)
    assert.deepEqual(game.discoveredGradesFor(save.load(NOW), fish.speciesId), [5])
  })
}

test('loading preserves genuinely discovered grade 1 even without a surviving specimen', () => {
  const state = game.newGame(NOW, 'zh')
  game.recordVariant(state, 'copperband', 1)
  game.recordVariant(state, 'copperband', 5)
  save.save(state)
  assert.deepEqual(game.discoveredGradesFor(save.load(NOW), 'copperband'), [1, 5])
})

test('legacy variant migration uses surviving specimens and only falls back for unknown history', () => {
  const state = game.newGame(NOW, 'zh')
  const fish = fishAt(1, 5)
  state.fish.push(fish)
  state.discovered.push(fish.speciesId, 'moonjelly')
  delete state.discoveredVariants
  save.save(state)
  const loaded = save.load(NOW)
  assert.deepEqual(game.discoveredGradesFor(loaded, fish.speciesId), [5])
  assert.deepEqual(game.discoveredGradesFor(loaded, 'moonjelly'), [1])
  save.save(loaded)
  assert.deepEqual(save.load(NOW).discoveredVariants, loaded.discoveredVariants)
})

for (const duplicateCount of [2, 10]) {
  test(`synthesis rejects ${duplicateCount} copies of a UID without changing any game state`, () => {
    const state = game.newGame(NOW, 'zh')
    const materials = Array.from({ length: 10 }, () => fishAt(1))
    state.fish.push(...materials)
    const uids = [
      ...Array(duplicateCount).fill(materials[0].uid),
      ...materials.slice(duplicateCount).map((f) => f.uid),
    ]
    const snapshot = JSON.stringify(state)
    assert.deepEqual(game.synthesize(state, uids, NOW, new Rng(123)), { error: 'wrong-count' })
    assert.equal(JSON.stringify(state), snapshot)
  })
}

test('synthesis still rejects wrong counts, missing fish, starters and max-tier materials atomically', () => {
  const state = game.newGame(NOW, 'zh')
  const materials = Array.from({ length: 10 }, () => fishAt(1))
  const mythic = fishAt(5)
  state.fish.push(...materials, mythic)
  const valid = materials.map((f) => f.uid)
  for (const [uids, error] of [
    [valid.slice(0, 9), 'wrong-count'],
    [[...valid.slice(0, 9), 'missing'], 'wrong-count'],
    [[...valid.slice(0, 9), state.fish[0].uid], 'starter-material'],
    [[...valid.slice(0, 9), mythic.uid], 'max-tier'],
  ]) {
    const snapshot = JSON.stringify(state)
    assert.deepEqual(game.synthesize(state, uids, NOW, new Rng(123)), { error })
    assert.equal(JSON.stringify(state), snapshot)
  }
})

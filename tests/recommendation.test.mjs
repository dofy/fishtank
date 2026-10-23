import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
let server, game, regular, all
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, hmr: false } })
  game = await server.ssrLoadModule('/src/core/game.ts')
  const catalog = await server.ssrLoadModule('/src/core/species.ts')
  regular = catalog.REGULAR_SPECIES; all = catalog.SPECIES
})
after(async () => server?.close())
function fish(tier, grade, uid, extra = {}) {
  return { ...game.makeFish(regular.filter(s => s.tier === tier).at(-1).id, tier, grade, NOW, { adult: true }), uid, ...extra }
}
function complete() {
  const state = game.newGame(NOW, 'zh')
  state.discovered = regular.map(s => s.id)
  state.discoveredVariants = regular.flatMap(s => Array.from({ length: s.tier ? 5 : 1 }, (_, g) => `${s.id}:${g + 1}`))
  return state
}
function missSpecies(state, id) {
  state.discovered = state.discovered.filter(s => s !== id)
  state.discoveredVariants = state.discoveredVariants.filter(s => !s.startsWith(id + ':'))
}
function close(a, b) { assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`) }

test('missing mythic species uses two mythics and exact uniform-pool probability', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.fish = [fish(4, 5, 'four'), fish(5, 1, 'a'), fish(5, 1, 'b')]
  const before = JSON.stringify(state), result = game.recommendBreed(state, NOW)
  assert.deepEqual(result.pair, ['a', 'b']); assert.equal(result.reason, 'new-species')
  close(result.newSpeciesProbability, 0.55 / 3); close(result.newVariantProbability, 0.55 / 3)
  assert.equal(JSON.stringify(state), before)
})
test('missing common species prefers starters over mythics', () => {
  const state = complete(); missSpecies(state, 'copperband')
  state.fish = [fish(5, 5, 'high1'), fish(5, 5, 'high2'), fish(0, 1, 'low1'), fish(0, 1, 'low2')]
  const result = game.recommendBreed(state, NOW)
  assert.deepEqual(result.pair, ['low1', 'low2']); close(result.newSpeciesProbability, 1 / 7)
})
test('missing grade one favors low-grade parents and normalizes grade weights', () => {
  const state = complete(); state.discoveredVariants = state.discoveredVariants.filter(k => k !== 'copperband:1')
  state.fish = [fish(1, 5, 'high1'), fish(1, 5, 'high2'), fish(1, 1, 'low1'), fish(1, 1, 'low2')]
  const result = game.recommendBreed(state, NOW)
  assert.equal(result.reason, 'new-variant'); assert.deepEqual(result.pair, ['low1', 'low2'])
  close(result.newVariantProbability, 0.76 / 7 * 0.56); close(result.newSpeciesProbability, 0)
})
test('equal new-species chances are broken by new-appearance probability', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.discoveredVariants = state.discoveredVariants.filter(k => k !== 'leviathanfry:5')
  state.fish = [fish(5, 1, 'low1'), fish(5, 1, 'low2'), fish(5, 5, 'high1'), fish(5, 5, 'high2')]
  const result = game.recommendBreed(state, NOW)
  assert.deepEqual(result.pair, ['high1', 'high2']); close(result.newSpeciesProbability, 0.55 / 3)
  const weights = game.gradeOdds(5), total = weights.reduce((a, b) => a + b, 0)
  close(result.newVariantProbability, 0.55 / 3 * (1 + weights[4] / total))
})
test('new species has strict priority over many missing common appearances', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.discoveredVariants = state.discoveredVariants.filter(k => !regular.some(s => s.tier === 1 && k.startsWith(s.id + ':')))
  state.fish = [fish(5, 1, 'a'), fish(5, 1, 'b'), fish(0, 1, 'c'), fish(0, 1, 'd')]
  assert.deepEqual(game.recommendBreed(state, NOW).pair, ['a', 'b'])
})
test('unreachable new species falls back to reachable appearances with explicit reason', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.discoveredVariants = state.discoveredVariants.filter(k => k !== 'copperband:5')
  state.fish = [fish(0, 1, 'a'), fish(0, 1, 'b')]
  const result = game.recommendBreed(state, NOW)
  assert.equal(result.reason, 'new-variant'); assert.equal(result.missingSpeciesCount, 1)
  close(result.newSpeciesProbability, 0); close(result.newVariantProbability, 0.01 / 7)
})
test('collection counts history after fish are gone and excludes hidden creatures', () => {
  const state = complete(); state.fish = [fish(4, 2, 'four'), fish(5, 1, 'five')]
  assert.ok(all.some(s => s.hidden && !state.discovered.includes(s.id)))
  const result = game.recommendBreed(state, NOW)
  assert.equal(result.reason, 'complete'); assert.deepEqual(result.pair, ['five', 'four'])
  close(result.newSpeciesProbability, 0); close(result.newVariantProbability, 0)
})
test('unreachable complete-tier gaps and fewer than two eligible parents are distinguished', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.fish = [fish(0, 1, 'a'), fish(0, 1, 'b')]
  assert.equal(game.recommendBreed(state, NOW).reason, 'unreachable')
  state.fish[0].locked = true
  assert.equal(game.recommendBreed(state, NOW).reason, 'unavailable'); assert.deepEqual(game.autoPickForBreed(state, NOW), [])
})
test('protection, maturity and uses are respected, displayed parents remain eligible', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.fish = [fish(5, 5, 'locked', { locked: true }), fish(5, 5, 'young', { maturesAt: NOW + 1 }), fish(5, 5, 'empty', { uses: 0 }), fish(4, 2, 'a'), fish(4, 2, 'b')]
  state.tankUids = ['a', 'b']
  assert.deepEqual(game.recommendBreed(state, NOW).pair, ['a', 'b'])
})
test('equivalent parent buckets retain uses, age and stable results across input order', () => {
  const state = complete(); missSpecies(state, 'prismkoi')
  state.fish = [fish(5, 2, 'low', { uses: 1 }), fish(5, 2, 'old', { uses: 4, bornAt: NOW - 2 }), fish(5, 2, 'new', { uses: 4, bornAt: NOW - 1 }), fish(5, 2, 'later', { uses: 4 })]
  const first = game.recommendBreed(state, NOW)
  assert.deepEqual(first.pair, ['old', 'new']); state.fish.reverse()
  assert.deepEqual(game.recommendBreed(state, NOW), first)
})
test('optimized recommendation matches exhaustive scoring for varied collections', () => {
  for (let seed = 0; seed < 12; seed++) {
    const state = complete()
    state.discovered = state.discovered.filter((_, i) => (i + seed) % 4 !== 0)
    state.discoveredVariants = state.discoveredVariants.filter((_, i) => (i * 7 + seed) % 3 !== 0)
    state.fish = Array.from({ length: 18 }, (_, i) => fish(i % 6, (i * 3 + seed) % 5 + 1, `${seed}-${i}`, { uses: i % 5 + 1 }))
    const found = game.recommendBreed(state, NOW)
    // Independent exhaustive oracle, including every fish; compare lexicographic scores.
    const knownSpecies = new Set([...state.discovered, ...state.fish.map(f => f.speciesId)])
    const knownVariants = new Set(state.discoveredVariants.concat(state.fish.map(f => `${f.speciesId}:${f.grade}`)))
    for (const id of state.discovered) if (![...knownVariants].some(k => k.startsWith(id + ':'))) knownVariants.add(id + ':1')
    for (let i = 0; i < state.fish.length; i++) for (let j = i + 1; j < state.fish.length; j++) {
      const a = state.fish[i], b = state.fish[j], tiers = game.tierOdds(a.tier, b.tier), weights = game.gradeOdds((a.grade + b.grade) / 2)
      const sum = weights.reduce((a, b) => a + b, 0); let speciesP = 0, variantP = 0
      for (let t = 1; t <= 5; t++) {
        const pool = regular.filter(s => s.tier === t)
        for (const sp of pool) {
          if (!knownSpecies.has(sp.id)) speciesP += tiers[t - 1] / 100 / pool.length
          for (let g = 1; g <= 5; g++) if (!knownVariants.has(`${sp.id}:${g}`)) variantP += tiers[t - 1] / 100 / pool.length * weights[g - 1] / sum
        }
      }
      assert.ok(found.newSpeciesProbability + 1e-12 >= speciesP)
      if (Math.abs(found.newSpeciesProbability - speciesP) < 1e-12) assert.ok(found.newVariantProbability + 1e-12 >= variantP)
    }
  }
})

import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
const NOW = 1_800_000_000_000
let server, game, reforge, catalog, saves, Rng, milestones
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, hmr: false } })
  game = await server.ssrLoadModule('/src/core/game.ts')
  reforge = await server.ssrLoadModule('/src/core/reforge.ts')
  catalog = await server.ssrLoadModule('/src/core/species.ts')
  saves = await server.ssrLoadModule('/src/core/save.ts')
  milestones = await server.ssrLoadModule('/src/core/milestones.ts')
  ;({ Rng } = await server.ssrLoadModule('/src/core/rng.ts'))
})
after(async () => server?.close())
function materials(state) {
  const fish = [1, 2, 5].map(grade => game.makeFish('prismkoi', 5, grade, NOW, { adult: true, uses: 0 }))
  state.fish.push(...fish)
  return fish
}
function setup() {
  const state = game.newGame(NOW, 'zh')
  const fish = materials(state)
  return { state, fish, ids: fish.map(f => f.uid) }
}
function dice(chance, index = 0) {
  const random = new Rng(1)
  random.next = () => chance
  random.pick = pool => pool[Math.min(index, pool.length - 1)]
  return random
}
test('reforge consumes exactly three, inherits grade, awards fresh uses and no immediate EXP/hearts', () => {
  const { state, ids } = setup(), hearts = state.hearts, exp = state.exp, size = state.fish.length
  const out = reforge.reforge(state, ids, NOW, dice(.5))
  assert.equal(out.child.speciesId, 'prismkoi'); assert.equal(out.child.grade, 5)
  assert.equal(state.fish.length, size - 2); assert.equal(state.hearts, hearts); assert.equal(state.exp, exp)
  assert.equal(out.child.maturesAt, NOW + 20 * 60000); assert.equal(out.child.birthExp, 0)
  assert.ok(out.child.uses >= 1 && out.child.uses <= 5)
  assert.equal(out.child.locked, undefined); assert.equal(state.reforgeMisses, 1)
  assert.ok(ids.every(id => !state.fish.some(f => f.uid === id)))
  game.tick(state, NOW + 20 * 60000)
  const earned = state.exp
  assert.equal(earned - exp, 5120)
  game.tick(state, NOW + 21 * 60000); assert.equal(state.exp, earned)
})
test('every rejected transaction leaves fish, progress, hearts and random stream untouched', () => {
  for (const kind of ['duplicate', 'missing', 'too-few', 'too-many', 'locked', 'displayed', 'young', 'has-uses', 'lower-tier']) {
    const { state, ids, fish } = setup()
    if (kind === 'duplicate') ids[1] = ids[0]
    if (kind === 'missing') ids[1] = 'missing'
    if (kind === 'too-few') ids.pop()
    if (kind === 'too-many') ids.push('fourth')
    if (kind === 'locked') fish[0].locked = true
    if (kind === 'displayed') state.tankUids = [fish[0].uid]
    if (kind === 'young') fish[0].maturesAt = NOW + 1
    if (kind === 'has-uses') fish[0].uses = 1
    if (kind === 'lower-tier') { fish[0].tier = 4; fish[0].speciesId = 'jadeturtle' }
    state.reforgeMisses = 9
    const before = JSON.stringify(state), random = new Rng(1)
    random.next = () => { throw Error('Invalid action rolled RNG') }
    assert.ok('error' in reforge.reforge(state, ids, NOW, random), kind)
    assert.equal(JSON.stringify(state), before, kind)
  }
})
test('hidden roll uses 20% interval, duplicates advance pity, new discoveries reset it', () => {
  for (const [roll, hidden] of [[0, true], [.199999, true], [.2, false], [.99999, false]]) {
    const { state, ids } = setup()
    const out = reforge.reforge(state, ids, NOW, dice(roll))
    assert.equal(Boolean(catalog.species(out.child.speciesId).hidden), hidden)
    assert.equal(state.reforgeMisses, hidden ? 0 : 1)
  }
  const { state, ids } = setup()
  game.recordVariant(state, 'lanternangler', 1); state.reforgeMisses = 6
  const out = reforge.reforge(state, ids, NOW, dice(.1))
  assert.equal(out.novel, false); assert.equal(state.reforgeMisses, 7)
})
test('tenth attempt forces an undiscovered secret even when normal RNG misses; persists on export/import', () => {
  let { state, ids } = setup()
  for (const sp of catalog.HIDDEN_SPECIES.slice(0, 2)) game.recordVariant(state, sp.id, 1)
  state.reforgeMisses = 9
  state = saves.parseSaveImport(saves.exportSave(state, NOW), NOW).state
  assert.equal(state.reforgeMisses, 9)
  const out = reforge.reforge(state, ids, NOW, dice(.99))
  assert.equal(out.guaranteed, true); assert.equal(out.child.speciesId, 'starnautilus'); assert.equal(state.reforgeMisses, 0)
  const loaded = saves.parseSaveImport(saves.exportSave(state, NOW), NOW).state
  assert.equal(loaded.reforgeMisses, 0)
  assert.ok(loaded.discovered.includes('starnautilus'))
})
test('all three secrets are guaranteed within 30 valid attempts; completion disables new-species pity', () => {
  const state = game.newGame(NOW, 'zh')
  for (let n = 1; n <= 30; n++) {
    const ids = materials(state).map(f => f.uid)
    const out = reforge.reforge(state, ids, NOW, dice(.9))
    assert.equal(out.guaranteed, n % 10 === 0)
    assert.equal(catalog.HIDDEN_SPECIES.filter(sp => state.discovered.includes(sp.id)).length, Math.floor(n / 10))
  }
  state.reforgeMisses = 9
  const out = reforge.reforge(state, materials(state).map(f => f.uid), NOW, dice(.9))
  assert.equal(out.guaranteed, false); assert.equal(state.reforgeMisses, 0)
  const duplicate = reforge.reforge(state, materials(state).map(f => f.uid), NOW, dice(.1))
  assert.equal(catalog.species(duplicate.child.speciesId).hidden, true)
})
test('normal breeding and synthesis exclude all secrets, even with secret parents', () => {
  for (const tier of [0,1,2,3,4,5]) assert.ok(catalog.poolForTier(tier).every(sp => !sp.hidden))
  const state = game.newGame(NOW, 'zh'), random = new Rng(0x12345678)
  const a = game.makeFish('glassangel', 5, 5, NOW, { adult: true }), b = game.makeFish('starnautilus', 5, 5, NOW, { adult: true })
  for (let n = 0; n < 1000; n++) {
    state.fish = [a,b]; state.hearts = 5; a.uses = b.uses = 5
    const out = game.breed(state, a.uid, b.uid, NOW, random)
    assert.ok(!catalog.species(out.child.speciesId).hidden)
  }
})
test('hidden discoveries never change regular collection or existing milestone denominators', () => {
  const state = game.newGame(NOW, 'zh'), before = game.collectionProgress(state)
  const progress = milestones.milestoneProgress(state)
  for (const sp of catalog.HIDDEN_SPECIES) game.recordVariant(state, sp.id, 5)
  assert.deepEqual(game.collectionProgress(state), before)
  assert.deepEqual(milestones.milestoneProgress(state), progress)
  assert.equal(catalog.REGULAR_SPECIES.length, 29); assert.equal(catalog.HIDDEN_SPECIES.length, 3)
})
test('auto selection protects active, locked, displayed and immature fish and uses one high plus two low grades', () => {
  const { state, fish } = setup()
  const high = fish[2]
  const extra = materials(state)
  extra[0].locked = true; extra[1].uses = 1; extra[2].maturesAt = NOW + 1
  const displayed = game.makeFish('glassangel',5,5,NOW,{ adult:true,uses:0 }); state.fish.push(displayed);state.tankUids = [displayed.uid]
  const picked = reforge.autoPickForReforge(state, NOW)
  assert.equal(picked.length, 3);assert.equal(picked[0], high.uid)
  assert.deepEqual(new Set(picked), new Set(fish.map(f => f.uid)))
})
test('old saves default pity to zero, while malformed pity counters are rejected', () => {
  const state = game.newGame(NOW, 'zh'); delete state.reforgeMisses
  assert.equal(saves.parseSaveImport(JSON.stringify(state), NOW).state.reforgeMisses, 0)
  for (const value of [-1, 10, 1.2, '9', null]) {
    state.reforgeMisses = value
    assert.throws(() => saves.parseSaveImport(JSON.stringify(state), NOW), /invalid-state/)
  }
})
test('fixed-seed reforge sampling stays near 80/20 and distributes the three hidden creatures uniformly', () => {
  const state = game.newGame(NOW, 'zh'), random = new Rng(0x98765432), counts = {}
  for (const sp of catalog.HIDDEN_SPECIES) game.recordVariant(state, sp.id, 1)
  const fish = materials(state), base = state.fish.filter(f => !fish.includes(f))
  for (let n = 0; n < 30000; n++) {
    state.fish = [...base, ...fish]
    const out = reforge.reforge(state, fish.map(f => f.uid), NOW, random)
    counts[out.child.speciesId] = (counts[out.child.speciesId] ?? 0) + 1
  }
  for (const sp of catalog.HIDDEN_SPECIES) assert.ok(Math.abs(counts[sp.id] / 30000 - .2/3) < .008, sp.id)
  for (const sp of catalog.poolForTier(5)) assert.ok(Math.abs(counts[sp.id] / 30000 - .8/3) < .012, sp.id)
})

import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const NOW = 1_800_000_000_000
const storage = new Map()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let server
let game
let balance
let save
let Rng
let species
let lighting
let shortcuts
let Scene
let benchmark
let shape
let decorations
let GpuTimer
let FishDeformation
let pwa
let drawCeremonyLight
let lcdElectricity
let withdrawal

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
  benchmark = await server.ssrLoadModule('/src/lab/benchmark.ts')
  pwa = await server.ssrLoadModule('/src/pwa.ts')
  ;({ drawCeremonyLight } = await server.ssrLoadModule('/src/render/ceremony.ts'))
  ;({ lcdElectricity } = await server.ssrLoadModule('/src/render/lcd-electricity.ts'))
  withdrawal = await server.ssrLoadModule('/src/render/withdrawal.ts')
  ;({ FishDeformation } = await server.ssrLoadModule('/src/lab/fish-motion.ts'))
  shape = await server.ssrLoadModule('/src/render/shape.ts')
  ;({ GpuTimer } = await server.ssrLoadModule('/src/lab/gpu-timer.ts'))
  game = await server.ssrLoadModule('/src/core/game.ts')
  balance = await server.ssrLoadModule('/src/core/balance.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
  lighting = await server.ssrLoadModule('/src/core/lighting.ts')
  shortcuts = await server.ssrLoadModule('/src/ui/shortcuts.ts')
  ;({ Scene } = await server.ssrLoadModule('/src/render/scene.ts'))
  ;({ Rng } = await server.ssrLoadModule('/src/core/rng.ts'))
  ;({ SPECIES: species, DECORATIONS: decorations } = await server.ssrLoadModule('/src/core/species.ts'))
})

beforeEach(() => storage.clear())

function withdrawalScene() {
  const state = game.newGame(NOW, 'zh')
  const scene = new Scene()
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  return { state, scene, actor: scene.view(960, 240, 0).agents[0] }
}

test('backpack return frees its slot and saves immediately while the visual retreats once', () => {
  const { state, scene, actor } = withdrawalScene()
  actor.x = 300; actor.y = 100; actor.dir = 1
  const original = JSON.stringify(state.fish), phase = actor.phase
  assert.equal(game.toggleTankFish(state, actor.fish.uid), 'removed')
  assert.equal(scene.withdrawFish(actor.fish.uid), true)
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  assert.equal(game.tankFish(state).length, 2)
  assert.equal(scene.view(960, 240, 0).agents.length, 3)
  save.save(state)
  const loaded = save.load(NOW)
  assert.equal(game.tankFish(loaded).length, 2)
  assert.equal(JSON.stringify(state.fish), original, 'animation never edits fish, EXP or uses')
  scene.update(0.2, 960, 240, 0.2)
  assert.ok(actor.x > 300 && actor.x < 300 + actor.withdrawal.distance)
  assert.ok(actor.y < 100 && actor.phase > phase)
  assert.ok(withdrawal.withdrawalOpacity(actor.withdrawal) < 1)
  assert.ok(withdrawal.withdrawalScale(actor.withdrawal) < 1)
  assert.equal(scene.withdrawFish(actor.fish.uid), false, 'repeated requests do not restart the timer')
  scene.update(0.36, 960, 240, 0.56)
  assert.equal(scene.view(960, 240, 0.56).agents.length, 2)
})

test('rapid re-placement cancels withdrawal and reuses one scene actor', () => {
  const { state, scene, actor } = withdrawalScene()
  for (let i = 0; i < 12; i++) {
    game.toggleTankFish(state, actor.fish.uid)
    scene.withdrawFish(actor.fish.uid)
    scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
    scene.update(0.08, 960, 240, i)
    game.toggleTankFish(state, actor.fish.uid)
    scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
    const matches = scene.view(960, 240, i).agents.filter(a => a.fish.uid === actor.fish.uid)
    assert.equal(matches.length, 1)
    assert.equal(matches[0], actor)
    assert.equal(actor.withdrawal, undefined)
    assert.equal(withdrawal.withdrawalOpacity(actor.withdrawal), 1)
    assert.equal(withdrawal.withdrawalScale(actor.withdrawal), 1)
  }
})

test('only explicit backpack returns linger; deletion and reset clear pending visuals', () => {
  const { state, scene, actor } = withdrawalScene()
  game.toggleTankFish(state, actor.fish.uid)
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  assert.equal(scene.view(960, 240, 0).agents.length, 2, 'no inferred animation for other removal paths')
  const next = scene.view(960, 240, 0).agents[0]
  game.toggleTankFish(state, next.fish.uid)
  scene.withdrawFish(next.fish.uid)
  state.fish = state.fish.filter(f => f.uid !== next.fish.uid)
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  assert.equal(scene.view(960, 240, 0).agents.length, 1)
  const last = scene.view(960, 240, 0).agents[0]
  game.toggleTankFish(state, last.fish.uid)
  scene.withdrawFish(last.fish.uid)
  const fresh = game.newGame(NOW + 100, 'zh')
  scene.sync(fresh, id => species.find(s => s.id === id), 960, 240, NOW + 100)
  assert.equal(scene.view(960, 240, 0).agents.length, 3)
  assert.ok(scene.view(960, 240, 0).agents.every(a => !a.withdrawal))
})

test('withdrawing fish cannot eat, be startled, discharge or count as an eel companion', () => {
  const state = game.newGame(NOW, 'zh'), scene = new Scene()
  const eel = game.makeFish('ambereel', 2, 1, NOW, { adult: true })
  state.fish = [eel, state.fish[0]]
  state.tankUids = state.fish.map(f => f.uid)
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  const [live, ghost] = scene.view(960, 240, 0).agents
  live.x = 600; live.y = 100; live.zapCooldown = 0
  ghost.x = 200; ghost.y = 100
  game.toggleTankFish(state, ghost.fish.uid)
  scene.withdrawFish(ghost.fish.uid)
  scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
  assert.equal(scene.hitFish(200, 100), null)
  assert.equal(scene.scareFish(ghost.fish.uid, 200, 100, 960, 240), false)
  const random = Math.random
  let zaps = 0, meals = 0
  try {
    Math.random = () => 0
    scene.update(0.03, 960, 240, 0, undefined, () => zaps++)
    assert.equal(zaps, 0, 'a visual ghost is not a second fish for spontaneous discharge')
    for (let i = 0; i < 6; i++) scene.scareFish(eel.uid, 600, 100, 960, 240, NOW + i)
    assert.equal(ghost.shockedTimer, 0, 'ghosts are not discharge targets')
    game.toggleTankFish(state, eel.uid)
    scene.withdrawFish(eel.uid)
    scene.spawnFood(live.x, live.y, 960, 240)
    scene.update(0.03, 960, 240, 0.03, () => meals++, () => zaps++)
    assert.equal(scene.scareFish(eel.uid, live.x, live.y, 960, 240), false)
    assert.equal(meals, 0)
    assert.equal(zaps, 0)
    assert.equal(scene.view(960, 240, 0).foods.length, 1)
  } finally { Math.random = random }
})

test('all fish forms retreat a bounded local distance and reduced motion only fades', () => {
  for (const sp of species) for (const reduced of [false, true]) {
    const state = game.newGame(NOW, 'zh'), scene = new Scene()
    const fish = game.makeFish(sp.id, sp.tier, 1, NOW, { adult: true })
    state.fish = [fish]; state.tankUids = [fish.uid]
    scene.sync(state, id => species.find(s => s.id === id), 5000, 1800, NOW)
    const actor = scene.view(5000, 1800, 0).agents[0]
    actor.x = 2000; actor.y = 800; actor.dir = -1
    game.toggleTankFish(state, fish.uid); scene.withdrawFish(fish.uid, reduced)
    const duration = actor.withdrawal.duration
    scene.update(duration * 0.5, 5000, 1800, 0)
    if (reduced) {
      assert.deepEqual([actor.x, actor.y], [2000, 800])
      assert.equal(duration, 0.12)
      assert.equal(withdrawal.withdrawalScale(actor.withdrawal), 1)
    } else {
      assert.ok(actor.x < 2000 && actor.x >= 2000 - sp.body.length * 4.2)
      assert.equal(duration, 0.55)
    }
    scene.update(duration, 5000, 1800, 1)
    assert.equal(scene.view(5000, 1800, 1).agents.length, 0)
  }
})

test('enabling reduced motion during withdrawal freezes travel and shortens the remaining effect', () => {
  const { state, scene, actor } = withdrawalScene()
  game.toggleTankFish(state, actor.fish.uid); scene.withdrawFish(actor.fish.uid)
  scene.update(0.15, 960, 240, 0)
  const pos = [actor.x, actor.y], alpha = withdrawal.withdrawalOpacity(actor.withdrawal)
  scene.update(0.03, 960, 240, 0.1, undefined, undefined, true, true)
  assert.deepEqual([actor.x, actor.y], pos)
  assert.ok(withdrawal.withdrawalOpacity(actor.withdrawal) < alpha)
  scene.update(0.1, 960, 240, 0.2, undefined, undefined, true, true)
  assert.equal(scene.view(960, 240, 0.2).agents.length, 2)
})

test('LCD withdrawal removes whole cells monotonically, including negative grid coordinates', () => {
  for (const cell of [2, 4, 6]) {
    let previous = null
    for (let step = 16; step >= 0; step--) {
      const dots = []
      let clips = 0
      withdrawal.clipLcdWithdrawal({ beginPath() {}, rect: (...r) => dots.push(r), clip: () => clips++ }, 79, 67, cell, step / 16)
      const keys = new Set(dots.map(([x, y, w, h]) => {
        assert.equal(Math.abs(x % cell), 0); assert.equal(Math.abs(y % cell), 0)
        assert.equal(w, cell); assert.equal(h, cell)
        return x + ':' + y
      }))
      assert.equal(clips, 1)
      if (previous) assert.ok([...keys].every(k => previous.has(k)), 'cells cannot reappear as visibility falls')
      previous = keys
      if (step === 0) assert.equal(keys.size, 0)
    }
  }
})

test('LCD electricity stays on the cell grid at every phase and freezes with reduced motion', () => {
  for (const sp of species) for (const cell of [2, 4, 6]) {
    for (const time of [0, 0.05, 0.12, 0.5, 1.1]) {
      const frame = lcdElectricity(127.8, 91.4, sp.body.length * 4.2, sp.body.depth, time, cell)
      assert.equal(frame.x % cell, 0)
      assert.equal(frame.y % cell, 0)
      assert.equal(frame.dots.length, 4)
      for (const dot of frame.dots) {
        assert.equal(dot.x % cell, 0)
        assert.equal(dot.y % cell, 0)
        assert.equal(dot.size, cell - 1)
      }
    }
    assert.deepEqual(
      lcdElectricity(127.8, 91.4, 70, sp.body.depth, 0, cell, true),
      lcdElectricity(127.8, 91.4, 70, sp.body.depth, 19, cell, true),
    )
  }
  assert.notDeepEqual(lcdElectricity(100, 100, 60, 0.3, 0, 4), lcdElectricity(100, 100, 60, 0.3, 0.05, 4), 'normal electricity still flickers and trembles')
})

test('LCD interface and scene palettes remain monochrome in both day and night modes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/themes/lcd/manifest.json', import.meta.url), 'utf8'))
  for (const palette of [manifest.palette, manifest.lightPalette, manifest.scene, manifest.lightScene]) {
    for (const [name, value] of Object.entries(palette)) {
      const hex = value.match(/^#([0-9a-f]{6})$/i)
      const rgba = value.match(/^rgba?\(([0-9]+),\s*([0-9]+),\s*([0-9]+)/)
      if (!hex && !rgba) continue
      const [r, g, b] = hex ? [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16)) : rgba.slice(1).map(Number)
      assert.ok(g >= r && r >= b, `${name}: ${value} must stay within the green LCD palette`)
    }
  }
})

test('the new uncommon eel joins the uniform species pool without moving existing fish', () => {
  const pool = species.filter(s => s.tier === 2)
  assert.equal(pool.length, 7)
  assert.equal(species.length, 29)
  assert.equal(species.find(s => s.id === 'ambereel').electric, true)
  assert.equal(species.find(s => s.id === 'volteel').tier, 3)
  assert.equal(species.find(s => s.id === 'volteel').electric, true)
  assert.equal(species.find(s => s.id === 'auroraeel').electric, undefined)
  const state = game.newGame(NOW, 'zh')
  state.fish.push(game.makeFish('volteel', 3, 4, NOW, { adult: true }))
  state.fish.push(game.makeFish('ambereel', 2, 2, NOW, { adult: true }))
  state.discovered.push('volteel', 'ambereel')
  save.save(state)
  const loaded = save.load(NOW)
  assert.deepEqual(loaded.fish, state.fish)
  assert.ok(loaded.discovered.includes('ambereel'))
})

for (const id of ['ambereel', 'volteel', 'auroraeel']) {
  test(`${id} follows the shared electric capability for manual and random discharge`, () => {
    const state = game.newGame(NOW, 'zh')
    const sp = species.find(s => s.id === id)
    const eel = game.makeFish(id, sp.tier, 1, NOW, { adult: true })
    state.fish = [eel, state.fish[0]]
    state.tankUids = state.fish.map(f => f.uid)
    const scene = new Scene()
    scene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
    for (let i = 0; i < 5; i++) assert.equal(scene.scareFish(eel.uid, 300, 100, 960, 240, NOW + i * 100), 'scared')
    assert.equal(scene.scareFish(eel.uid, 300, 100, 960, 240, NOW + 500), sp.electric ? 'zapped' : 'scared')
    let view = scene.view(960, 240, 0)
    assert.equal((view.agents[0].dischargingTimer ?? 0) > 0, Boolean(sp.electric))
    assert.equal((view.agents[1].shockedTimer ?? 0) > 0, Boolean(sp.electric))
    const randomScene = new Scene()
    randomScene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
    randomScene.view(960, 240, 0).agents.forEach(a => { a.zapCooldown = 0 })
    const originalRandom = Math.random
    let zaps = 0
    try {
      Math.random = () => 0
      randomScene.update(0.1, 960, 240, 0, undefined, () => zaps++, false)
      assert.deepEqual(randomScene.view(960, 240, 0).lampColors, [1, 4, 1], 'daytime discharge does not change lamps')
      const nightScene = new Scene()
      nightScene.sync(state, id => species.find(s => s.id === id), 960, 240, NOW)
      nightScene.view(960, 240, 0).agents.forEach(a => { a.zapCooldown = 0 })
      nightScene.update(0.1, 960, 240, 0, undefined, undefined, true)
      assert.deepEqual(nightScene.view(960, 240, 0).lampColors, sp.electric ? [2, 4, 1] : [1, 4, 1], 'only electric eels change a lamp at night')
    } finally { Math.random = originalRandom }
    view = randomScene.view(960, 240, 0)
    assert.equal(zaps, sp.electric ? 1 : 0)
    assert.equal((view.agents[0].dischargingTimer ?? 0) > 0, Boolean(sp.electric))
  })
}

function keyEvent(key, extra = {}) {
  return { key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
    repeat: false, isComposing: false, defaultPrevented: false, ...extra }
}

test('shortcuts map tabs, aliases and context actions without duplicate keys', () => {
  const used = new Set()
  assert.deepEqual(shortcuts.SHORTCUTS.slice(0, 6).map(s => s.action),
    ['tab-tank', 'tab-breed', 'tab-merge', 'tab-decor', 'tab-book', 'tab-settings'])
  for (const { action, keys } of shortcuts.SHORTCUTS) {
    for (const key of keys) {
      assert.ok(!used.has(key), `duplicate key: ${key}`)
      used.add(key)
      assert.equal(shortcuts.shortcutForKey(keyEvent(key)), action)
    }
  }
  assert.equal(shortcuts.shortcutForKey(keyEvent('r')), 'run')
  assert.equal(shortcuts.shortcutForKey(keyEvent('R')), 'run')
  assert.equal(shortcuts.shortcutForKey(keyEvent('Enter')), 'run')
  assert.equal(shortcuts.shortcutForKey(keyEvent('F')), 'immersive')
  assert.equal(shortcuts.shortcutForKey(keyEvent('?', { shiftKey: true })), 'help')
  for (const key of ['Tab', ' ', 'Backspace', 'Delete', 'z']) {
    assert.equal(shortcuts.shortcutForKey(keyEvent(key)), undefined)
  }
})

test('shortcuts ignore browser modifiers, held keys and IME composition', () => {
  for (const { keys } of shortcuts.SHORTCUTS) {
    for (const key of keys) {
      for (const guard of ['ctrlKey', 'metaKey', 'altKey', 'repeat', 'isComposing', 'defaultPrevented']) {
        assert.equal(shortcuts.shortcutForKey(keyEvent(key, { [guard]: true })), undefined)
      }
      assert.equal(shortcuts.shortcutForKey(keyEvent(key, { keyCode: 229 })), undefined)
      if (key !== '?') assert.equal(shortcuts.shortcutForKey(keyEvent(key, { shiftKey: true })), undefined)
    }
  }
})

test('README lists every supported shortcut key', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  for (const { action } of shortcuts.SHORTCUTS) {
    for (const label of shortcuts.shortcutLabels(action)) {
      assert.ok(readme.includes(`\`${label}\``), `README missing ${label}`)
    }
  }
})

test('legacy and malformed rail light settings keep the existing game progress', () => {
  for (const [input, expected] of [
    [undefined, { animated: true, frequency: 0.5 }],
    [null, { animated: true, frequency: 0.5 }],
    ['invalid', { animated: true, frequency: 0.5 }],
    [{ animated: false, frequency: -1 }, { animated: false, frequency: 0.2 }],
    [{ animated: 'yes', frequency: 9 }, { animated: true, frequency: 2 }],
    [{ frequency: 'fast' }, { animated: true, frequency: 0.5 }],
  ]) {
    const state = game.newGame(NOW, 'zh')
    state.exp = 60
    state.level = 3
    state.railLights = input
    save.save(state)
    const loaded = save.load(NOW)
    assert.deepEqual(loaded.railLights, expected)
    assert.deepEqual(loaded.fish, state.fish)
    assert.deepEqual(loaded.discoveredVariants, state.discoveredVariants)
    assert.equal(loaded.exp, 60)
    assert.equal(loaded.level, 3)
  }
  assert.equal(lighting.syncRailLightConfig({ frequency: NaN }).frequency, 0.5)
  assert.equal(lighting.syncRailLightConfig({ frequency: Infinity }).frequency, 0.5)
})

test('rail light toggle and frequency survive save and reload independently', () => {
  const state = game.newGame(NOW, 'zh')
  assert.deepEqual(state.railLights, { animated: true, frequency: 0.5 })
  state.railLights = { animated: false, frequency: 1.4 }
  save.save(state)
  const loaded = save.load(NOW)
  assert.deepEqual(loaded.railLights, { animated: false, frequency: 1.4 })
  loaded.railLights.animated = true
  save.save(loaded)
  assert.deepEqual(save.load(NOW).railLights, { animated: true, frequency: 1.4 })
})

test('rail lights travel smoothly at the selected frequency and stay steady when motion is off', () => {
  const brightness = lighting.railBeadBrightness
  const config = { animated: true, frequency: 0.5 }
  assert.notEqual(brightness(0, 0, config), brightness(0, 2, config))
  assert.notEqual(brightness(0, 0, config), brightness(1, 0, config))
  for (let i = 0; i < 40; i++) {
    const time = i * 0.13
    const value = brightness(time, i, config)
    assert.ok(value >= 0.25 && value <= 1)
    assert.ok(Math.abs(value - brightness(time + 2, i, config)) < 1e-12)
    assert.ok(Math.abs(value - brightness(time / 4, i, { animated: true, frequency: 2 })) < 1e-12)
    assert.equal(brightness(time, i, { ...config, animated: false }), 1)
    assert.equal(brightness(time, i, config, true), 1)
  }
})

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

test('benchmark statistics reject invalid samples and use nearest-rank percentiles', () => {
  assert.equal(benchmark.statistics([NaN, Infinity, -1]), null)
  assert.deepEqual(benchmark.statistics([4, 1, 3, 2, NaN, -2]), { count: 4, mean: 2.5, p50: 2, p95: 4, max: 4 })
})

test('benchmark discards warmup, replays ABBA, and keeps GPU samples separate', () => {
  const session = new benchmark.Benchmark({ width: 500, height: 230, agents: [], decors: [], time: 80 }, 2, 3)
  const modes = []
  while (!session.finished) {
    modes.push(session.mode)
    session.record(session.warming ? 1000 : session.mode === 'canvas' ? 3 : 1, modes.length * 16, session.mode === 'pixi' ? [0.5] : [])
  }
  assert.deepEqual(session.passes.map(p => p.mode), ['canvas', 'pixi', 'pixi', 'canvas'])
  const [canvas, pixi] = session.results()
  assert.equal(canvas.cpu.count, 6)
  assert.equal(canvas.cpu.mean, 3)
  assert.equal(canvas.gpu, null)
  assert.equal(pixi.cpu.mean, 1)
  assert.equal(pixi.gpu.mean, 0.5)
  assert.equal(canvas.fps, 62.5)
})

test('fixed replay is deterministic, bounded and does not mutate live swimming or fish', () => {
  const base = { width: 500, height: 230, agents: [{ fish: { uid: 'one', grade: 2 }, species: species[0], x: 80, y: 100, scale: 1, speed: 30, dir: -1, phase: 1, scaredTimer: 5 }], decors: [], time: 80 }
  const before = structuredClone(base)
  const a = benchmark.replay(base, 150)
  assert.deepEqual(a, benchmark.replay(base, 150))
  assert.deepEqual(base, before)
  assert.ok(a.agents[0].x >= 36 && a.agents[0].x <= 464)
  assert.equal(a.agents[0].scaredTimer, 0)
  assert.equal(a.time, 2.5)
})

test('all 18 decorations can emit finite native commands without creating Path2D', () => {
  for (const item of decorations) {
    for (const time of [0, 0.7, 3.9]) {
      const paths = []
      const layers = shape.decorLayers(item.id, item.width, item.height, time, () => {
        const commands = []
        paths.push(commands)
        return Object.fromEntries(['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'ellipse', 'arc', 'rect'].map(method => [method, (...args) => { assert.ok(args.every(v => typeof v === 'boolean' || Number.isFinite(v)), `${item.id}: ${method}`); commands.push(method) }]))
      })
      assert.equal(paths.length, 3)
      assert.deepEqual(layers.map(layer => layer.role), ['secondary', 'primary', 'detail'])
      assert.ok(paths.flat().length > 5, item.id)
    }
  }
})

test('LCD breeding and merging light stays on the themed opaque dot grid', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/themes/lcd/manifest.json', import.meta.url), 'utf8'))
  for (const night of [false, true]) for (const kind of ['breed', 'merge']) for (const p of [0, 0.4, 0.79, 0.95, 1]) {
    const rects = [], styles = []
    let saves = 0, restores = 0
    const ctx = {
      save: () => saves++, restore: () => restores++,
      set fillStyle(value) { styles.push(value) },
      fillRect: (...r) => rects.push(r),
      createRadialGradient: () => assert.fail('LCD must not use a soft gradient'),
      arc: () => assert.fail('LCD must not use smooth circles'),
    }
    drawCeremonyLight(ctx, manifest, night, kind, p, 384, 208)
    assert.equal(saves, 1); assert.equal(restores, 1)
    assert.deepEqual(styles, [(night ? manifest.scene : manifest.lightScene).ink])
    assert.ok(rects.length > 0)
    for (const [x, y, w, h] of rects) {
      assert.equal(x % manifest.cell, 0); assert.equal(y % manifest.cell, 0)
      assert.equal(w, manifest.cell - 1); assert.equal(h, manifest.cell - 1)
      assert.ok(x >= manifest.cell && x + w <= 384 - manifest.cell)
      assert.ok(y >= manifest.cell && y + h <= 208 - manifest.cell)
    }
  }
})

test('realistic ceremonies keep their pink or blue soft core and white reveal', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/themes/realistic/manifest.json', import.meta.url), 'utf8'))
  for (const kind of ['breed', 'merge']) {
    const stops = [], fills = [], rects = []
    const gradient = { addColorStop: (...s) => stops.push(s) }
    const ctx = { save() {}, restore() {}, beginPath() {}, arc() {}, fill() {}, createRadialGradient: () => gradient,
      set fillStyle(v) { fills.push(v) }, fillRect: (...r) => rects.push(r) }
    drawCeremonyLight(ctx, manifest, true, kind, 1, 384, 208)
    assert.equal(stops.length, 3)
    assert.ok(stops[1][1].includes(kind === 'breed' ? '244, 114, 182' : '56, 189, 248'))
    assert.equal(fills[0], gradient)
    assert.ok(fills[1].startsWith('rgba(255, 255, 255,'))
    assert.deepEqual(rects, [[0, 0, 384, 208]])
  }
})

test('offline navigation falls back to canonical home instead of redirected index HTML', async () => {
  const handlers = new Map()
  const home = { url: 'https://fishtank.phpz.org/', redirected: false }
  const redirectedIndex = { ...home, redirected: true }
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  runInNewContext(source, {
    self: { location: { origin: 'https://fishtank.phpz.org' }, addEventListener: (name, fn) => handlers.set(name, fn) },
    URL,
    fetch: () => Promise.reject(new Error('offline')),
    caches: { match: async key => key === '/' ? home : key === '/index.html' || key?.url?.endsWith('/index.html') ? redirectedIndex : undefined },
  })
  for (const path of ['/?renderer=canvas', '/index.html']) {
    let response
    handlers.get('fetch')({
      request: { method: 'GET', mode: 'navigate', url: `https://fishtank.phpz.org${path}` },
      respondWith: promise => { response = promise },
    })
    assert.equal(await response, home)
  }
})

test('offline registration works before and after load, including slow GPU startup', async () => {
  const names = ['navigator', 'window', 'document']
  const originals = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name))
  try {
    for (const readyState of ['loading', 'interactive', 'complete']) {
      for (const protocol of ['https:', 'http:']) {
        for (const supported of [true, false]) {
          const calls = [], listeners = []
          Object.defineProperty(globalThis, 'navigator', { configurable: true, value: supported ? { serviceWorker: { register: url => { calls.push(url); return Promise.reject(new Error('restricted')) } } } : {} })
          Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { protocol }, addEventListener: (...args) => listeners.push(args) } })
          Object.defineProperty(globalThis, 'document', { configurable: true, value: { readyState } })
          pwa.registerOfflineCache()
          if (!supported || protocol !== 'https:') {
            assert.deepEqual(calls, [])
            assert.deepEqual(listeners, [])
          } else if (readyState === 'complete') {
            assert.deepEqual(calls, ['/sw.js'], 'register even when asynchronous startup missed load')
            assert.deepEqual(listeners, [])
          } else {
            assert.deepEqual(calls, [])
            assert.equal(listeners.length, 1)
            assert.equal(listeners[0][0], 'load')
            assert.deepEqual(listeners[0][2], { once: true })
            listeners[0][1]()
            assert.deepEqual(calls, ['/sw.js'])
          }
          await Promise.resolve() // Rejected registration is handled without blocking gameplay.
        }
      }
    }
  } finally {
    names.forEach((name, i) => originals[i] ? Object.defineProperty(globalThis, name, originals[i]) : delete globalThis[name])
  }
})

test('GPU timing reports unsupported browsers without inventing measurements', () => {
  const timer = new GpuTimer({})
  assert.equal(timer.supported, false)
  timer.reset(true)
  timer.begin()
  timer.end()
  assert.deepEqual(timer.samples(), [])
  timer.destroy()
})

test('column deformation preserves every fish form, phase and scared tempo', () => {
  const cols = 19, rows = 9
  for (const sp of species) {
    const length = sp.body.length * 4.2, pad = 18
    const width = Math.ceil(length + pad * 2), height = Math.ceil(Math.max(length * 1.65, 76) + pad * 2)
    const base = Float32Array.from({ length: cols * rows * 2 }, (_, i) => i % 2
      ? Math.floor(i / 2 / cols) / (rows - 1) * height - height / 2
      : Math.floor(i / 2) % cols / (cols - 1) * width - width / 2)
    const original = base.slice(), vertices = base.slice()
    const deformation = new FishDeformation(sp.body, length, width, height, pad, base, cols)
    for (const t of [0, 0.7, 1.6, 3.9]) for (const tempo of [4.5, 9]) {
      assert.equal(deformation.update(vertices, t, tempo, true), true)
      const form = sp.body.form ?? 'fish'
      const profile = shape.elongatedProfile(sp.body, length, t)
      const rest = shape.elongatedProfile(sp.body, length, 0)
      for (let i = 0; i < base.length; i += 2) {
        const x = base[i], y = base[i + 1]
        const u = Math.min(1, Math.max(0, (x + width / 2 - pad) / length))
        let dx = 0, dy = 0
        if (form === 'eel' || form === 'seasnake') dy = profile.center(u) - rest.center(u)
        else if (form === 'jellyfish') { dx = x / width * Math.sin(t * 2.2) * length * 0.08; dy = Math.max(0, y) * Math.sin(t * 2.2 - 0.8) * 0.08 }
        else if (form === 'ray' || form === 'turtle') dy = y * Math.sin(t * (form === 'ray' ? 2.6 : 2.8)) * 0.14 * Math.sin(u * Math.PI)
        else if (form === 'seahorse') dx = Math.max(0, y / height) * Math.sin(t * 3) * 3
        else dy = Math.sin(t * tempo - u * 2.1) * (1 - u) ** 2 * length * 0.065
        assert.ok(Math.abs(vertices[i] - (x + dx)) < 0.00002, `${sp.id} x @ ${t}`)
        assert.ok(Math.abs(vertices[i + 1] - (y + dy)) < 0.00002, `${sp.id} y @ ${t}`)
      }
    }
    assert.deepEqual(base, original, 'rest geometry stays immutable')
    assert.equal(deformation.update(vertices, 8, 9, false), true, 'freeze restores the resting pose once')
    assert.deepEqual(vertices, original)
    assert.equal(deformation.update(vertices, 9, 9, false), false, 'no repeated frozen mesh uploads')
    assert.equal(deformation.update(vertices, 10, 4.5, true), true, 'animation resumes')
  }
})

test('GPU timing reads ready queries asynchronously and drops disjoint results', () => {
  const queries = []
  let disjoint = false
  const gl = {
    QUERY_RESULT_AVAILABLE: 1, QUERY_RESULT: 2,
    getExtension: () => ({ TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 }),
    isContextLost: () => false,
    createQuery: () => { const q = { ready: false }; queries.push(q); return q },
    beginQuery: () => {}, endQuery: () => {}, deleteQuery: q => { q.deleted = true },
    getParameter: () => disjoint,
    getQueryParameter: (q, kind) => { if (kind === 1) return q.ready; assert.ok(q.ready); return 1_250_000 },
    finish: () => assert.fail('timing must not stall the GPU'),
  }
  const timer = new GpuTimer(gl)
  timer.reset(true)
  timer.begin(); timer.end()
  assert.deepEqual(timer.samples(), [])
  queries[0].ready = true
  timer.begin(); timer.end()
  assert.deepEqual(timer.samples(), [1.25])
  disjoint = true
  timer.begin()
  assert.deepEqual(timer.samples(), [])
  assert.ok(queries.every(q => q.deleted))
  timer.destroy()
})

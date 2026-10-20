import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const NOW = 1_800_000_000_000
const PRIMARY_KEY = 'fishtank.save.v1'
const RECENT_KEY = 'fishtank.backup.recent.v1'
const PRE_RESTORE_KEY = 'fishtank.backup.pre-restore.v1'
const storage = new Map()
const calls = { get: 0, set: 0, remove: 0 }
let failSetKey = null
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let server
let game
let save

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        calls.get += 1
        return storage.get(key) ?? null
      },
      setItem(key, value) {
        calls.set += 1
        if (key === failSetKey) throw new Error('storage unavailable')
        storage.set(key, String(value))
      },
      removeItem(key) {
        calls.remove += 1
        storage.delete(key)
      },
    },
  })
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null },
  })
  game = await server.ssrLoadModule('/src/core/game.ts')
  save = await server.ssrLoadModule('/src/core/save.ts')
})

after(async () => {
  await server?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

beforeEach(() => {
  storage.clear()
  calls.get = 0
  calls.set = 0
  calls.remove = 0
  failSetKey = null
})

function stateAt(now = NOW) {
  return game.newGame(now, 'en')
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function expectCode(action, code) {
  assert.throws(action, (error) => error?.name === 'SaveDataError' && error.code === code)
}

test('exports a versioned envelope and round-trips inventory and collection preferences', () => {
  const state = stateAt()
  state.fish[0].nickname = 'Captain'
  state.fish[0].favorite = true
  state.fish[0].locked = true
  state.collectionTarget = { speciesId: 'goldfin', grade: 1 }
  state.breedGoal = 'target'

  const text = save.exportSave(state, NOW)
  const envelope = JSON.parse(text)
  assert.equal(envelope.format, 'fishtank-backup')
  assert.equal(envelope.version, 1)
  assert.equal(envelope.exportedAt, new Date(NOW).toISOString())

  const parsed = save.parseSaveImport(text, NOW)
  assert.equal(parsed.exportedAt, new Date(NOW).toISOString())
  assert.deepEqual(parsed.state.fish, state.fish)
  assert.deepEqual(parsed.state.collectionTarget, state.collectionTarget)
  assert.equal(parsed.state.breedGoal, 'target')
})

test('accepts a legacy raw GameState and applies offline progress exactly once', () => {
  const state = stateAt()
  state.hearts = 4
  state.nextHeartAt = NOW + 1_000
  const fry = game.makeFish('copperband', 1, 1, NOW, { uses: 2 })
  fry.maturesAt = NOW + 1_000
  state.fish.push(fry)
  const initialExp = state.exp

  const parsed = save.parseSaveImport(JSON.stringify(state), NOW + 1_001)
  assert.equal(parsed.exportedAt, null)
  assert.equal(parsed.state.hearts, 5)
  assert.equal(parsed.state.fish.find((fish) => fish.uid === fry.uid).maturesAt, null)
  assert.equal(parsed.state.exp, initialExp + 10)
  assert.equal(parsed.state.lastTick, NOW + 1_001)
})

test('normalizes imported collection metadata without discarding valid values', () => {
  const state = stateAt()
  state.fish[0].nickname = '  Red   Captain  '
  state.fish[0].favorite = true
  state.fish[0].locked = true
  delete state.collectionTarget
  delete state.breedGoal

  const parsed = save.parseSaveImport(JSON.stringify(state), NOW)
  assert.equal(parsed.state.fish[0].nickname, 'Red Captain')
  assert.equal(parsed.state.fish[0].favorite, true)
  assert.equal(parsed.state.fish[0].locked, true)
  assert.equal(parsed.state.collectionTarget, undefined)
  assert.equal(parsed.state.breedGoal, undefined)
})

test('rejects invalid protected metadata instead of silently clearing it', () => {
  for (const mutate of [
    (state) => { state.fish[0].nickname = 7 },
    (state) => { state.fish[0].favorite = 'yes' },
    (state) => { state.fish[0].locked = 1 },
    (state) => { state.collectionTarget = { speciesId: 'missing-fish' } },
    (state) => { state.collectionTarget = { speciesId: 'goldfin', grade: 9 } },
    (state) => { state.breedGoal = 'missing-goal' },
  ]) {
    const state = stateAt()
    mutate(state)
    expectCode(() => save.parseSaveImport(JSON.stringify(state), NOW), 'invalid-state')
  }
})

test('round-trip preserves an explicitly empty tank and valid decoration layout', () => {
  const state = stateAt()
  state.tankUids = []
  state.placedDecor = [
    { id: 'kelp', x: 0.22, flip: -1 },
    { id: 'rocks', x: 0.71, flip: 1 },
  ]
  const parsed = save.parseSaveImport(save.exportSave(state, NOW), NOW)
  assert.deepEqual(parsed.state.tankUids, [])
  assert.deepEqual(parsed.state.placedDecor, state.placedDecor)
  assert.equal(save.saveImportedState(parsed.state, stateAt(), NOW), true)
  const reloaded = save.load(NOW)
  assert.deepEqual(reloaded.tankUids, [], 'reloading an imported empty tank keeps it empty')
  assert.deepEqual(reloaded.placedDecor, state.placedDecor)
  const legacy = stateAt()
  delete legacy.tankUids
  storage.set(PRIMARY_KEY, JSON.stringify(legacy))
  assert.deepEqual(save.load(NOW).tankUids, legacy.fish.slice(0, 3).map(fish => fish.uid))
})

test('parse rejects malformed, future, duplicate, mismatched, and out-of-bounds saves', () => {
  expectCode(() => save.parseSaveImport('{nope', NOW), 'invalid-json')

  const futureEnvelope = JSON.parse(save.exportSave(stateAt(), NOW))
  futureEnvelope.version = 2
  expectCode(() => save.parseSaveImport(JSON.stringify(futureEnvelope), NOW), 'unsupported-version')

  const futureState = stateAt()
  futureState.version = 2
  expectCode(() => save.parseSaveImport(JSON.stringify(futureState), NOW), 'unsupported-version')

  const duplicate = stateAt()
  duplicate.fish.push({ ...duplicate.fish[0] })
  expectCode(() => save.parseSaveImport(JSON.stringify(duplicate), NOW), 'duplicate-uid')

  const mismatched = stateAt()
  mismatched.fish[0].tier = 5
  expectCode(() => save.parseSaveImport(JSON.stringify(mismatched), NOW), 'invalid-state')

  const badStarterGrade = stateAt()
  badStarterGrade.fish[0].grade = 2
  expectCode(() => save.parseSaveImport(JSON.stringify(badStarterGrade), NOW), 'invalid-state')

  const tooManyInTank = stateAt()
  const extra = game.makeFish('copperband', 1, 1, NOW, { adult: true })
  tooManyInTank.fish.push(extra)
  tooManyInTank.tankUids.push(extra.uid)
  expectCode(() => save.parseSaveImport(JSON.stringify(tooManyInTank), NOW), 'invalid-state')

  const lockedDecor = stateAt()
  lockedDecor.placedDecor = [{ id: 'castle', x: 0.5, flip: 1 }]
  expectCode(() => save.parseSaveImport(JSON.stringify(lockedDecor), NOW), 'invalid-state')

  const outOfBoundsDecor = stateAt()
  outOfBoundsDecor.placedDecor[0].x = 1
  expectCode(() => save.parseSaveImport(JSON.stringify(outOfBoundsDecor), NOW), 'invalid-state')

  const badHearts = stateAt()
  badHearts.hearts = 6
  expectCode(() => save.parseSaveImport(JSON.stringify(badHearts), NOW), 'invalid-state')

  const badTime = stateAt()
  badTime.lastTick = -1
  expectCode(() => save.parseSaveImport(JSON.stringify(badTime), NOW), 'invalid-state')

  const impossibleBirthExp = stateAt()
  impossibleBirthExp.fish[0].birthExp = 999_999
  expectCode(() => save.parseSaveImport(JSON.stringify(impossibleBirthExp), NOW), 'invalid-state')

  expectCode(() => save.parseSaveImport(`{"padding":"${'x'.repeat(5 * 1024 * 1024)}"}`, NOW), 'too-large')
})

test('rejects inventories over the explicit 20,000-fish ceiling without truncation', () => {
  const state = stateAt()
  const template = state.fish[0]
  state.fish = Array.from({ length: 20_001 }, (_, index) => ({
    ...template,
    uid: `fish-${index}`,
  }))
  state.tankUids = []
  expectCode(() => save.parseSaveImport(JSON.stringify(state), NOW), 'too-many-fish')
})

test('parse never reads or writes localStorage', () => {
  const before = { ...calls }
  save.parseSaveImport(save.exportSave(stateAt(), NOW), NOW)
  assert.deepEqual(calls, before)
})

test('failed import replacement preserves the primary save and removes the partial snapshot', () => {
  const current = stateAt()
  current.exp = 11
  assert.equal(save.save(current, NOW), true)
  const original = storage.get(PRIMARY_KEY)
  const imported = stateAt(NOW + 1)
  imported.exp = 222

  failSetKey = PRIMARY_KEY
  assert.equal(save.saveImportedState(imported, current, NOW + 2), false)
  assert.equal(storage.get(PRIMARY_KEY), original)
  assert.equal(storage.has(PRE_RESTORE_KEY), false)
})

test('failed pre-restore snapshot never attempts to replace the primary save', () => {
  const current = stateAt()
  assert.equal(save.save(current, NOW), true)
  const original = storage.get(PRIMARY_KEY)
  const imported = stateAt(NOW + 1)

  failSetKey = PRE_RESTORE_KEY
  assert.equal(save.saveImportedState(imported, current, NOW + 2), false)
  assert.equal(storage.get(PRIMARY_KEY), original)
})

test('successful import keeps the complete current state as a restorable snapshot', () => {
  const current = stateAt()
  current.exp = 31
  current.fish[0].nickname = 'Before restore'
  current.fish[0].locked = true
  const imported = stateAt(NOW + 1)
  imported.exp = 777

  assert.equal(save.save(current, NOW), true)
  assert.equal(save.saveImportedState(imported, current, NOW + 2), true)
  assert.equal(save.load(NOW + 2).exp, 777)

  const backup = save.getSaveBackup(NOW + 2)
  assert.equal(backup.exportedAt, new Date(NOW + 2).toISOString())
  assert.equal(backup.state.exp, 31)
  assert.equal(backup.state.fish[0].nickname, 'Before restore')
  assert.equal(backup.state.fish[0].locked, true)
})

test('regular saves rotate one recent backup no more than once per five minutes', () => {
  const first = stateAt()
  first.exp = 1
  assert.equal(save.save(first, NOW), true)
  assert.equal(storage.has(RECENT_KEY), false)

  const second = clone(first)
  second.exp = 2
  assert.equal(save.save(second, NOW + 1), true)
  const initialBackup = storage.get(RECENT_KEY)
  assert.equal(JSON.parse(initialBackup).state.exp, 1)

  const third = clone(second)
  third.exp = 3
  assert.equal(save.save(third, NOW + 4 * 60_000), true)
  assert.equal(storage.get(RECENT_KEY), initialBackup)

  const fourth = clone(third)
  fourth.exp = 4
  assert.equal(save.save(fourth, NOW + 5 * 60_000 + 1), true)
  const rotated = JSON.parse(storage.get(RECENT_KEY))
  assert.equal(rotated.state.exp, 3)
  assert.equal(rotated.exportedAt, new Date(NOW + 5 * 60_000 + 1).toISOString())
})

test('regular save reports backup failure and preserves the previous primary', () => {
  const current = stateAt()
  current.exp = 12
  assert.equal(save.save(current, NOW), true)
  const original = storage.get(PRIMARY_KEY)

  const next = clone(current)
  next.exp = 13
  failSetKey = RECENT_KEY
  assert.equal(save.save(next, NOW + 1), false)
  assert.equal(storage.get(PRIMARY_KEY), original)
  assert.equal(storage.has(RECENT_KEY), false)
})

test('regular save rolls back a newly written backup when primary replacement fails', () => {
  const current = stateAt()
  current.exp = 21
  assert.equal(save.save(current, NOW), true)
  const original = storage.get(PRIMARY_KEY)

  const next = clone(current)
  next.exp = 22
  failSetKey = PRIMARY_KEY
  assert.equal(save.save(next, NOW + 1), false)
  assert.equal(storage.get(PRIMARY_KEY), original)
  assert.equal(storage.has(RECENT_KEY), false)
})

test('wipe clears the primary and both backup slots', () => {
  storage.set(PRIMARY_KEY, 'primary')
  storage.set(RECENT_KEY, 'recent')
  storage.set(PRE_RESTORE_KEY, 'pre-restore')
  save.wipe()
  assert.equal(storage.has(PRIMARY_KEY), false)
  assert.equal(storage.has(RECENT_KEY), false)
  assert.equal(storage.has(PRE_RESTORE_KEY), false)
})


test('pre-import snapshot stays addressable after a newer periodic backup is created', () => {
  const current = stateAt()
  current.exp = 31
  save.save(current, NOW)
  const imported = stateAt()
  imported.exp = 777
  assert.equal(save.saveImportedState(imported, current, NOW + 2), true)
  imported.exp = 778
  assert.equal(save.save(imported, NOW + 3), true)
  assert.equal(save.getSaveBackup(NOW + 3).state.exp, 777)
  assert.equal(save.getSaveBackup(NOW + 3, 'recent').state.exp, 777)
  assert.equal(save.getSaveBackup(NOW + 3, 'pre-restore').state.exp, 31)
})

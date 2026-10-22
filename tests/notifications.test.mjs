import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
let server, HeartReminder
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, hmr: false } })
  ;({ HeartReminder } = await server.ssrLoadModule('/src/notifications.ts'))
})
after(async () => server?.close())
function setup(overrides = {}) {
  const store = { value: null, permission: 'default', notifications: [], requests: 0 }
  let queue = Promise.resolve()
  const env = {
    supported: () => true, permission: () => store.permission,
    requestPermission: async () => { store.requests++; return store.permission = 'granted' },
    read: () => store.value, write: v => { store.value = v },
    notify: async locale => { store.notifications.push(locale) },
    exclusive: run => { const result = queue.then(run); queue = result.catch(() => {}); return result },
    ...overrides,
  }
  return { store, env, reminder: new HeartReminder(env) }
}
test('reminders are opt-in and permission is only requested by enable', async () => {
  const { reminder, store } = setup()
  await reminder.check(() => ({ hearts: 5 }))
  assert.equal(reminder.status(), 'disabled'); assert.equal(store.requests, 0)
  await reminder.enable(); assert.equal(store.requests, 1); assert.equal(reminder.status(), 'enabled')
})
test('full hearts notify once across ticks and reloads, then rearm after spending', async () => {
  const { reminder, store, env } = setup()
  await reminder.enable()
  let state = { hearts: 4, locale: 'en' }
  await reminder.check(() => state); assert.deepEqual(store.notifications, [])
  state.hearts = 5
  await Promise.all(Array.from({ length: 5 }, () => reminder.check(() => state)))
  const reloaded = new HeartReminder(env)
  await reloaded.check(() => state); assert.deepEqual(store.notifications, ['en'])
  state.hearts = 3; await reloaded.check(() => state)
  state.hearts = 5; await reloaded.check(() => state)
  assert.deepEqual(store.notifications, ['en', 'en'])
})
test('shared lock prevents duplicate reminders across tabs and checks latest state', async () => {
  const { reminder, store, env } = setup(); await reminder.enable()
  let state = { hearts: 5 }
  const second = new HeartReminder(env)
  await Promise.all([reminder.check(() => state), second.check(() => state)])
  assert.equal(store.notifications.length, 1)
  state.hearts = 4; await reminder.check(() => state)
  state.hearts = 5; const queued = second.check(() => state); state.hearts = 4; await queued
  assert.equal(store.notifications.length, 1)
})
test('disable and revoked permission suppress reminders without prompting', async () => {
  const { reminder, store } = setup(); await reminder.enable(); reminder.disable()
  await reminder.check(() => ({ hearts: 5 })); assert.equal(store.notifications.length, 0)
  await reminder.enable(); store.permission = 'denied'
  await reminder.check(() => ({ hearts: 5 })); assert.equal(reminder.status(), 'denied')
  assert.equal(store.notifications.length, 0); assert.equal(store.requests, 1)
})
test('denied, dismissed and unsupported permissions never enable reminders', async () => {
  for (const permission of ['denied', 'default']) {
    const { reminder, store } = setup({ requestPermission: async () => permission })
    await reminder.enable(); assert.notEqual(reminder.status(), 'enabled'); assert.equal(store.value, null)
  }
  const { reminder, store } = setup({ supported: () => false })
  await reminder.enable(); assert.equal(reminder.status(), 'unsupported'); assert.equal(store.requests, 0)
})
test('storage and delivery failures surface errors and do not spam retries', async () => {
  const broken = setup({ write: () => { throw Error('quota') } })
  await broken.reminder.enable(); assert.equal(broken.reminder.status(), 'error')
  let attempts = 0
  const { reminder, store } = setup({ notify: async () => { attempts++; throw Error('unavailable') } })
  await reminder.enable(); await reminder.check(() => ({ hearts: 5 }))
  await reminder.check(() => ({ hearts: 5 })); assert.equal(attempts, 1)
  assert.equal(reminder.status(), 'error'); assert.equal(JSON.parse(store.value).enabled, false)
})

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.length > 1 || (args.length === 1 && args[0] !== '--online')) {
  throw new Error('Usage: node scripts/verify-ui.mjs [--online] (always headless)')
}
const online = args[0] === '--online'
const session = `fishtank-headless-${process.pid}-${Date.now()}`
const artifacts = resolve(root, 'output/playwright')
const temporary = await mkdtemp(resolve(tmpdir(), 'fishtank-ui-'))
const execute = promisify(execFile)
let server
let opened = false

async function cli(label, ...commands) {
  let result
  try {
    result = await execute('npx', [
      '--no-install', '--package', '@playwright/cli', 'playwright-cli',
      `--session=${session}`, ...commands,
    ], {
      cwd: root,
      env: { ...process.env, PLAYWRIGHT_MCP_HEADLESS: 'true' },
      timeout: ['reforge.cjs', 'breed-recommendation.cjs'].includes(label) ? 300_000 : 180_000,
      maxBuffer: 4 * 1024 * 1024,
    })
  } catch (error) {
    await writeFile(resolve(artifacts, `headless-${label}.log`), `${error.stdout ?? ''}${error.stderr ?? ''}`)
    throw error
  }
  const { stdout, stderr } = result
  await writeFile(resolve(artifacts, `headless-${label}.log`), stdout + stderr)
  // The CLI can report browser/script errors while exiting with status 0.
  if (/^### Error\b/m.test(stdout + stderr)) throw new Error(stdout + stderr)
  return stdout
}

try {
  await mkdir(artifacts, { recursive: true })
  if (!online) {
    server = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: false } })
    await server.listen()
  }
  const baseUrl = server ? `http://127.0.0.1:${server.httpServer.address().port}/` : null
  // A fresh named session cannot reuse a previously headed browser or the user's PWA.
  opened = true
  await cli('open', 'open', 'about:blank', `--config=${resolve(root, '.playwright/cli.config.json')}`)
  const guard = resolve(temporary, 'assert-headless.cjs')
  await writeFile(guard, `async page => {
    const cdp = await page.context().browser().newBrowserCDPSession();
    try {
      const { arguments: args } = await cdp.send('Browser.getBrowserCommandLine');
      const flags = args.filter(arg => /^--headless(?:=|$)/.test(arg));
      if (!flags.length) throw Error('Refusing UI verification: browser is not headless');
      return { headless: true, flags, isolatedSession: ${JSON.stringify(session)} };
    } finally { await cdp.detach(); }
  }`)
  const evidence = await cli('browser-mode', 'run-code', `--filename=${guard}`)
  if (!/"headless"\s*:\s*true/.test(evidence)) throw new Error('Missing headless browser evidence')
  console.log('Browser verified: --headless, fresh isolated session.')

  const suites = online ? ['settings.cjs', 'reforge.cjs', 'notifications.cjs', 'shortcuts.cjs', 'detail-online.cjs', 'footer-online.cjs'] : ['breed-recommendation.cjs', 'card-hit-area.cjs', 'settings.cjs', 'reforge.cjs', 'notifications.cjs', 'shortcuts.cjs', 'decor-highlight.cjs', 'detail-layout.cjs', 'footer.cjs']
  const workerSource = await readFile(resolve(root, 'public/sw.js'), 'utf8')
  const cacheName = workerSource.match(/const CACHE_NAME = '([^']+)'/)?.[1]
  if (!cacheName) throw new Error('Cannot determine expected Service Worker cache')
  const version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version
  for (const suite of suites) {
    let source = await readFile(resolve(root, 'scripts/ui', suite), 'utf8')
    source = source.replaceAll('__FISHTANK_CACHE_NAME__', cacheName).replaceAll('__FISHTANK_VERSION__', version)
    const shortcutUrls = online
      ? ['https://fishtank.phpz.org/', 'https://fish.yahaha.net/'].flatMap(url => [url, `${url}?renderer=canvas`])
      : [baseUrl]
    source = source.replaceAll('__FISHTANK_SHORTCUT_URLS__', JSON.stringify(shortcutUrls))
    source = source.replaceAll('__FISHTANK_REFORGE_URLS__', JSON.stringify(online ? ['https://fishtank.phpz.org/', 'https://fish.yahaha.net/'] : [baseUrl]))
    source = source.replaceAll('__FISHTANK_REMINDER_URLS__', JSON.stringify(online ? ['https://fishtank.phpz.org/', 'https://fish.yahaha.net/'] : [baseUrl]))
    source = source.replaceAll('__FISHTANK_SETTINGS_URLS__', JSON.stringify(online ? ['https://fishtank.phpz.org/', 'https://fish.yahaha.net/'] : [baseUrl]))
    if (baseUrl) source = source.replaceAll('http://127.0.0.1:5173/', baseUrl)
    const filename = resolve(temporary, suite)
    await writeFile(filename, source)
    await cli(suite, 'run-code', `--filename=${filename}`)
    console.log(`PASS ${suite}`)
  }
} finally {
  try {
    if (opened) await cli('close', 'close')
  } finally {
    await server?.close()
    await rm(temporary, { recursive: true, force: true })
  }
}

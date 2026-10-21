# UI verification

Run from the repository root:

```sh
pnpm test:ui          # local shortcuts, decoration borders, detail/lock interactions and footer
pnpm test:ui:online   # both production domains, shortcuts, themes, renderers and offline reopen
```

Requires an existing Chrome installation and Playwright CLI available to
`npx --no-install --package @playwright/cli playwright-cli`. The runner does not
install dependencies or browsers. Local verification starts and stops its own
Vite server on an available port.

All suites use `.playwright/cli.config.json` with `headless: true`. The runner
creates a fresh isolated session, checks the browser's actual `--headless`
launch argument before testing, and closes that session even on failure.
It never attaches to the user's Chrome/PWA or an earlier CLI session.
Logs and screenshots go to ignored `output/playwright/`.

The `.cjs` files are Playwright CLI `run-code` function snippets, migrated from
the existing local verification artifacts. Run them through the shared runner
so browser-mode checks and cleanup apply. Older scripts under `output/` are
historical artifacts; the maintained suites live here.

There is deliberately no headed switch. If a task genuinely needs the user's
real Chrome app, explain the reason and intended operation before using it.

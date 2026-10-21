async page => {
  await page.goto('http://127.0.0.1:5173/')
  const results = await page.evaluate(async () => {
    const { PixiTank } = await import('/src/lab/pixi-tank.ts')
    const { RealisticRenderer } = await import('/src/render/realistic.ts')
    const { LcdRenderer } = await import('/src/render/lcd.ts')
    const { loadTheme } = await import('/src/render/theme.ts')
    const { decorItem } = await import('/src/core/species.ts')
    const tank = new PixiTank()
    const results = []
    const assert = (value, message) => { if (!value) throw Error(message) }
    await tank.init()
    try {
      for (const theme of ['realistic', 'lcd']) for (const night of [false, true]) for (const zoom of [1, 1.6]) {
        const manifest = await loadTheme(theme)
        const renderer = theme === 'lcd' ? new LcdRenderer(manifest) : new RealisticRenderer(manifest)
        const view = { width: 720, height: 230, agents: [], time: 1, night,
          decors: ['anchor', 'lanterns'].map((id, index) => ({ item: decorItem(id), x: index ? 490 : 250, flip: 1, active: true })) }
        tank.render(renderer, view, true, true, zoom)
        const overlay = tank.app.stage.children.find(node => node.label === 'decor-highlights')
        assert(overlay, 'Decoration highlights must have a separate overlay outside the water filter')
        assert(overlay.children.length === 2, 'Expected one border per decoration')
        for (let node = overlay; node; node = node.parent) {
          assert(!node.filters?.length, 'Water filter must never affect the selection overlay')
        }
        if (theme === 'realistic') assert(tank.app.stage.children.some(node => node.filters?.length), 'Water effect must remain enabled on the aquarium')
        const anchor = overlay.children[0], lantern = overlay.children[1]
        const before = { x: anchor.x, y: anchor.y, bounds: JSON.stringify(anchor.getBounds()) }
        view.time = 8
        tank.render(renderer, view, true, true, zoom)
        assert(JSON.stringify(anchor.getBounds()) === before.bounds, 'Border bounds changed with wave time')
        if (theme === 'realistic' && night && zoom === 1) {
          const preview = document.createElement('canvas')
          preview.id = 'decor-highlight-preview'
          preview.width = tank.app.canvas.width
          preview.height = tank.app.canvas.height
          preview.style.cssText = 'position:fixed;left:0;top:0;width:720px;height:230px;z-index:99999'
          preview.getContext('2d').drawImage(tank.app.canvas, 0, 0)
          document.body.append(preview)
        }
        view.decors[0].x += 80
        view.decors[0].flip = -1
        tank.render(renderer, view, true, true, zoom)
        const pitch = Math.max(2, manifest.cell ?? 4)
        const expected = theme === 'lcd' ? Math.round(330 / pitch) * pitch : 330
        assert(anchor.x === expected && anchor.y === before.y, 'Border did not follow dragging')
        assert(anchor.rotation === 0 && anchor.skew.x === 0 && anchor.skew.y === 0, 'Border must remain rectangular when flipped')
        assert(lantern.y < view.height - 14, 'Ceiling decoration border is not top mounted')
        view.decors[0].active = false
        tank.render(renderer, view, true, true, zoom)
        assert(!anchor.visible, 'Hover exit must hide border')
        view.decors = []
        tank.render(renderer, view, true, true, zoom)
        assert(!overlay.children.length, 'Removed decorations left orphan borders')
        results.push({ theme, night, zoom, stableBorder: true, dragAndFlip: true, cleanup: true })
      }
    } finally { tank.destroy() }
    return results
  })
  await page.locator('#decor-highlight-preview').screenshot({ path: 'output/playwright/decor-highlight-stable.jpg' })
  await page.locator('#decor-highlight-preview').evaluate(el => el.remove())
  return results
}

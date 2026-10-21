async (page) => {
  const fixture = {"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}}
  const results = []
  for (const host of ['fishtank.phpz.org','fish.yahaha.net']) for (const [theme, locale, width, renderer] of [['realistic', 'zh', 1100,'default'], ['realistic', 'en', 390,'canvas'], ['lcd', 'zh', 390,'default'], ['lcd', 'en', 1100,'canvas']]) {
    const context = await page.context().browser().newContext({ viewport: { width, height: 950 } })
    const tab = await context.newPage()
    await tab.emulateMedia({ reducedMotion: 'reduce' })
    const errors=[]; tab.on('pageerror',e=>errors.push(e.message));
    const s = structuredClone(fixture)
    s.theme = theme; s.locale = locale
    s.discoveredVariants.push('ambereel:4')
    await context.addInitScript(value => {
      if (!localStorage.getItem('layout-fixture')) {
        localStorage.setItem('fishtank.save.v1', JSON.stringify(value))
        localStorage.setItem('layout-fixture', '1')
      }
    }, s)
    await tab.goto(`https://${host}/${renderer==='canvas'?'?renderer=canvas':''}`, {waitUntil:'domcontentloaded'})
    await tab.getByText('Fishtank v1.8.1',{exact:false}).waitFor()
    await tab.locator(`nav button[title^="${locale === 'zh' ? '图鉴' : 'Book'}"]`).click()
    await tab.locator('[data-species="ambereel"] .item-card-main').click()
    const ordered = await tab.evaluate(() => !!(document.querySelector('.specimen-grid').compareDocumentPosition(document.querySelector('.book-selected-specimen')) & Node.DOCUMENT_POSITION_FOLLOWING))
    if (!ordered) throw Error('Specimens must precede selected fish actions')
    const detail = tab.locator('.book-detail')
    const layout = await detail.evaluate(el=>({width:innerWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,maxHeight:getComputedStyle(el).maxHeight}))
    await detail.screenshot({ path: `output/playwright/detail-online-${host}-${theme}-${locale}-${width}.jpg` })
    await tab.locator('.specimen-grid .item-card-main').nth(1).click()
    const selectedUid = await tab.locator('.book-selected-specimen [data-fish-lock]').getAttribute('data-fish-lock')
    await tab.locator('.book-appearance-section summary').click()
    await tab.locator('[data-variant-grade="4"] .item-card-main').click()
    if (await tab.locator('.book-selected-specimen [data-fish-lock]').getAttribute('data-fish-lock') !== selectedUid) throw Error('Appearance preview changed selected specimen')
    if (!await tab.locator('.book-appearance-section').getAttribute('open') && !await tab.locator('.book-appearance-section').evaluate(el => el.open)) throw Error('Appearance section collapsed during preview')
    await tab.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function(key, value) { if (key.startsWith('fishtank.')) throw new Error('Test storage failure'); return window.originalSetItem.call(this, key, value) }
    })
    await tab.locator('[data-lock-owned]').click()
    if (!(await tab.locator('[data-species="ambereel"]').innerText()).includes('1/3')) throw Error('Failed bulk save did not roll back')
    await tab.evaluate(() => { Storage.prototype.setItem = window.originalSetItem })
    await tab.locator('[data-lock-owned]').click()
    if (!(await tab.locator('[data-species="ambereel"]').innerText()).includes('3/3')) throw Error('Bulk lock failed')
    if (!(await tab.locator('[data-lock-owned]').isDisabled())) throw Error('Bulk action should be disabled when all locked')
    await tab.locator('.book-selected-specimen [data-fish-lock]').click()
    if (!(await tab.locator('[data-species="ambereel"]').innerText()).includes('2/3')) throw Error('Individual unlock failed')
    await tab.reload()
    await tab.locator(`nav button[title^="${locale === 'zh' ? '图鉴' : 'Book'}"]`).click()
    if (!(await tab.locator('[data-species="ambereel"]').innerText()).includes('2/3')) throw Error('Bulk protection did not persist')
    for(const w of [320,390,640,1100]) {
      await tab.setViewportSize({width:w,height:950});
      const metrics=await tab.locator('footer.app-footer').evaluate(el=>{const spans=el.querySelector('.footer-meta').children;const meta=el.querySelector('.footer-meta').getBoundingClientRect();const links=[...el.querySelectorAll('.footer-link')].map(x=>({border:getComputedStyle(x).borderTopWidth,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}));return {sameLine:Math.abs(spans[0].getBoundingClientRect().top-spans[2].getBoundingClientRect().top)<2,overlap:meta.right>el.querySelector('.footer-links').getBoundingClientRect().left+1,links}});
      if(w<=640&&(!metrics.sameLine||metrics.overlap||metrics.links.some(x=>x.border!=='0px'||x.width!==32||x.height!==28)))throw Error('Footer '+JSON.stringify(metrics));
      if(w===1100&&metrics.links.some(x=>x.border==='0px'))throw Error('Desktop footer border lost');
      if(w===390) await tab.locator('footer.app-footer').screenshot({path:`output/playwright/footer-online-${host}-${theme}-${locale}.jpg`});
    }
    await tab.waitForFunction(async()=> (await caches.keys()).includes('__FISHTANK_CACHE_NAME__'));
    await tab.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
    await tab.reload();await tab.getByText('Fishtank v1.8.1',{exact:false}).waitFor();
    await tab.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    await context.setOffline(true);await tab.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
    await tab.reload();await tab.getByText('Fishtank v1.8.1',{exact:false}).waitFor();
    await tab.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    await tab.locator(`nav button[title^="${locale === 'zh' ? '图鉴' : 'Book'}"]`).click();
    if(!(await tab.locator('[data-species="ambereel"]').innerText()).includes('2/3'))throw Error('Offline protection lost');
    if(errors.length)throw Error(JSON.stringify(errors));
    results.push({ host,renderer,layout,theme,locale,width,footerWidths:[320,390,640,1100],offline:true,pageErrors:errors,selectionFirst: true, independentPreview: true, bulkLockRollback: true, bulkLock: true, individualUnlock: true, persists: true })
    await context.close()
  }
  return results
}


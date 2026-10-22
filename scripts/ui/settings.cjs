async page => {
 const fixture={"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}};
 const results=[];
 for(const url of __FISHTANK_SETTINGS_URLS__) for(const theme of ['realistic','lcd']) for(const locale of ['zh','en']) for(const width of [320,390,820,1100]) {
  const ctx=await page.context().browser().newContext({viewport:{width,height:1000}});
  try {
   await ctx.addInitScript(({fixture,theme,locale})=>{
    if(!localStorage.getItem('settings-fixture')) {
     localStorage.setItem('fishtank.save.v1',JSON.stringify({...fixture,theme,locale,lastTick:Date.now()}));
     localStorage.setItem('settings-fixture','1');
    }
   },{fixture,theme,locale});
   const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));
   await tab.goto(`${url}?renderer=canvas`);
   await tab.locator('[data-shortcut="tab-settings"]').click();
   const layout=await tab.locator('.settings-grid').evaluate(grid=>{
    const cards=[...grid.querySelectorAll('.settings-card')];
    const overflow=cards.filter(el=>el.scrollWidth>el.clientWidth+1).length;
    const a=grid.children[0].getBoundingClientRect(),b=grid.children[1].getBoundingClientRect();
    return {overflow,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,aligned:Math.abs(a.top-b.top)<2};
   });
   if(layout.overflow||layout.columns!==(width<=720?1:2))throw Error(JSON.stringify({theme,locale,width,layout}));
   if(width>720&&!layout.aligned)throw Error('Desktop columns misaligned');
   if(await tab.locator('.settings-reset').count()!==1||await tab.locator('.save-tools .settings-reset').count()!==1)throw Error('Reset must stay with save tools');
   await tab.locator('.settings-grid').getByRole('button',{name:locale==='zh'?'黑夜':'Night',exact:true}).click();
   await tab.locator('#rail-light-frequency').fill('1.2');
   await tab.locator('#rail-light-frequency').dispatchEvent('change');
   await tab.reload();await tab.locator('[data-shortcut="tab-settings"]').click();
   if(await tab.locator('#rail-light-frequency').inputValue()!=='1.2')throw Error('Light setting did not persist');
   if(await tab.locator('.settings-grid').getByRole('button',{name:locale==='zh'?'黑夜':'Night',exact:true}).getAttribute('aria-pressed')!=='true')throw Error('Color mode did not persist');
   await tab.locator('.settings-reset').getByRole('button',{name:locale==='zh'?'重置存档进度':'Reset progress',exact:true}).click();
   await tab.locator('.settings-reset').getByRole('button',{name:locale==='zh'?'取消':'Cancel',exact:true}).click();
   if(await tab.evaluate(()=>JSON.parse(localStorage.getItem('fishtank.save.v1')).fish.length)!==fixture.fish.length)throw Error('Cancel changed save');
   await tab.locator('.settings-grid').evaluate(grid=>{grid.closest('section.panel').scrollTop=0});
   await tab.screenshot({path:`output/playwright/settings-${new URL(url).hostname}-${theme}-${locale}-${width}.png`});
   if(errors.length)throw Error(errors.join('\n'));
   results.push({url,theme,locale,width,passed:true});
  }finally{await ctx.close()}
 }
 return results;
}

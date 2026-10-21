async page => {
 const fixture={"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}};
 const results=[];
 for(const url of __FISHTANK_SHORTCUT_URLS__) for(const [theme,locale] of [['realistic','zh'],['realistic','en'],['lcd','zh'],['lcd','en']]) {
  const ctx=await page.context().browser().newContext({viewport:{width:locale==='en'?390:1100,height:950}});
  try {
   await ctx.addInitScript(s=>localStorage.setItem('fishtank.save.v1',JSON.stringify(s)),{...fixture,theme,locale});
   const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));await tab.emulateMedia({reducedMotion:'reduce'});
   await tab.goto(url);await tab.locator('[data-shortcut="tab-breed"]').click();
   const state=()=>tab.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fishtank.save.v1'));return {count:s.fish.length,hearts:s.hearts}});
   const assert=(ok,msg)=>{if(!ok)throw Error(`${theme}/${locale}: ${msg}`)};
   const count=fixture.fish.length;
   assert(await tab.locator('[data-shortcut="run"]').innerText()===(locale==='zh'?'开始繁育':'Breed'),'Breeding button includes extra copy');
   await tab.locator('[data-shortcut="tab-merge"]').click();
   assert(await tab.locator('[data-shortcut="run"]').innerText()===(locale==='zh'?'开始合成':'Merge'),'Merge button includes extra copy');
   assert(await tab.locator('[data-shortcut="autoPick"]').innerText()===(locale==='zh'?'自动选材':'Auto-select'),'Auto-select button includes conditions or counts');
   await tab.locator('[data-shortcut="tab-breed"]').click();
   await tab.keyboard.press('r');assert((await state()).count===count,'R ran without two parents');
   const picks=tab.locator('.item-card-main');await picks.nth(0).click();await picks.nth(1).click();
   assert(await tab.locator('.item-card-main[aria-pressed="true"]').count()===2,'Mouse did not select parents');
   await tab.keyboard.press('Enter');
   assert(await tab.locator('.item-card-main[aria-pressed="true"]').count()===1,'Native Enter on a fish card must toggle that card once');
   await picks.nth(1).click();
   for(const key of ['Control+r','Meta+r','Alt+r']) {
    // Synthetic modifier events avoid the browser reload shortcut itself.
    await tab.evaluate(key=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'r',ctrlKey:key==='Control+r',metaKey:key==='Meta+r',altKey:key==='Alt+r',bubbles:true})),key);
   }
   assert((await state()).count===count,'Modifier shortcut triggered breeding');
   await tab.keyboard.press('r');
   await tab.waitForFunction(n=>JSON.parse(localStorage.getItem('fishtank.save.v1')).fish.length===n,count+1,{timeout:3000});
   assert((await state()).hearts===4,'R did not consume exactly one heart');
   await tab.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'r',repeat:true,bubbles:true})));
   assert((await state()).count===count+1,'Held R repeated breeding');
   await tab.locator('[data-shortcut="collect"]').waitFor();
   assert(await tab.locator('[data-shortcut="collect"]').innerText()===(locale==='zh'?'收下小鱼':'Keep Fish'),'Collect button includes shortcut copy');
   await tab.keyboard.press('r');
   await tab.locator('[data-shortcut="collect"]').waitFor({state:'detached'});
   await tab.keyboard.press('r');assert((await state()).count===count+1,'Collect also triggered another breeding');
   await tab.locator('[data-shortcut="autoPick"]').click();await tab.keyboard.press('r');
   await tab.waitForFunction(n=>JSON.parse(localStorage.getItem('fishtank.save.v1')).fish.length===n,count+2,{timeout:3000});
   await tab.locator('[data-shortcut="collect"]').waitFor();await tab.keyboard.press('Enter');
   await tab.locator('[data-shortcut="collect"]').waitFor({state:'detached'});
   await tab.keyboard.press('a');
   await tab.keyboard.press('h');await tab.locator('#help-tab-shortcuts').click();
   for(const [id,key] of [['run','R'],['enter','Enter']]) {
    const row=tab.locator(`[data-shortcut-guide="${id}"]`);
    assert(await row.locator('kbd').count()===1 && await row.locator('kbd').innerText()===key,'R and Enter must have separate help rows');
   }
   await tab.locator('.shortcut-guide').screenshot({path:`output/playwright/shortcut-help-${new URL(url).hostname}-${theme}-${locale}.png`});
   assert(await tab.locator('[data-shortcut-guide="run"]').evaluate(row=>row.querySelector('kbd:last-child').getBoundingClientRect().right<=row.querySelector('dd').getBoundingClientRect().left),'Shortcut badges overlap description');
   await tab.keyboard.press('r');
   assert((await state()).count===count+2,'Help overlay allowed background breeding');await tab.keyboard.press('Escape');
   await tab.evaluate(()=>{const input=document.createElement('input');input.id='shortcut-test-input';document.body.append(input);input.focus()});
   await tab.keyboard.press('r');assert((await state()).count===count+2,'Input allowed background breeding');
   assert(await tab.locator('#shortcut-test-input').inputValue()==='r','R was swallowed while typing');
   await tab.locator('#shortcut-test-input').evaluate(el=>el.remove());
   for(const options of [{repeat:true},{isComposing:true},{keyCode:229}])await tab.evaluate(options=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'r',bubbles:true,...options})),options);
   assert((await state()).count===count+2,'Held key or IME started breeding');
   await tab.locator('[data-shortcut="clear"]').focus();await tab.keyboard.press('Enter');
   assert(await tab.locator('.item-card-main[aria-pressed="true"]').count()===0,'Native Enter on Clear was overridden');
   await tab.screenshot({path:`output/playwright/shortcuts-${new URL(url).hostname}-${url.includes('renderer=canvas')?'canvas':'default'}-${theme}-${locale}.png`});
   assert(!errors.length,JSON.stringify(errors));
   results.push({url,theme,locale,pageErrors:errors,mouseThenR:true,autoPickThenR:true,collectWithR:true,nativeEnter:true,guards:true,terseButtons:true,separateHelpRows:true});
  } finally {await ctx.close();}
 }
 return results;
}

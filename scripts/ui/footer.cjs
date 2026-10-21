async page => {
 const fixture={"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}};
 const results=[];
 for(const theme of ['realistic','lcd']) {
  const ctx=await page.context().browser().newContext();
  await ctx.addInitScript(s=>localStorage.setItem('fishtank.save.v1',JSON.stringify(s)),{...fixture,theme});
  const tab=await ctx.newPage();
  for(const width of [320,390,640,1100]) {
   await tab.setViewportSize({width,height:900});
   if(tab.url()==='about:blank')await tab.goto('http://127.0.0.1:5173/');
   await tab.locator('footer.app-footer').waitFor();
   const metrics=await tab.locator('footer.app-footer').evaluate(el=>{
    const spans=el.querySelector('.footer-meta').children;
    const meta=el.querySelector('.footer-meta').getBoundingClientRect();
    const links=[...el.querySelectorAll('.footer-link')].map(x=>({border:getComputedStyle(x).borderTopWidth,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}));
    return {sameLine:Math.abs(spans[0].getBoundingClientRect().top-spans[2].getBoundingClientRect().top)<2,overlap:meta.right>el.querySelector('.footer-links').getBoundingClientRect().left+1,links};
   });
   if(width<=640&&(!metrics.sameLine||metrics.overlap||metrics.links.some(x=>x.border!=='0px'||x.width!==32||x.height!==28)))throw Error(JSON.stringify({theme,width,metrics}));
   if(width===1100&&metrics.links.some(x=>x.border==='0px'))throw Error('Desktop border changed');
   if(width===390)await tab.locator('footer.app-footer').screenshot({path:`output/playwright/footer-${theme}-390.jpg`});
   results.push({theme,width,...metrics});
  }
  await ctx.close();
 }
 return results;
}

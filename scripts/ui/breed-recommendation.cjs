async page => {
 const results=[];
 for(const theme of ['realistic','lcd']) for(const locale of ['zh','en']) for(const width of [390,1100]) {
  const context=await page.context().browser().newContext({viewport:{width,height:1000}});
  try {
   await context.addInitScript(()=>{const fixture=sessionStorage.getItem('breed-recommendation-fixture');if(fixture)localStorage.setItem('fishtank.save.v1',fixture)});
   const tab=await context.newPage(),errors=[];tab.on('pageerror',e=>errors.push(e.message));
   await tab.goto('http://127.0.0.1:5173/?renderer=canvas');
   for(const scenario of ['species','variants','variants-fallback','unreachable','complete','unavailable']) {
    await tab.evaluate(async ({theme,locale,scenario})=>{
     const {newGame,makeFish}=await import('/src/core/game.ts');const {REGULAR_SPECIES}=await import('/src/core/species.ts');
     const now=Date.now(),state=newGame(now,locale);state.theme=theme;state.colorMode='dark';
     state.discovered=REGULAR_SPECIES.map(s=>s.id);
     state.discoveredVariants=REGULAR_SPECIES.flatMap(s=>Array.from({length:s.tier?5:1},(_,g)=>`${s.id}:${g+1}`));
     const fish=(id,tier,grade,uid,extra={})=>({...makeFish(id,tier,grade,now,{adult:true}),uid,...extra});
     if(['species','unreachable','variants-fallback'].includes(scenario)) {
      state.discovered=state.discovered.filter(id=>id!=='prismkoi');state.discoveredVariants=state.discoveredVariants.filter(k=>!k.startsWith('prismkoi:'));
     }
     state.fish=[fish('astraljelly',5,1,'best-a'),fish('astraljelly',5,1,'best-b'),fish('goldfin',0,1,'manual-a'),fish('greyminnow',0,1,'manual-b')];
     if(scenario==='variants') {
      state.discoveredVariants=state.discoveredVariants.filter(k=>k!=='copperband:1');
      state.fish=[fish('moonjelly',1,1,'best-a'),fish('moonjelly',1,1,'best-b'),fish('moonjelly',1,5,'high-a'),fish('moonjelly',1,5,'high-b')];
     }
     if(scenario==='variants-fallback')state.discoveredVariants=state.discoveredVariants.filter(k=>k!=='copperband:5');
     if(['unreachable','variants-fallback'].includes(scenario)) state.fish=state.fish.filter(f=>f.tier===0);
     if(scenario==='unavailable') state.fish.forEach((f,i)=>f.locked=i>0);
     for(let i=state.fish.filter(f=>f.tier===0).length;i<3;i++)state.fish.push(fish('goldfin',0,1,`fixture-starter-${i}`,{locked:true}));
     state.tankUids=state.fish.map(f=>f.uid);sessionStorage.setItem('breed-recommendation-fixture',JSON.stringify(state));
    },{theme,locale,scenario});
    await tab.reload();await tab.locator('[data-shortcut="tab-breed"]').click();
    const reason={species:'new-species',variants:'new-variant','variants-fallback':'new-variant',unreachable:'unreachable',complete:'complete',unavailable:'unavailable'}[scenario];
    const hint=tab.locator(`[data-breed-recommendation="${reason}"]`);await hint.waitFor();
    const text=await hint.innerText();
    if(scenario==='species') {
     const probability=Number(await hint.getAttribute('data-new-species-probability'));
     if(Math.abs(probability-0.55/3)>1e-12||!text.includes('18.3%'))throw Error('Wrong species probability '+JSON.stringify({probability,text}));
    }
    if(scenario==='variants'&&!text.includes('6.1%'))throw Error('Wrong appearance probability '+text);
    if(scenario==='unavailable') {
     if(await tab.locator('[data-shortcut="autoPick"]').getAttribute('aria-disabled')!=='true')throw Error('Unavailable recommendation enabled');
    }else {
     await tab.keyboard.press('a');
     if(await hint.getAttribute('data-applied')!=='true')throw Error('Suggested selection not identified');
     const selected=await tab.locator('.item-card[data-selected="true"]').evaluateAll(els=>els.map(el=>el.dataset.fishUid).sort());
     const expected=['unreachable','variants-fallback'].includes(scenario)?['manual-a','manual-b']:['best-a','best-b'];
     if(JSON.stringify(selected)!==JSON.stringify(expected))throw Error('Wrong suggested parents '+JSON.stringify({scenario,selected}));
     if(scenario==='species') {
      for(const id of ['manual-a','manual-b']) await tab.locator(`[data-fish-uid="${id}"]`).click({position:{x:4,y:4}});
      await tab.locator('[data-shortcut="tab-settings"]').click();await tab.locator('[data-shortcut="tab-breed"]').click();
      const manual=await tab.locator('.item-card[data-selected="true"]').evaluateAll(els=>els.map(el=>el.dataset.fishUid).sort());
      if(await hint.getAttribute('data-applied')!=='false')throw Error('Manual selection mislabeled as recommended');
      if(JSON.stringify(manual)!==JSON.stringify(['manual-a','manual-b']))throw Error('Manual choice overwritten');
     }
    }
    const overflow=await hint.evaluate(el=>el.scrollWidth>el.clientWidth+1||document.documentElement.scrollWidth>innerWidth);
    if(overflow)throw Error('Recommendation hint overflows');
    await hint.scrollIntoViewIfNeeded();await tab.screenshot({path:`output/playwright/breed-recommendation-${theme}-${locale}-${width}-${scenario}.png`});
    results.push({theme,locale,width,scenario,passed:true});
   }
   if(errors.length)throw Error(errors.join('\n'));
  }finally{await context.close()}
 }
 return results;
}

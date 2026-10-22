async page => {
 const fixture={"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}};
 const results=[];
 for(const url of __FISHTANK_REFORGE_URLS__) for(const renderer of ['default','canvas']) for(const theme of ['realistic','lcd']) for(const locale of ['zh','en']) {
  const width=locale==='en'?390:1100;
  const ctx=await page.context().browser().newContext({viewport:{width,height:1000}});
  try {
   await ctx.addInitScript(({fixture,theme,locale})=>{
    const gallery=sessionStorage.getItem('reforge-gallery');
    if(gallery){localStorage.setItem('fishtank.save.v1',gallery);sessionStorage.removeItem('reforge-gallery');return}
    if(localStorage.getItem('reforge-fixture'))return;
    const now=Date.now(), state={...fixture,theme,locale,level:8,exp:12760,reforgeMisses:9,hearts:5,nextHeartAt:now+420000,lastTick:now};
    const starters=state.fish.filter(f=>f.tier===0);state.fish=starters;state.tankUids=starters.map(f=>f.uid);
    const fish=(uid,grade=1,extra={})=>({uid,speciesId:'prismkoi',tier:5,grade,uses:0,maxUses:5,maturesAt:null,bornAt:now,birthExp:0,expBanked:true,...extra});
    state.fish.push(fish('valid-1'),fish('valid-2',2),fish('valid-3',5),fish('protected-lock',5,{locked:true}),fish('protected-active',5,{uses:2}),fish('protected-young',5,{maturesAt:now+120000}),fish('protected-display',5),fish('lower',1,{speciesId:'jadeturtle',tier:4}));
    state.tankUids.push('protected-display');
    state.discovered=['goldfin','greyminnow','prismkoi','jadeturtle'];
    state.discoveredVariants=['goldfin:1','greyminnow:1','prismkoi:1','prismkoi:2','prismkoi:5','jadeturtle:1'];
    localStorage.setItem('fishtank.save.v1',JSON.stringify(state));localStorage.setItem('reforge-fixture','1');
   },{fixture,theme,locale});
   const tab=await ctx.newPage(),errors=[];tab.on('pageerror',e=>errors.push(e.message));
   await tab.emulateMedia({reducedMotion:'reduce'});
   await tab.goto(url+(renderer==='canvas'?'?renderer=canvas':''));
   const assert=(ok,msg)=>{if(!ok)throw Error(`${url}/${renderer}/${theme}/${locale}: ${msg}`)};
   const state=()=>tab.evaluate(()=>JSON.parse(localStorage.getItem('fishtank.save.v1')));
   await tab.locator('[data-shortcut="tab-book"]').click();
   const completion=await tab.locator('.sort-label').innerText();
   assert(await tab.locator('.book-grid .item-card').count()===29,'Regular roster denominator changed');
   const unknown=tab.locator('.book-grid .item-card[data-unavailable="true"]');
   assert(await unknown.count()===25,'Unknown regular species missing');
   assert(await unknown.locator('.name').evaluateAll(els=>els.every(e=>e.textContent==='???')),'Unknown names leaked');
   const silhouette=await unknown.locator('canvas').first().evaluate(canvas=>{
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let pixels=0,opaque=0;
    for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;pixels++;if(data[i+3]===255)opaque++;if(data[i]||data[i+1]||data[i+2])return {black:false,pixels,opaque}}
    return {black:true,pixels,opaque};
   });
   assert(silhouette.black&&silhouette.opaque>100,'Portrait is not an opaque black silhouette');
   await tab.screenshot({path:`output/playwright/reforge-${new URL(url).hostname}-${renderer}-${theme}-${locale}-unknown.png`});
   await tab.locator('[data-book-page="hidden"]').click();
   assert(await tab.locator('.book-grid .item-card').count()===0,'Undiscovered secret cards leaked');
   assert((await tab.locator('[data-book-page="hidden"]').innerText()).includes('0/3'),'Secret counter incorrect');
   await tab.locator('[data-book-page="hidden"]').focus();await tab.keyboard.press('ArrowRight');
   assert(await tab.locator('[data-book-page="medals"]').getAttribute('aria-selected')==='true','Book keyboard navigation failed');
   await tab.locator('[data-shortcut="tab-merge"]').click();await tab.locator('[data-merge-mode="reforge"]').click();
   assert(await tab.locator('[data-reforge-candidates] .item-card').count()===3,'Protected fish eligible');
   const before=await state();await tab.keyboard.press('r');assert((await state()).fish.length===before.fish.length,'R reforged without selecting three');
   await tab.locator('[data-reforge-auto]').click();
   assert(await tab.locator('[data-reforge-candidates] [aria-pressed="true"]').count()===3,'Automatic selection failed');
   await tab.screenshot({path:`output/playwright/reforge-${new URL(url).hostname}-${renderer}-${theme}-${locale}-ready.png`});
   // Exercise a genuine storage failure once, then retry normally.
   if(renderer==='default'&&theme==='realistic'&&locale==='zh') {
    await tab.evaluate(()=>{window.__originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='fishtank.save.v1')throw Error('Test full storage');return window.__originalSet.call(this,key,value)}});
    await tab.locator('[data-reforge-run]').click();
    assert((await state()).fish.length===before.fish.length,'Save failure consumed fish');
    assert(await tab.locator('[data-reforge-candidates] .item-card').count()===3,'In-memory materials not rolled back');
    assert(await tab.locator('[data-reforge-pity]').getAttribute('data-reforge-pity')==='9','Pity changed on save failure');
    await tab.evaluate(()=>{Storage.prototype.setItem=window.__originalSet});
   }
   await tab.keyboard.press('r');await tab.locator('[data-shortcut="collect"]').waitFor();
   const after=await state(),secrets=['lanternangler','glassangel','starnautilus'];
   const child=after.fish.find(f=>secrets.includes(f.speciesId));
   assert(Boolean(child)&&after.reforgeMisses===0,'Tenth-attempt guarantee did not discover secret');
   assert(after.fish.length===before.fish.length-2&&after.hearts===before.hearts,'Reforge accounting wrong');
   assert(child.grade===5&&child.uses>=1&&child.uses<=5,'Output quality or breeding uses wrong');
   assert(['protected-lock','protected-active','protected-young','protected-display','lower'].every(id=>after.fish.some(f=>f.uid===id)),'Protected materials lost');
   await tab.keyboard.press('r');await tab.locator('[data-shortcut="collect"]').waitFor({state:'detached'});
   await tab.reload();await tab.locator('[data-shortcut="tab-book"]').click();
   assert(await tab.locator('.sort-label').innerText()===completion,'Secret changed regular completion');
   await tab.locator('[data-book-page="hidden"]').click();
   assert(await tab.locator('.book-grid .item-card').count()===1,'Hidden collection not persistent');
   const only=tab.locator('.book-grid .item-card');await only.locator('.item-card-main').click();
   assert(await tab.locator('.book-detail').count()===1,'Discovered secret details inaccessible');
   // A separate synthetic gallery state verifies all three unique forms and both renderers.
   await tab.evaluate(secrets=>{
    const state=JSON.parse(localStorage.getItem('fishtank.save.v1')),now=Date.now();
    for(const [i,id]of secrets.entries()){
     if(!state.discovered.includes(id))state.discovered.push(id);
     if(!state.discoveredVariants.includes(id+':1'))state.discoveredVariants.push(id+':1');
     state.fish.push({uid:'gallery-'+id,speciesId:id,tier:5,grade:1,uses:2,maxUses:2,maturesAt:null,bornAt:now+i,birthExp:0,expBanked:true});
    }
    state.tankUids=secrets.map(id=>'gallery-'+id);sessionStorage.setItem('reforge-gallery',JSON.stringify(state));
   },secrets);
   await tab.reload();await tab.locator('[data-shortcut="tab-book"]').click();await tab.locator('[data-book-page="hidden"]').click();
   assert(await tab.locator('.book-grid .item-card').count()===3,'Full gallery count wrong');
   const art=await tab.locator('.book-grid canvas').evaluateAll(canvases=>canvases.map(c=>{
    const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i])visible++;return {visible,data:c.toDataURL()};
   }));
   assert(art.every(a=>a.visible>100)&&new Set(art.map(a=>a.data)).size===3,'Secret creature artwork empty or identical');
   if(new URL(url).hostname==='127.0.0.1') {
   const animated=await tab.evaluate(async()=>{
    const {fishPath}=await import('/src/render/shape.ts');const {HIDDEN_SPECIES}=await import('/src/core/species.ts');
    const canvas=document.createElement('canvas');canvas.width=140;canvas.height=140;const ctx=canvas.getContext('2d');
    return HIDDEN_SPECIES.map(sp=>{
     const frames=[0,1.2].map(phase=>{ctx.clearRect(0,0,140,140);ctx.save();ctx.translate(15,70);ctx.fillStyle='#000';ctx.fill(fishPath(sp.body,100,phase).path);ctx.restore();return canvas.toDataURL()});
     const {path}=fishPath(sp.body,100,0);
     return {id:sp.id,moving:frames[0]!==frames[1],solid:sp.id!=='glassangel'||[-.12,0,.12].every(y=>ctx.isPointInPath(path,56,y*95))};
    });
   });
   assert(animated.every(a=>a.moving&&a.solid),'Secret anatomy is static or has winding holes');
   }
   for(const checkWidth of [320,390,1100]){
    await tab.setViewportSize({width:checkWidth,height:1000});
    const labelsFit=await tab.locator('.book-pages[role="tablist"] button').evaluateAll(buttons=>buttons.every(button=>{
     const box=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);
     return [...range.getClientRects()].every(r=>r.left>=box.left-1&&r.right<=box.right+1);
    }));
    assert(labelsFit,'Collection tab label is clipped at '+checkWidth);
    assert(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+checkWidth);
   }
   await tab.setViewportSize({width,height:1000});
   await tab.screenshot({path:`output/playwright/reforge-${new URL(url).hostname}-${renderer}-${theme}-${locale}-secrets.png`});
   assert(errors.length===0,errors.join('; '));results.push({url,renderer,theme,locale,blackSilhouette:true,pity:true,persistence:true,hiddenGallery:true,pageErrors:errors});
  } finally {await ctx.close()}
 }
 return results;
}

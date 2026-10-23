async page => {
 const results=[];
 for(const theme of ['realistic','lcd']) for(const width of [390,1100]) {
  const ctx=await page.context().browser().newContext({viewport:{width,height:1000}});
  try {
   const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));
   await tab.goto('http://127.0.0.1:5173/?renderer=canvas');
   await tab.evaluate(async theme=>{
    const {itemCard}=await import('/src/ui/item-card.ts');
    document.documentElement.dataset.theme=theme;
    const host=document.createElement('div');host.id='hit-area-fixture';host.style.cssText='position:fixed;inset:0;z-index:9999;overflow:auto;background:var(--bg);padding:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-content:start';
    window.__cardClicks={};window.__actionClicks=0;
    for(const density of ['regular','compact','mini']) for(const selected of [false,true]) {
     const key=density+'-'+selected;window.__cardClicks[key]=0;
     const action=document.createElement('button');action.type='button';action.textContent='i';action.setAttribute('aria-label','Details '+key);action.onclick=()=>window.__actionClicks++;
     const art=document.createElement('span');art.textContent='🐟';
     const meta=document.createElement('span');meta.className='meta';meta.textContent='★★ · Grade 1';
     const mark=document.createElement('span');mark.textContent='♙';
     const card=itemCard({key,label:key,name:'Fish',portrait:art,meta,density,selected,count:{text:'2/4'},action,marks:[mark],onActivate:()=>window.__cardClicks[key]++});
     card.style.minHeight='220px';host.append(card);
    }
    const {milestonePanel}=await import('/src/ui/milestones.ts');
    const {newGame}=await import('/src/core/game.ts');
    const state=newGame();state.discovered.push('ambereel');state.discoveredVariants.push('ambereel:1');
    window.__medalClicks=[];
    const medals=milestonePanel(state,'zh',id=>window.__medalClicks.push(id));medals.style.gridColumn='1/-1';host.append(medals);
    const old=document.querySelector('#hit-area-fixture');old?.remove();document.body.append(host);
   },theme);
   for(const density of ['regular','compact','mini']) for(const selected of [false,true]) {
    const key=density+'-'+selected,card=tab.locator(`[data-card-key="${key}"]`);
    await card.scrollIntoViewIfNeeded();
    const box=await card.boundingBox();
    const points=[[4,4],[box.width/2,8],[3,box.height/2],[box.width-4,box.height/2],[box.width/2,box.height-4],[15,45]];
    for(let i=0;i<points.length;i++) {
     const before=await tab.evaluate(key=>window.__cardClicks[key],key);
     await card.click({position:{x:points[i][0],y:points[i][1]}});
     const after=await tab.evaluate(key=>window.__cardClicks[key],key);
     if(after!==before+1)throw Error(`${theme}/${width}/${key}: blank point ${i} activated ${after-before} times`);
    }
    const before=await tab.evaluate(key=>({main:window.__cardClicks[key],action:window.__actionClicks}),key);
    await card.locator('.item-card-action').click();
    const after=await tab.evaluate(key=>({main:window.__cardClicks[key],action:window.__actionClicks}),key);
    if(after.main!==before.main||after.action!==before.action+1)throw Error('Secondary action triggered main action');
    const main=card.locator('.item-card-main');await main.focus();await tab.keyboard.press('Enter');await tab.keyboard.press('Space');
    if(await tab.evaluate(key=>window.__cardClicks[key],key)!==after.main+2)throw Error('Native keyboard activation broken');
   }
   const medal=tab.locator('[data-milestone="first-friend"]');await medal.scrollIntoViewIfNeeded();
   const medalBox=await medal.boundingBox();
   const medalPoints=[[3,3],[medalBox.width-3,medalBox.height/2],[medalBox.width/2,medalBox.height-3]];
   for(const [x,y] of medalPoints)await medal.click({position:{x,y}});
   if(await tab.evaluate(()=>window.__medalClicks.filter(id=>id==='first-friend').length)!==3)throw Error('Medal blank area did not activate exactly once');
   const disabled=tab.locator('.milestone-entry').filter({has:tab.locator('button:disabled')}).first();
   await disabled.scrollIntoViewIfNeeded();await disabled.click({position:{x:3,y:3}});
   if(await tab.evaluate(()=>window.__medalClicks.length)!==3)throw Error('Locked medal activated');
   await medal.locator('button').focus();await tab.keyboard.press('Enter');
   if(await tab.evaluate(()=>window.__medalClicks.length)!==4)throw Error('Medal keyboard action broken');
   await tab.screenshot({path:`output/playwright/card-hit-area-${theme}-${width}.png`});
   if(errors.length)throw Error(errors.join('\n'));
   results.push({theme,width,cards:6,blankPointsPerCard:6,secondaryIndependent:true,keyboard:true});
  }finally{await ctx.close()}
 }
 return results;
}

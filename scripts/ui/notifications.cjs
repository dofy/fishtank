async page => {
 const fixture={"version":1,"fish":[{"uid":"mvhmaxs4-1","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-2","speciesId":"goldfin","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249413,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-3","speciesId":"greyminnow","tier":0,"grade":1,"uses":999,"maxUses":999,"maturesAt":null,"bornAt":1792557249414,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-4","speciesId":"ambereel","tier":2,"grade":5,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true,"locked":true},{"uid":"mvhmaxs4-5","speciesId":"ambereel","tier":2,"grade":2,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true},{"uid":"mvhmaxs4-6","speciesId":"ambereel","tier":2,"grade":1,"uses":4,"maxUses":4,"maturesAt":null,"bornAt":1792557249412,"birthExp":0,"expBanked":true}],"tankUids":["mvhmaxs4-1","mvhmaxs4-2","mvhmaxs4-3"],"placedDecor":[{"id":"kelp","x":0.14,"flip":1},{"id":"rocks","x":0.5,"flip":1},{"id":"shell","x":0.84,"flip":1}],"mergeFilter":{"zeroUsesOnly":true,"excludeInTank":false,"tiers":[1,2,3,4]},"tankSort":"inTank","breedSort":"tier","audio":{"sfxEnabled":true,"sfxVolume":0.7,"bgmEnabled":true,"bgmVolume":0.4,"bgmTrack":"lofi"},"hearts":5,"nextHeartAt":1792557669412,"exp":0,"level":1,"discovered":["goldfin","greyminnow","ambereel"],"discoveredVariants":["goldfin:1","greyminnow:1","ambereel:1","ambereel:2","ambereel:5"],"theme":"realistic","colorMode":"auto","railLights":{"animated":true,"frequency":0.5},"locale":"zh","lastTick":1792557249412,"milestones":{"unlocked":["first-friend","grade-five"]}};const results=[];
 for(const url of __FISHTANK_REMINDER_URLS__) for(const locale of ['zh','en']) for(const scenario of ['granted','denied','unsupported','storage-error','worker-error']) {
  const ctx=await page.context().browser().newContext({viewport:{width:scenario==='granted'?390:1100,height:950}});
  try {
   await ctx.addInitScript(({fixture,scenario,locale})=>{
    if(!localStorage.getItem('reminder-fixture')) {
     localStorage.setItem('fishtank.save.v1',JSON.stringify({...fixture,locale,hearts:4,nextHeartAt:Date.now()+3000}));
     localStorage.setItem('reminder-fixture','1');
    }
    window.__notices=[];window.__permissionRequests=0;
    if(scenario==='unsupported') Object.defineProperty(window,'Notification',{value:undefined,configurable:true});
    else {
     class FakeNotification {
      static permission='default';
      static async requestPermission(){window.__permissionRequests++;this.permission=scenario==='denied'?'denied':'granted';sessionStorage.setItem('test-notification-permission',this.permission);return this.permission}
      constructor(title,options){window.__notices.push({title,options})}
      close(){}
     }
     FakeNotification.permission=sessionStorage.getItem('test-notification-permission')||'default';
     Object.defineProperty(window,'Notification',{value:FakeNotification,configurable:true});
     if(navigator.serviceWorker)navigator.serviceWorker.getRegistration=async()=>({active:{},showNotification:async(title,options)=>{if(scenario==='worker-error')throw Error('Test delivery failure');window.__notices.push({title,options})}});
    }
    if(scenario==='storage-error') {
     const original=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,value){if(key==='fishtank.heart-reminder.v1')throw Error('Test quota');return original.call(this,key,value)};
    }
   },{fixture,scenario,locale});
   const errors=[];const tab=await ctx.newPage();tab.on('pageerror',error=>errors.push(error.message));await tab.goto(url);await tab.locator('[data-shortcut="tab-settings"]').click();
   const button=tab.locator('[data-heart-reminder]');
   if(await tab.evaluate(()=>window.__permissionRequests)!==0)throw Error('Permission requested without a click');
   if(scenario==='unsupported') {if(!await button.isDisabled())throw Error('Unsupported notification button enabled');}
   else {
    await button.click();
    const status=scenario==='granted'?'enabled':scenario==='denied'?'denied':'error';
    await tab.locator(`[data-heart-reminder-status="${status}"]`).waitFor();
    if(scenario==='granted') {
     await tab.waitForFunction(()=>window.__notices.length===1,null,{timeout:10000});
     const notice=await tab.evaluate(()=>window.__notices[0]);if(!notice.title.includes(locale==='zh'?'爱心已满':'hearts are full')||notice.options.tag!=='fishtank-hearts-full')throw Error('Wrong full-heart notice');
     await tab.reload();await tab.locator('[data-shortcut="tab-settings"]').click();
     if(await tab.evaluate(()=>window.__notices.length)!==0)throw Error('Reload repeated a full-heart reminder');
     await tab.locator('[data-heart-reminder]').click();
     await tab.locator('[data-heart-reminder-status="disabled"]').waitFor();
     if(await tab.evaluate(()=>JSON.parse(localStorage.getItem('fishtank.heart-reminder.v1')).enabled)!==false)throw Error('Disable did not persist');
    }
   }
   await tab.screenshot({path:`output/playwright/reminder-${new URL(url).hostname}-${locale}-${scenario}.png`});if(errors.length)throw Error(errors.join('\n'));results.push({url,locale,scenario,passed:true});
  }finally{await ctx.close()}
 }
 return results;
}

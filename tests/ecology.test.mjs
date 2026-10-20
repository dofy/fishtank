import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const NOW=1_800_000_000_000, W=720, H=230
let server, game, species, Scene, ecology, lcdGrid
before(async()=>{
  server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false}})
  game=await server.ssrLoadModule('/src/core/game.ts')
  species=await server.ssrLoadModule('/src/core/species.ts')
  ;({Scene}=await server.ssrLoadModule('/src/render/scene.ts'))
  ecology=await server.ssrLoadModule('/src/render/ecology.ts')
  lcdGrid=await server.ssrLoadModule('/src/render/lcd-grid.ts')
})
after(async()=>server?.close())

function setup(ids,decor=['kelp','arch']) {
  const state=game.newGame(NOW,'en');state.level=10
  state.fish=ids.map((id,i)=>{const sp=species.species(id),f=game.makeFish(id,sp.tier,1,NOW,{adult:true});f.uid=`fish-${i}`;return f})
  state.tankUids=state.fish.map(f=>f.uid)
  state.placedDecor=decor.map((id,i)=>({id,x:i?0.65:0.3,flip:1}))
  const scene=new Scene();scene.sync(state,species.species,W,H,NOW)
  const agents=scene.view(W,H,0).agents
  for(const a of agents) Object.assign(a,{x:220,y:140,dir:1,baseDepth:0.6,sceneryCooldown:0,zapCooldown:1000})
  return {state,scene,agents}
}

test('seahorses approach seaweed, rest, and eventually resume without changing progress',()=>{
  const {state,scene,agents:[a]}=setup(['coralseahorse'],['kelp'])
  const before=JSON.stringify(state),seen=new Set()
  for(let i=0;i<130;i++){scene.update(0.1,W,H,i/10);if(a.scenery)seen.add(a.scenery.stage)}
  assert.ok(seen.has('approach'));assert.ok(seen.has('pause'))
  assert.equal(a.scenery,undefined);assert.ok(a.sceneryCooldown>0)
  assert.equal(JSON.stringify(state),before)
})

test('small fish cross the arch opening with its frame in front, then leave',()=>{
  const {scene,agents:[a]}=setup(['greyminnow'],['arch'])
  const seen=new Set();let foreground=false
  for(let i=0;i<150;i++){
    scene.update(0.1,W,H,i/10)
    if(a.scenery)seen.add(a.scenery.stage)
    if(ecology.foregroundDecor(scene.view(W,H,i/10)).has('arch'))foreground=true
    if(seen.has('pass')&&!a.scenery)break
  }
  assert.ok(seen.has('approach'));assert.ok(seen.has('pass'));assert.equal(foreground,true)
  assert.equal(a.scenery,undefined)
  assert.deepEqual([...ecology.foregroundDecor(scene.view(W,H,20))],[])
})

test('same-species companions form one-way short visits, never mutual chase loops',()=>{
  const {scene,agents}=setup(['neoncleaner','neoncleaner'],[])
  agents[0].x=260;agents[1].x=180
  scene.update(0.1,W,H,0)
  assert.equal(agents[0].scenery,undefined)
  assert.equal(agents[1].scenery?.kind,'school')
  assert.equal(agents[1].scenery?.targetId,agents[0].fish.uid)
  for(let i=0;i<75;i++)scene.update(0.1,W,H,i/10)
  assert.equal(agents[1].scenery,undefined)
  assert.ok(agents[1].sceneryCooldown>0)
})

test('food, clicking, shocks, removal and reduced motion interrupt scenic visits',()=>{
  for(const action of ['food','click','shock','remove','reduced']){
    const {scene,agents:[a]}=setup(['coralseahorse'],['kelp'])
    scene.update(0.1,W,H,0);assert.ok(a.scenery,action)
    if(action==='food')scene.spawnFood(a.x+12,a.y,W,H)
    if(action==='click')scene.scareFish(a.fish.uid,a.x,a.y,W,H,NOW)
    if(action==='shock')a.shockedTimer=3
    if(action==='remove')scene.withdrawFish(a.fish.uid)
    scene.update(0.1,W,H,0.1,undefined,undefined,true,action==='reduced')
    assert.equal(a.scenery,undefined,action)
    assert.ok(a.sceneryCooldown>0,action)
  }
})

test('moving, removing or activating scenery cancels its visitor instead of trapping fish',()=>{
  const {state,scene,agents:[a]}=setup(['coralseahorse'],['kelp'])
  scene.update(0.1,W,H,0);assert.ok(a.scenery)
  scene.activeDecorId='kelp';scene.sync(state,species.species,W,H,NOW)
  scene.update(0.1,W,H,0.1);assert.equal(a.scenery,undefined)
  scene.activeDecorId=null;a.sceneryCooldown=0;scene.sync(state,species.species,W,H,NOW)
  scene.update(0.1,W,H,0.2);assert.ok(a.scenery)
  state.placedDecor=[];scene.sync(state,species.species,W,H,NOW)
  scene.update(0.1,W,H,0.3);assert.equal(a.scenery,undefined)
})

test('clicking a puffer yields a bounded temporary inflation; LCD has four integer silhouettes',()=>{
  const {scene,agents:[a]}=setup(['creampuff'],[])
  scene.scareFish(a.fish.uid,a.x,a.y,W,H,NOW)
  const levels=new Set();let peak=0
  for(let i=0;i<130;i++){
    scene.update(1/60,W,H,i/60)
    const amount=ecology.pufferAmount(a),level=ecology.pufferLevel(a)
    assert.ok(amount>=0&&amount<=1);assert.ok(Number.isInteger(level)&&level>=0&&level<=3)
    levels.add(level);peak=Math.max(peak,amount)
  }
  assert.ok(peak>0.99);assert.ok(levels.has(0)&&levels.has(3))
  assert.equal(ecology.pufferAmount(a),0)
  const shape=ecology.pufferBody(a.species.body,3)
  assert.ok(shape.depth>a.species.body.depth)
  assert.equal(a.species.body.depth,0.92,'no mutation to shared species shape')
})

test('puffer inflation is suppressed for reduced motion, shocks and withdrawal',()=>{
  const {scene,agents:[a]}=setup(['creampuff'],[])
  a.puffTimer=1
  assert.equal(ecology.pufferLevel(a,true),0)
  scene.update(0.1,W,H,0,undefined,undefined,true,true)
  assert.equal(a.puffTimer,0)
  a.puffTimer=1;scene.withdrawFish(a.fish.uid)
  assert.equal(ecology.pufferAmount(a),0)
  const shocked=setup(['creampuff','ambereel'],[])
  shocked.agents[0].puffTimer=1
  for(let i=0;i<6;i++)shocked.scene.scareFish(shocked.agents[1].fish.uid,220,140,W,H,NOW+i)
  assert.ok(shocked.agents[0].shockedTimer>0)
  assert.equal(shocked.agents[0].puffTimer,0)
})

test('tiny tanks and repeated scenery changes leave bounded finite agent positions',()=>{
  const {scene,agents}=setup(['coralseahorse','greyminnow','neoncleaner','neoncleaner'],['kelp','arch'])
  for(let i=0;i<1200;i++){
    scene.update(1/30,280,150,i/30)
    for(const a of agents)for(const key of ['x','y','phase','tilt'])assert.ok(Number.isFinite(a[key]),`${i}:${key}`)
  }
  for(const a of agents){assert.ok(a.x>=0&&a.x<=280);assert.ok(a.y>=0&&a.y<=150)}
})

test('LCD texture centres stay on whole cells for every adult and fry body',()=>{
  for(const sp of species.SPECIES)for(const scale of [0.65,1])for(const cell of [2,3,4]){
    const length=sp.body.length*4.2*scale,bounds=lcdGrid.lcdTextureBounds(length,cell)
    assert.equal(bounds.pad%cell,0)
    assert.equal((bounds.width/2)%cell,0)
    assert.equal((bounds.height/2)%cell,0)
    assert.ok(bounds.width>=length+bounds.pad*2)
    assert.ok(bounds.height>=Math.max(length*1.65,76)+bounds.pad*2)
  }
})

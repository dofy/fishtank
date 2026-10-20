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
  const scene=new Scene();scene.planktonIn=Infinity;scene.sync(state,species.species,W,H,NOW)
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

test('same-species schools choose a random leader and disperse without mutual chase loops',()=>{
  const {scene,agents}=setup(['neoncleaner','neoncleaner','neoncleaner','neoncleaner'],[])
  const original=Math.random
  try{
    Math.random=()=>0
    for(const a of agents)a.schoolCooldown=0
    scene.update(0.1,W,H,0)
    const leaders=agents.filter(a=>a.schoolLeader),followers=agents.filter(a=>a.scenery?.kind==='school')
    assert.ok(leaders.length>=1);assert.ok(followers.length>=1)
    for(const follower of followers)assert.ok(leaders.some(leader=>leader.fish.uid===follower.scenery.targetId&&!leader.scenery))
    for(let i=1;i<90;i++)scene.update(0.1,W,H,i/10)
    assert.ok(agents.every(a=>!a.schoolLeader&&a.scenery?.kind!=='school'))
  }finally{Math.random=original}
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


test('schools can contain five same-species adults and ignore a different species',()=>{
  const {scene,agents}=setup(['neoncleaner','neoncleaner','neoncleaner','neoncleaner','neoncleaner','greyminnow'],[])
  const original=Math.random;let calls=0
  try{
    for(const a of agents)a.schoolCooldown=0
    Math.random=()=>calls++===0?0:0.99
    scene.update(0.1,W,H,0)
    assert.equal(agents.filter(a=>a.schoolLeader).length,1)
    assert.equal(agents.filter(a=>a.scenery?.kind==='school').length,4)
    assert.equal(agents[5].scenery,undefined)
    assert.equal(agents[5].schoolLeader,undefined)
    scene.withdrawFish(agents.find(a=>a.schoolLeader).fish.uid)
    scene.update(0.1,W,H,0.1)
    assert.ok(agents.every(a=>a.scenery?.kind!=='school'))
  }finally{Math.random=original}
})

test('ambient plankton are noticed and eaten without changing game progress',()=>{
  const {scene,state,agents:[a]}=setup(['greyminnow'],[]),before=JSON.stringify(state)
  scene.planktonIn=0;a.eatCooldown=100
  scene.update(0.1,W,H,0)
  const foods=scene.view(W,H,0).foods
  assert.ok(foods.length>=1&&foods.length<=3)
  assert.ok(foods.every(f=>f.kind==='plankton'&&f.lifetime>=16))
  a.x=foods[0].x;a.y=foods[0].y;a.eatCooldown=0
  let bites=0;scene.update(0.1,W,H,0.1,()=>bites++)
  assert.equal(bites,1);assert.equal(scene.view(W,H,0.1).foods.length,foods.length-1)
  assert.equal(JSON.stringify(state),before)
})

test('plankton count and lifetime are bounded and reduced motion stops ambient feeding',()=>{
  const {scene,agents:[a]}=setup(['greyminnow'],[]);a.eatCooldown=1000
  for(let i=0;i<10;i++){scene.planktonIn=0;scene.update(0.1,W,H,i/10)}
  assert.ok(scene.view(W,H,1).foods.length<=3)
  scene.planktonIn=Infinity
  for(let i=0;i<250;i++)scene.update(0.1,W,H,1+i/10)
  assert.equal(scene.view(W,H,26).foods.length,0)
  scene.planktonIn=0;scene.update(0.1,W,H,27)
  scene.spawnFood(300,80,W,H)
  scene.update(0.1,W,H,27.1,undefined,undefined,true,true)
  assert.equal(scene.view(W,H,27.1).foods.length,1)
  assert.equal(scene.view(W,H,27.1).foods[0].kind,undefined)
  const empty=setup([],[]).scene;empty.planktonIn=0;empty.update(1,W,H,1)
  assert.equal(empty.view(W,H,1).foods.length,0)
})

test('player feeding interrupts a school and takes priority over nearer plankton',()=>{
  const {scene,agents:[a]}=setup(['greyminnow'],[])
  a.schoolLeader={until:20,x:600,y:100}
  scene.foods=[{id:999,kind:'plankton',x:a.x-2,y:a.y,vy:0,seed:0,age:0,lifetime:20}]
  scene.spawnFood(a.x+100,a.y,W,H)
  scene.update(0.1,W,H,1)
  assert.equal(a.schoolLeader,undefined);assert.equal(a.dir,1)
  assert.equal(scene.view(W,H,1).foods.length,2)
})


test('same-species fry join schools after settling into the aquarium',()=>{
  const {scene,agents}=setup(['neoncleaner','neoncleaner'],[])
  agents[1].scale=0.65;agents[1].dropping=true
  for(const a of agents)a.schoolCooldown=0
  const original=Math.random
  try{
    Math.random=()=>0
    scene.update(0.01,W,H,0)
    assert.ok(agents.every(a=>!a.schoolLeader&&a.scenery?.kind!=='school'))
    agents[1].dropping=false;agents[1].schoolCooldown=0
    scene.update(0.1,W,H,0.1)
    assert.equal(agents.filter(a=>a.schoolLeader).length,1)
    assert.equal(agents.filter(a=>a.scenery?.kind==='school').length,1)
  }finally{Math.random=original}
})

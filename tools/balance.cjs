// Deterministic balance probes of the real game loop. No dependencies required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
 constructor() { this.style={}; this.classList={add(){},remove(){},toggle(){}}; this.children=[]; }
 appendChild(e){this.children.push(e)}
 querySelector(){return new Element()}
 addEventListener(){}
 getBoundingClientRect(){return {width:1280,height:800}}
 getContext(){return {}}
}
function simulate(branch, developed, seed, active=true) {
 const elements = new Map(), storage = new Map();
 const math = Object.create(Math); let randomSeed=seed;
 math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
 const context = { console, Math:math, Image:class {}, requestAnimationFrame(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  document:{createElement(){return new Element()},getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},querySelector(){return new Element()},addEventListener(){}},
  window:{addEventListener(){}} };
 vm.createContext(context);
 let source=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');
 source=source.replace('  function sfx(freq, dur, type, vol) {','  function sfx(freq, dur, type, vol) { return;');
 source=source.replace('  function syncHud() {','  function syncHud() { return;').replace('  function buildShop() {','  function buildShop() { return;');
 source=source.replace('  resize();\n  loadAll()', '  window.step = { update, powerStrike, whirlwind, charge, mend, buyRun, chooseTalent, get state(){return state} };\n  resize();\n  loadAll()');
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/content.js'),'utf8')+'\n'+source,context);
 const {unending:u,step:t}=context.window;
 u.persist.branch=branch;
 if(developed) u.persist.prest={ [branch+'_body']:3,[branch+'_craft']:3,[branch+'_keystone']:1 };
 u.startRun(); const r=u.run;
 const upgrades=vm.runInContext('RUN_UPGRADES',context);
 for(let frame=0; frame<60*60*20; frame++) {
  if(t.state==='dead'||t.state==='victory')break;
  if(t.state==='talent') {
   const preferred=['reach','leech','ward','duelist','edge','fortune'];
   t.chooseTalent([...r.offers].sort((a,b)=>preferred.indexOf(a)-preferred.indexOf(b))[0]);
  }
  if(t.state!=='fight')continue;
  const h=r.hero;
  if(frame%20===0) {
   for(let i=0;i<10;i++) {
    const candidates=upgrades.filter(q=>(r.levels[q.id]||0)<q.max&&q.cost(r.levels[q.id]||0)<=r.gold);
    candidates.sort((a,b)=>{
     const score=q=>q.id==='iron'?1.8*1.5/h.dmg/q.cost(r.levels[q.id]||0):q.id==='swift'?1.8*.04/h.atkRate/q.cost(r.levels[q.id]||0):(12/h.maxHp+.048/(1+h.armor*.08))/q.cost(r.levels[q.id]||0)*(h.hp<h.maxHp*.6?2:1);
     return score(b)-score(a);
    });
    if(!candidates.length)break;
    t.buyRun(candidates[0].id,1,true);
   }
  }
  if(active) {
   if(h.hp<h.maxHp*.72)t.mend();
   if(r.enemies.some(e=>Math.abs(e.x-h.x)<108))t.powerStrike();
   if(r.enemies.some(e=>Math.abs(e.x-h.x)<220))t.whirlwind();
   if(h.mode==='home'&&r.enemies.some(e=>(e.def.projectile||e.def.heal)&&e.x<620))t.charge();
   if(branch==='vanguard'&&developed&&h.mode==='forward'&&h.hp<h.maxHp*.6&&h.shieldCd===0)t.charge();
  }
  t.update(.05);
 }
 return {branch,developed,active,seed,state:t.state,wave:r.wave,cleared:r.cleared.length,seconds:Math.round(r.elapsed),idlePct:Math.round(r.idleTime/Math.max(1,r.elapsed)*100),hp:Math.round(r.hero.hp),ranks:r.levels,bossTimes:Object.fromEntries(Object.entries(r.bossTimes).map(([k,v])=>[k,Math.round(v)]))};
}
for(const branch of ['vanguard','ravager','spellblade'])for(const developed of [false,true])for(const seed of [1,2,3])console.log(JSON.stringify(simulate(branch,developed,seed)));
console.log(JSON.stringify(simulate('vanguard',false,1,false)));

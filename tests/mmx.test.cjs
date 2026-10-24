const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function fixture(){
 const ctx={};vm.createContext(ctx);
 const route=source.slice(source.indexOf('  const PROBE_ROUTE='),source.indexOf('  // 経路に影響しない出来事'));
 const state=source.slice(source.indexOf('  function probeOrbitOffset('),source.indexOf('  function probeTrailIntervals('));
 vm.runInContext(`const YEAR_DAYS=365.25,PROBE_EPOCH_Y=26.75;const BODIES=Array.from({length:4},(_,i)=>({R:0.5,a:1+i/5}));
 const distNow=x=>x,convAU=x=>x;function bodyAt(b,y){return [b.a*Math.cos(y),0,b.a*Math.sin(y)]} ${route}
 const wp=PROBE_ROUTE.MMX.map(w=>({t:((w[6]!==undefined?w[6]:Date.UTC(w[0],w[1]-1,w[2],12))-Date.UTC(2000,0,1,12))/86400000/YEAR_DAYS,bi:w[3],ev:w[4],stay:!!w[5]}));
 const p={jpn:true,ends:true,wp,wi:wp.map(w=>({R:bodyAt(BODIES[w.bi],w.t),off:[0,0,0]})),launchY:wp[0].t,endY:wp.at(-1).t};
 ${state} globalThis.p=p;globalThis.probeState=probeState;`,ctx);return ctx;
}
test('MMX route covers departure, Mars exploration and return; stays finite throughout',()=>{
 const {p,probeState}=fixture();assert.equal(p.wp[0].bi,2);assert.equal(p.wp[1].bi,3);assert(p.wp[1].stay);assert.equal(p.wp.at(-1).bi,2);
 assert.equal(probeState(p,p.launchY-.01),null);assert.equal(probeState(p,p.endY+.01),null);
 for(let i=0;i<=500;i++){const s=probeState(p,p.launchY+(p.endY-p.launchY)*i/500);assert(s.pos.every(Number.isFinite));assert(Number.isFinite(s.au));}
 assert(p.wp.slice(1).every(w=>/仮置き/.test(w.ev)));
 assert.equal(Date.UTC(2000,0,1,12)+p.launchY*365.25*86400000,Date.UTC(2026,9,19,19,41,3));
 assert.match(p.wp[0].ev,/打ち上げ成功/);
});
test('MMX has a dedicated model, information and tour entry',()=>{
 assert.match(source,/jp:"MMX",jpn:true,schematic:true,model:7/);assert.match(source,/7:MMX_PARTS/);assert.match(source,/INFO.probe\["MMX"\]/);assert.match(source,/"MMX":\[2026,10,19,2031,8,1\]/);
 const parts=source.slice(source.indexOf('  const MMX_PARTS='),source.indexOf('  const JP_MODELS='));assert.equal((parts.match(/c:PANEL/g)||[]).length,2);
});

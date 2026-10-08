const test=require('node:test'),assert=require('node:assert/strict');
const O=require('../assets/iss-orbit.js'),raw=require('./fixtures/iss-omm.json'),reference=require('./fixtures/iss-sgp4-reference.json');
const data=O.validate(raw),epoch=data.epoch;
test('ISS SGP4 agrees with independent Python/Vallado vectors (position < 5 cm, speed < 0.05 mm/s)',()=>{
  for(const r of reference.vectors){const s=O.state(data,epoch+r.minutes*60000);assert(s);
    for(let k=0;k<3;k++){assert(Math.abs(s.position[k]-r.position[k])<.00005);assert(Math.abs(s.velocity[k]-r.velocity[k])<.00000005);}
    assert(s.altitude>350&&s.altitude<450);assert(s.speed>7.5&&s.speed<8);
  }
});
test('Earth basis mapping preserves ISS distance and geodetic longitude/latitude',()=>{
  for(let m=0;m<95;m++){
    const ms=epoch+m*60000,s=O.state(data,ms),delta=.6;
    const rot=v=>[v[0]*Math.cos(delta)-v[2]*Math.sin(delta),v[1],v[0]*Math.sin(delta)+v[2]*Math.cos(delta)];
    const w=O.worldOffset(s.ecef,ms,rot);assert(Math.abs(Math.hypot(...w)-Math.hypot(...s.position))<1e-8);
    const x=O.worldOffset([1,0,0],ms,rot),y=O.worldOffset([0,1,0],ms,rot),z=O.worldOffset([0,0,1],ms,rot);
    const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
    assert(Math.abs(Math.atan2(dot(w,y),dot(w,x))*180/Math.PI-s.longitude)<1e-8);
    assert(Math.abs(dot(x,y))<1e-12);assert(Math.abs(dot(x,z))<1e-12);
  }
});
test('Past/future > three days is never propagated; malformed data is rejected',()=>{
  assert(O.state(data,epoch+O.MAX_AGE));assert.equal(O.state(data,epoch+O.MAX_AGE+1),null);assert.equal(O.state(data,epoch-O.MAX_AGE-1),null);assert.equal(O.state(null,epoch),null);
  for(const patch of [{NORAD_CAT_ID:123},{EPOCH:'invalid'},{MEAN_MOTION:null},{ECCENTRICITY:1},{INCLINATION:NaN},{MEAN_ELEMENT_THEORY:'OTHER'}])assert.throws(()=>O.validate({...raw,elements:{...raw.elements,...patch}}));
});
test('Cache survives upstream/snapshot failure, corrupt storage and write-denied storage',async()=>{
  let calls=0;const storage={getItem:()=>JSON.stringify(raw),setItem:()=>{throw Error('quota');}};
  const store=new O.Store({storage,now:()=>epoch,fetcher:async()=>{calls++;throw Error('offline');}});
  await store.refresh();assert.equal(store.source,'cache');assert(store.failed);assert(O.state(store.data,epoch));await store.refresh();assert.equal(calls,2);
  const broken=new O.Store({storage:{getItem:()=>'{',setItem(){}},now:()=>epoch,fetcher:async()=>{throw Error('offline');}});await broken.refresh();assert.equal(broken.data,null);
});
test('Static GitHub snapshot works without CORS; newest epoch wins; concurrent refresh is deduplicated',async()=>{
  let calls=0;const store=new O.Store({storage:null,now:()=>epoch,fetcher:async url=>{calls++;if(url===O.URL)throw Error('CORS');return {ok:true,json:async()=>raw};}});
  await Promise.all([store.refresh(),store.refresh()]);assert.equal(calls,2);assert.equal(store.source,'snapshot');assert(O.state(store.data,epoch));
  const older={...raw,elements:{...raw.elements,EPOCH:'2019-06-04T12:12:58'}};assert.equal(store.accept(older,'live'),false);assert.equal(store.source,'snapshot');
});

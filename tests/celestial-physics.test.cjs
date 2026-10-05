const test=require('node:test'),assert=require('node:assert/strict');
const {diskVisibility,shadowLight,moonEvents}=require('../assets/celestial-physics.js');
test('Solar disk: no overlap, total eclipse, annular eclipse, partial eclipse',()=>{
  assert.equal(diskVisibility(3,1,1),1);assert.equal(diskVisibility(0,1,2),0);
  assert.equal(diskVisibility(0,2,1),.75);
  assert.ok(Math.abs(diskVisibility(1,1,1)-.6089977810442293)<1e-12);
});
test('A planet blocks sunlight only when it is between the Sun and the receiver',()=>{
  assert.equal(shadowLight([-6,0,0],[0,0,0],1,[1,0,0],.001),0);
  assert.equal(shadowLight([6,0,0],[0,0,0],1,[1,0,0],.001),1);
  assert.equal(shadowLight([-6,2,0],[0,0,0],1,[1,0,0],.001),1);
});
test('A moon shadow intersects the lit surface, not the far side',()=>{
  const m={position:[6,0,0],radius:.026},s=moonEvents(m,[1,0,0],[1,0,0],.001);
  assert.equal(s.transit,true);assert.equal(s.occulted,false);assert.equal(s.illumination,1);
  assert.deepEqual(s.shadow,[1,0,0]);assert.equal(s.shadowVisible,true);
  const backside=moonEvents({position:[-6,0,0],radius:.026},[1,0,0],[1,0,0],.001);
  assert.equal(backside.shadow,null);assert.equal(backside.occulted,true);assert.equal(backside.illumination,0);
});
test('Eclipse and occultation use different viewing lines',()=>{
  const earth=[Math.cos(.3),0,Math.sin(.3)];
  const s=moonEvents({position:[-6,0,0],radius:.026},earth,[1,0,0],.001);
  assert.equal(s.illumination,0);assert.equal(s.occulted,false);
});

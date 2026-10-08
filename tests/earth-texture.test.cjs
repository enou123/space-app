const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {resolution,Manager}=require('../assets/earth-texture.js');
test('Resolution honors GPU size, lite mode, phone and memory/CPU limits',()=>{
  const powerful={maxTextureSize:16384,memory:8,cores:8};
  assert.equal(resolution('auto',powerful,false),2048);assert.equal(resolution('auto',powerful,true),4096);assert.equal(resolution('8192',powerful,true),8192);
  for(const limit of [{lite:true},{mobile:true},{memory:4},{cores:4},{maxTextureSize:4096}])assert(resolution('8192',{...powerful,...limit},true)<=4096);
  assert.equal(resolution('8192',{...powerful,maxTextureSize:1024},true),1024);assert.equal(resolution('8192',{...powerful,memory:2},true),2048);
});
test('Original 2048 map is byte-for-byte unchanged; high maps have recorded provenance hashes',()=>{
  const original=fs.readFileSync(require('node:path').join(__dirname,'../assets/textures/earth-blue-marble-2048.jpg'));
  const before=require('node:child_process').execFileSync('git',['show','177c685:assets/textures/earth-blue-marble-2048.jpg']);assert.deepEqual(original,before);
  for(const [width,hash] of [[4096,'8bf1e331a1c94c1a74c3e7d21735c8b98c86a6873bbe348fe85a7655009b2135'],[8192,'d66a7f08867b3c880f96b16f6886b709b179a7aa71db9f9c99481ebeaa2e3ffc']]){
    const b=fs.readFileSync(require('node:path').join(__dirname,'../assets/textures/earth-blue-marble-'+width+'.jpg'));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);
  }
});
function setup(){let next=0,error=0,deleted=[],images=[];const base={id:'base'};
  const gl={TEXTURE1:1,TEXTURE0:0,TEXTURE_2D:2,NO_ERROR:0,createTexture:()=>({id:++next}),deleteTexture:t=>deleted.push(t),getError:()=>error,getExtension:()=>null};
  for(const key of ['activeTexture','bindTexture','pixelStorei','texImage2D','texParameteri','generateMipmap'])gl[key]=()=>{};
  const m=new Manager({gl,base,getBaseWidth:()=>2048,makeImage:()=>{const i={};images.push(i);return i;}});return {m,base,images,deleted,setError:e=>error=e};
}
test('Image failure and GPU upload failure return to original; stale loads cannot overwrite current selection',()=>{
  const {m,base,images,deleted,setError}=setup();m.select(4096);Object.assign(images[0],{width:4096,height:2048});images[0].onload();assert.equal(m.width,4096);assert.notEqual(m.texture,base);
  m.select(8192);images[1].onerror();assert.equal(m.texture,base);assert.equal(m.width,2048);assert(m.failed);assert.equal(deleted.length,1);
  m.select(4096);m.select(2048);Object.assign(images[2],{width:4096,height:2048});images[2].onload();assert.equal(m.texture,base);
  m.select(8192);Object.assign(images[3],{width:8192,height:4096});setError(1285);images[3].onload();assert.equal(m.texture,base);assert(m.failed);
  setError(0);m.select(8192,true);Object.assign(images[4],{width:8192,height:4096});images[4].onload();assert.equal(m.width,8192);assert.equal(m.failed,false);
});

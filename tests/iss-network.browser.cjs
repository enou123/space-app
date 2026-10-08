// Real Chromium CORS checks, then controlled failures using an HTTP server.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/timeout')return;
  if(req.url!=='/cors-denied')res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Content-Type','application/json');
  if(req.url==='/http-error'){res.writeHead(503);res.end('{}');}
  else if(req.url==='/invalid')res.end('[{"NORAD_CAT_ID":123}]');
  else res.end('[]');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const faults='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox']});
 try{
  const context=await browser.newContext();
  await context.grantPermissions(['local-network-access'],{origin:'http://127.0.0.1:8770'});
  const p=await context.newPage(),consoleErrors=[];
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await p.route('http://127.0.0.1:8770/network-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>ISS network validation</title>'}));
  await p.goto('http://127.0.0.1:8770/network-check');
  await p.addScriptTag({path:path.join(root,'assets/vendor/satellite.min.js')});
  await p.addScriptTag({path:path.join(root,'assets/iss-orbit.js')});
  const results=await p.evaluate(async faults=>{
   const O=ISSOrbit;
   const attempts=[];
   const get=async url=>{for(let i=0;i<3;i++){const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000)});attempts.push({url,status:r.status});if(r.ok||i===2)return r;await new Promise(resolve=>setTimeout(resolve,2000));}};
   const tleResponse=await get(O.URL.replace('FORMAT=JSON','FORMAT=TLE'));
   const tle=await tleResponse.text();
   const ommResponse=await get(O.URL),rows=await ommResponse.json();
   const raw={elements:rows.find(r=>Number(r.NORAD_CAT_ID)===25544),fetchedAt:new Date().toISOString()};
   const data=O.validate(raw),position=O.state(data,Date.now());
   const cases=[];
   for(const mode of ['cors-denied','http-error','invalid','timeout']){
    const storage={getItem:()=>JSON.stringify(raw),setItem:()=>{}};
    // Preserve the Store's own AbortSignal, including the real 10-second timer.
    const store=new O.Store({storage,fetcher:(url,options)=>fetch(faults+(url===O.SNAPSHOT?'/http-error':'/'+mode),options)});
    const start=performance.now();await store.refresh(true);
    cases.push({mode,failed:store.failed,busy:store.busy,source:store.source,epoch:store.data?.epoch,fetchedAt:store.data?.fetchedAt,visible:!!O.state(store.data,Date.now()),elapsedMs:performance.now()-start});
   }
   const blocked=(url,options)=>fetch(faults+'/cors-denied',options);
   const empty=new O.Store({storage:null,fetcher:blocked});await empty.refresh(true);
   const staleRaw={...raw,elements:{...raw.elements,EPOCH:new Date(Date.now()-4*O.DAY).toISOString().replace('Z','')}};
   const stale=new O.Store({storage:{getItem:()=>JSON.stringify(staleRaw)},fetcher:blocked});await stale.refresh(true);
   const snapshot=new O.Store({storage:null,fetcher:(url,options)=>url===O.SNAPSHOT?Promise.resolve(new Response(JSON.stringify(raw),{status:200,headers:{'Content-Type':'application/json'}})):blocked(url,options)});
   await snapshot.refresh(true);
   return {attempts,tle:{status:tleResponse.status,type:tleResponse.type,body:tle},omm:{status:ommResponse.status,type:ommResponse.type,epoch:data.epoch,raw,altitude:position?.altitude},cases,empty:{failed:empty.failed,data:empty.data,visible:!!O.state(empty.data,Date.now())},stale:{failed:stale.failed,visible:!!O.state(stale.data,Date.now())},snapshot:{source:snapshot.source,failed:snapshot.failed,visible:!!O.state(snapshot.data,Date.now())}};
  },faults);
  fs.writeFileSync('/tmp/iss-network-browser-results.json',JSON.stringify({...results,consoleErrors},null,2));
  assert.equal(results.tle.status,200);assert.equal(results.tle.type,'cors');
  const lines=results.tle.body.trim().split(/\r?\n/);
  for(const [i,line] of lines.slice(1).entries()){
   assert(line.startsWith((i+1)+' 25544'));assert.equal(line.length,69);
   const sum=[...line.slice(0,68)].reduce((n,c)=>n+(/\d/.test(c)?Number(c):c==='-'?1:0),0)%10;
   assert.equal(sum,Number(line[68]));
  }
  assert.equal(results.omm.status,200);assert.equal(results.omm.type,'cors');assert(results.omm.altitude>100);
  for(const c of results.cases){assert(c.failed&&!c.busy&&c.visible);assert.equal(c.source,'cache');assert.equal(c.epoch,results.omm.epoch);assert.equal(c.fetchedAt,results.omm.raw.fetchedAt);}
  assert(results.cases.find(c=>c.mode==='timeout').elapsedMs>=9900);
  assert(results.empty.failed&&!results.empty.visible&&!results.empty.data);
  assert(results.stale.failed&&!results.stale.visible);
  assert(results.snapshot.failed&&results.snapshot.visible&&results.snapshot.source==='snapshot');
  assert(consoleErrors.some(s=>s.includes('CORS policy')),'Chromium must enforce the denied-origin case');
  console.log(JSON.stringify(results));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

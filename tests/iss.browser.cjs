const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium,devices}=require('playwright');
const live=process.env.SPACE_APP_LIVE_ISS==='1';
const raw=require('./fixtures/iss-omm.json'),epoch=Date.parse(raw.fetchedAt),url=process.env.SPACE_APP_TEST_URL||'http://127.0.0.1:8770/';
const observation=`window.__resumeFrames=()=>{window.__testFreeze=false;requestAnimationFrame(frame);};window.__issState=()=>({followISS,issSky,scaleMode,scaleBlend,moonScale,speed,nowLock,years,ms:AST.ms,iss:issState,position:issPos,earth:bodyAt(BODIES[2],years,false),eye:curEye,focus:[...focus],cam:{...cam},surfaceMode,ground:!!horizonCut,earthSynced,error:gl.getError(),source:issStore.source,busy:issStore.busy,failed:issStore.failed,epoch:issStore.data?.epoch,saved:issSaved,unit:ISS_KM_UNIT,earthPixel:issPos?project(curVpR,v3sub(bodyAt(BODIES[2],years,false),curEye)):null,finite:[...curEye,...focus,...(issPos||[])].every(Number.isFinite)});`;
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace('  function frame(now,stereoPass=0){','  function frame(now,stereoPass=0){if(window.__testFreeze)return;').replace('  requestAnimationFrame(frame);\n})();',observation+'\n  requestAnimationFrame(frame);\n})();');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',...(live&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});const results=[];
for(const profile of (process.env.SPACE_APP_TEST_PROFILE?[process.env.SPACE_APP_TEST_PROFILE]:['PC','iPhone-portrait','iPhone-landscape'])){
 console.log('start',profile);
 const p=await browser.newPage(profile==='PC'?{viewport:{width:1000,height:760}}:{...devices['iPhone 13'],deviceScaleFactor:1,viewport:profile.endsWith('portrait')?{width:390,height:844}:{width:844,height:390}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 if(live){p.on('response',r=>{if(r.url().includes('celestrak.org')||r.url().includes('/iss-data/'))console.log(profile,'network',r.status(),r.url());});p.on('requestfailed',r=>console.log(profile,'request failed',r.url(),r.failure()?.errorText));}
 await p.addInitScript(({epoch,raw,live})=>{if(!live){const start=performance.now();Date.now=()=>epoch+10000+performance.now()-start;localStorage.setItem('space-app.iss.omm.v1',JSON.stringify(raw));}localStorage.setItem('ssm_lite','1');},{epoch,raw,live});
 await p.route(url,r=>r.fulfill({contentType:'text/html',body:source}));if(!live){await p.route('https://raw.githubusercontent.com/enou123/space-app/iss-data/latest.json',r=>r.fulfill({json:raw}));await p.route('https://celestrak.org/**',r=>r.abort());}
 p.setDefaultTimeout(60000);await p.goto(url);await p.locator('#welcomeExplore').click();if(await p.locator('#panelToggle').getAttribute('aria-expanded')!=='true')await p.locator('#panelToggle').click();
 const shot=async name=>{await p.evaluate(()=>window.__testFreeze=true);await p.waitForTimeout(150);await p.screenshot({path:'/tmp/iss-'+profile+'-'+name+'.png'});await p.evaluate(()=>__resumeFrames());};
 const state=()=>p.evaluate(()=>__issState());const wait=()=>p.waitForFunction(()=>window.__issState?.().finite&&__issState().error===0);
 await p.locator('[data-sc="1"]').click();await p.locator('[data-sp="0"]').click();const before=await state();
 // Pause only the software GPU while acquiring data; fetch/CORS and the clock stay real.
 if(live)await p.evaluate(()=>window.__testFreeze=true);
 await p.selectOption('#moonTravelSelect','iss');
 if(live){await p.waitForFunction(()=>!__issState().busy);if(!(await state()).epoch){console.log(profile,'initial acquisition failed',await p.locator('#issStatus').textContent());await p.locator('#issRefresh').click();await p.waitForFunction(()=>!__issState().busy);}await p.evaluate(()=>__resumeFrames());}
 try{await p.waitForFunction(()=>__issState().iss&&__issState().followISS);}catch(e){console.log(profile,'failed state',await state());throw e;}await wait();
 if(live)await p.waitForFunction(()=>__issState().source==='live');
 let s=await state();assert.equal(s.scaleMode,2);assert.equal(s.scaleBlend,2);assert.equal(s.moonScale,1);assert(s.nowLock);assert(s.speed<.000002);assert(s.earthSynced);assert.equal(s.surfaceMode,false);
 const distance=Math.hypot(...s.position.map((v,i)=>v-s.earth[i]))/s.unit;assert(Math.abs(distance-Math.hypot(...s.iss.position))<1e-6);assert(distance>6700&&distance<6900);
 await p.locator('#panelToggle').click();await shot('orbit');
 console.log(profile,"orbit OK");const first=await state();await p.waitForFunction(t=>__issState().ms-t>1500,first.ms);const moving=await state();assert(Math.hypot(...moving.position.map((v,i)=>v-first.position[i]))/s.unit>5);const movementKmS=Math.hypot(...moving.iss.position.map((v,i)=>v-first.iss.position[i]))/((moving.ms-first.ms)/1000);assert(movementKmS>7&&movementKmS<8,'ISS moves relative to Earth at orbital speed');
 console.log(profile,'movement OK');await p.locator('#panelToggle').click();await p.locator('#issSky').click();await p.waitForFunction(()=>__issState().issSky);s=await state();assert(Math.hypot(...s.eye.map((v,i)=>v-s.position[i]))<1e-10);assert.equal(s.ground,false);assert.equal(s.surfaceMode,false);assert(Math.abs(s.earthPixel[0]-innerWidthFallback(profile)/2)<2);
 console.log(profile,'sky OK');await p.locator('#panelToggle').click();await shot('sky');
 const ph=s.cam.tph;await p.mouse.move(profile==='PC'?700:180,150);await p.mouse.down();await p.mouse.move(profile==='PC'?850:280,230,{steps:8});await p.mouse.up();await p.waitForFunction(ph=>Math.abs(__issState().cam.tph-ph)>.05,ph);
 await p.locator('#panelToggle').click();await p.locator('#issEarth').click();await p.waitForFunction(()=>{let s=__issState();return s.earthPixel&&Math.abs(s.earthPixel[0]-innerWidth/2)<2&&Math.abs(s.earthPixel[1]-innerHeight/2)<2});
 await p.locator('#panelToggle').click();await shot('horizon');await p.locator('#panelToggle').click();console.log(profile,'drag OK');await p.locator('#dateIn').fill('2018-01-01T09:00');await p.locator('#dateIn').press('Enter');await p.waitForFunction(()=>!__issState().iss);assert.equal((await state()).position,null);assert((await p.locator('#issStatus').textContent()).includes('ISSは非表示'));await p.locator('#issSync').click();await p.waitForFunction(()=>!!__issState().iss);
 await p.locator('[data-sc="0"]').click();assert.equal((await state()).scaleMode,2);
 await p.locator('#issLeave').click();s=await state();assert.equal(s.followISS,false);assert.equal(s.scaleMode,before.scaleMode);assert.equal(s.speed,before.speed);assert.equal(s.nowLock,before.nowLock);
 await p.selectOption('#moonTravelSelect','iss');await p.waitForFunction(()=>!!__issState().iss);await p.locator('[data-fo="5"]').click();assert.equal((await state()).followISS,false);assert.equal((await state()).scaleMode,1);await p.selectOption('#moonTravelSelect','5:0');await p.locator('#bSurface').click();assert((await state()).surfaceMode);await p.locator('#bOrbitView').click();assert.equal((await state()).scaleMode,1);
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 results.push({profile,distanceKm:distance,altitudeKm:moving.iss.altitude,speedKmS:moving.iss.speed,movementKmS,source:moving.source,errors,restoration:true,staleHidden:true,ground:false});await p.close();
}
 await browser.close();fs.writeFileSync(live?'/tmp/iss-live-browser-results.json':'/tmp/iss-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
function innerWidthFallback(profile){return profile==='PC'?1000:profile.endsWith('portrait')?390:844;}

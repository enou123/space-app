const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium,devices}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});const reports=[];
 try{for(const profile of (process.env.SPACE_APP_TEST_PROFILE?[process.env.SPACE_APP_TEST_PROFILE]:['PC','iPhone'])){
  const p=await browser.newPage(profile==='PC'?{viewport:{width:1000,height:760}}:{...devices['iPhone 13'],viewport:process.env.SPACE_APP_TEST_ORIENTATION==='landscape'?{width:844,height:390}:{width:390,height:844},deviceScaleFactor:1});
  p.setDefaultTimeout(60000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
  const url=process.env.SPACE_APP_TEST_URL||'http://127.0.0.1:8770/';
  const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace('  requestAnimationFrame(frame);\n})();',fs.readFileSync(path.join(__dirname,'browser-observability.js'),'utf8')+'\n  requestAnimationFrame(frame);\n})();');
  await p.addInitScript(()=>{localStorage.setItem('ssm_lite','1');window.__frames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf.call(window,t=>{__frames++;cb(t)});});
  await p.route(url,r=>r.fulfill({contentType:'text/html',body:source}));await p.goto(url);
  const frame=async()=>{const n=await p.evaluate(()=>__frames);await p.waitForFunction(n=>__frames>=n+2,n)};
  const state=()=>p.evaluate(()=>__tourState());
  const click=async selector=>{if(profile==='iPhone')await p.locator(selector).tap();else await p.locator(selector).click();await frame()};
  const select=async value=>{await p.evaluate(value=>{const el=document.querySelector('#celestialShowSelect');el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))},value);await frame()};
  const step=async i=>{await p.evaluate(i=>__featureStep(i),i);await frame()};
  const seek=async t=>{await p.evaluate(t=>__showsSeek(t),t);await frame();const s=await state();assert(s.finite&&!s.error);return s};
  await click('#welcomeGuide');assert.equal((await state()).feature.length,14);
  // Observe the immediate UI state before software GPU frames consume the close timer.
  assert.equal(await p.evaluate(()=>{__featureStep(3);return __tourState().panelHidden;}),false);await p.waitForTimeout(5100);
  assert.equal((await state()).panelHidden,profile==='iPhone');
  if(profile==='iPhone'){await click('#panelToggle');await p.waitForTimeout(1000);assert.equal((await state()).panelHidden,false);}
  await p.evaluate(()=>{__featureStep(2);document.querySelector('#panel').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});await p.waitForTimeout(5100);assert.equal((await state()).panelHidden,false,'Interaction keeps panel open');
  // Every feature scene still runs without rendering errors.
  for(let i=0;i<14;i++){await step(i);const s=await state();assert(s.finite&&!s.error&&!errors.length,profile+' feature '+i);}
  await step(3);await p.evaluate(()=>document.querySelector('[data-stereo="cross"]').click());
  await step(4);assert.equal((await state()).stereoMode,'parallel');await p.waitForTimeout(5100);assert.equal((await state()).panelHidden,true);
  const oldGap=(await state()).parallelGap;
  // Keep pointer-down and click together so slow GPU frames cannot fold the control in between.
  const changedGap=await p.evaluate(()=>{
   document.querySelector('#parallelGapToggle').click();
   const down=document.querySelector('#parallelGapDown');
   down.dispatchEvent(new PointerEvent('pointerdown',{pointerId:91,bubbles:true}));
   down.click();window.dispatchEvent(new PointerEvent('pointerup',{pointerId:91,bubbles:true}));
   return __tourState().parallelGap;
  });await frame();assert.equal(changedGap,oldGap-5);
  await p.screenshot({path:'/tmp/tour-'+profile+'-stereo.png'});
  const earth=(await state()).earth;await frame();assert.notDeepEqual((await state()).earth,earth,'Planets revolve in the stereo scene');
  await step(5);assert.equal((await state()).stereoMode,'cross');assert.equal((await state()).parallelGap,oldGap);
  await click('#gEnd');await click('#welcomeExplore');await p.evaluate(()=>document.querySelector('[data-stereo="normal"]').click());
  const options=await p.locator('#celestialShowSelect').evaluate(e=>[...e.querySelectorAll('optgroup')].map(g=>({label:g.label,options:[...g.children].map(o=>({value:o.value,title:o.textContent.replace(/^\d+\. /,'')}))})));
  assert.equal(options[0].options.length,16);assert.equal(options[1].options.length,19);assert.equal(new Set(options.flatMap(g=>g.options.map(o=>o.value))).size,35);
  for(const group of options)for(const option of group.options){await select(option.value);assert.equal(await p.locator('#gTitle').textContent(),option.title);const s=await state();assert(s.finite&&!s.error&&!errors.length,option.title);}
  await click('#gEnd');await click('#welcomeExplore');await p.evaluate(()=>{document.querySelector('[data-sc="1"]').click();document.querySelector('[data-ms="4"]').click()});
  await select('halley');assert.equal((await state()).scaleMode,2);assert.equal((await state()).moonScale,1);
  const samples=[];
  for(const t of [0,6,12,20,26,32,36,40,44,47,52,58,66,76,84]){
   const s=await seek(t);samples.push({t,r:s.halley.r,length:s.halley.length});
   if(t>=44&&t<=52){for(const point of s.points){assert(point&&point[0]>0&&point[0]<await p.evaluate(()=>innerWidth)&&point[1]>0&&point[1]<await p.evaluate(()=>innerHeight),'Whole comet fits at '+t+': '+JSON.stringify(s.points));}
    if(profile==='iPhone'){const card=await p.locator('#guide').boundingBox(),head=s.points[0];assert(!(head[0]>card.x&&head[0]<card.x+card.width&&head[1]>card.y&&head[1]<card.y+card.height),'Comet head is not hidden by the guide card');}
   }
   if([12,47,84].includes(t))await p.screenshot({path:'/tmp/tour-'+profile+'-halley-'+t+'.png'});
  }
  const closest=samples.find(s=>s.t===47);assert(Math.abs(closest.r-.586)<.002);assert(closest.length>samples[0].length*50&&closest.length>samples.at(-1).length*50,'Tail grows and shrinks');
  await seek(47);await click('#gShowPause');const time=(await p.evaluate(()=>__showsState())).show.t;await frame();assert((await p.evaluate(()=>__showsState())).show.t>time,'Show plays');await click('#gShowPause');const paused=(await state()).years;await frame();assert.equal((await state()).years,paused);
  await click('#gShowReplay');assert((await p.evaluate(()=>__showsState())).show.t<5);await click('#gEnd');assert.equal((await state()).scaleMode,1);assert.equal((await state()).moonScale,4);
  await click('#welcomeExplore');await p.waitForTimeout(5100);assert.equal((await state()).panelHidden,false,'No stale tour close timer');
  assert.equal(errors.length,0,JSON.stringify(errors));assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  reports.push({profile,features:14,ground:16,space:19,samples,errors});console.log(JSON.stringify(reports.at(-1)));await p.close();
 }}finally{await browser.close();}
 fs.writeFileSync('/tmp/tours-and-halley-results.json',JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1)});

// Regression: the back of Saturn leaked through its bright face during the plume fly-through.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium,devices}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
    const url=process.env.SPACE_APP_TEST_URL||'http://127.0.0.1:8770/';
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let source=fs.readFileSync(process.env.SPACE_APP_TEST_SOURCE||path.join(__dirname,'../index.html'),'utf8');
    source=source.replace('  requestAnimationFrame(frame);\n})();',fs.readFileSync(path.join(__dirname,'browser-observability.js'),'utf8')+'\n  requestAnimationFrame(frame);\n})();');
    await page.addInitScript(()=>{localStorage.setItem('ssm_lite','1');window.__depthFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf.call(window,t=>{__depthFrames++;cb(t)});});
    await page.route(url,r=>r.fulfill({contentType:'text/html',body:source}));await page.goto(url);
    await page.locator('#welcomeExplore').click();await page.selectOption('#celestialShowSelect','enceladus');
    const samples=[];let fixedYears;
    for(const t of [26,28,30,31.5,32,34,36]){
      const n=await page.evaluate(t=>{__showsSeek(t);return __depthFrames},t);
      await page.waitForFunction(n=>__depthFrames>=n+2,n);
      const state=await page.evaluate(()=>__showsState());
      assert(state.finite&&!state.error);fixedYears??=state.years;assert.equal(state.years,fixedYears);
      const dark=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
        const c=document.querySelector('canvas'),g=c.getContext('webgl');let dark=0;
        // A patch inside the illuminated hemisphere, away from the limb and ring shadow.
        for(let x=88;x<99;x++)for(let y=18;y<28;y++){
          const p=new Uint8Array(4);g.readPixels(Math.floor(c.width*x/100),Math.floor(c.height*(1-y/100)),1,1,g.RGBA,g.UNSIGNED_BYTE,p);
          if(Math.max(p[0],p[1],p[2])<32)dark++;
        }resolve(dark);
      })));
      samples.push({t,dark});assert.equal(dark,0,'Black triangles on Saturn at '+t+' seconds');
    }
    await page.screenshot({path:'/tmp/saturn-depth-fixed.png'});assert.equal(errors.length,0,JSON.stringify(errors));console.log(JSON.stringify({samples,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

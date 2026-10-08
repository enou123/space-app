/* ISS orbit/data boundary. satellite.js 6.0.1 supplies Vallado SGP4 (MIT). */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./vendor/satellite.min.js'));
  else root.ISSOrbit=factory(root.satellite);
})(typeof globalThis==='object'?globalThis:this,function(sat){
  'use strict';
  const DAY=86400000, MAX_AGE=3*DAY, URL='https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
  const KEY='space-app.iss.omm.v1';
  const SNAPSHOT='https://raw.githubusercontent.com/enou123/space-app/iss-data/latest.json';
  function validate(data){
    const record=data?.elements;
    if(!record||Number(record.NORAD_CAT_ID)!==25544) throw Error('NORAD 25544 required');
    const epoch=Date.parse(record.EPOCH+'Z'), fetched=Date.parse(data.fetchedAt);
    if(!Number.isFinite(epoch)||!Number.isFinite(fetched)) throw Error('Invalid timestamp');
    const ranges={MEAN_MOTION:[14,17],ECCENTRICITY:[0,.05],INCLINATION:[45,60],RA_OF_ASC_NODE:[0,360],ARG_OF_PERICENTER:[0,360],MEAN_ANOMALY:[0,360],BSTAR:[-.1,.1],MEAN_MOTION_DOT:[-1,1],MEAN_MOTION_DDOT:[-1,1]};
    for(const [key,[lo,hi]] of Object.entries(ranges)){
      if(record[key]===null||record[key]===''||!Number.isFinite(Number(record[key]))||Number(record[key])<lo||Number(record[key])>hi) throw Error('Invalid '+key);
    }
    if(record.MEAN_ELEMENT_THEORY&&record.MEAN_ELEMENT_THEORY!=='SGP4') throw Error('Unsupported theory');
    const satrec=sat.json2satrec(record);
    if(satrec.error) throw Error('Invalid SGP4 record');
    return {...data,epoch,satrec};
  }
  function state(data,ms){
    if(!data||!Number.isFinite(ms)||Math.abs(ms-data.epoch)>MAX_AGE) return null;
    const pv=sat.propagate(data.satrec,new Date(ms));
    if(!pv?.position||!pv.velocity||data.satrec.error) return null;
    const position=[pv.position.x,pv.position.y,pv.position.z],velocity=[pv.velocity.x,pv.velocity.y,pv.velocity.z];
    if(![...position,...velocity].every(Number.isFinite)) return null;
    const ecef=sat.eciToEcf(pv.position,sat.gstime(new Date(ms)));
    const geo=sat.eciToGeodetic(pv.position,sat.gstime(new Date(ms)));
    if(geo.height<100||geo.height>1000) return null;
    return {position,velocity,ecef:[ecef.x,ecef.y,ecef.z],altitude:geo.height,latitude:geo.latitude*180/Math.PI,longitude:geo.longitude*180/Math.PI,speed:Math.hypot(...velocity),ageDays:(ms-data.epoch)/DAY};
  }
  // ECEF x=Greenwich, y=90°E, z=north. Match the app's GMST Earth basis,
  // ecliptic Y-up convention, and its solar-longitude alignment (rot).
  function worldOffset(ecef,ms,rot=v=>v){
    const jd=ms/DAY+2440587.5,ra=(280.46061837+360.98564736629*(jd-2451545))*Math.PI/180,ep=23.4392911*Math.PI/180;
    const X=ecef[0]*Math.cos(ra)-ecef[1]*Math.sin(ra),Y=ecef[0]*Math.sin(ra)+ecef[1]*Math.cos(ra),Z=ecef[2];
    return rot([X,-Y*Math.sin(ep)+Z*Math.cos(ep),Y*Math.cos(ep)+Z*Math.sin(ep)]);
  }
  class Store{
    constructor({fetcher=globalThis.fetch?.bind(globalThis),storage=globalThis.localStorage,now=Date.now,onChange=()=>{}}={}){
      this.fetcher=fetcher;this.storage=storage;this.now=now;this.onChange=onChange;this.data=null;this.source='none';this.busy=false;this.failed=false;this.lastAttempt=-Infinity;
      try{this.accept(JSON.parse(storage?.getItem(KEY)),'cache');}catch(e){}
    }
    accept(raw,source){
      const data=validate(raw);
      if(data.epoch>this.now()+DAY||Date.parse(data.fetchedAt)>this.now()+60000) throw Error('Future data');
      if(this.data&&data.epoch<this.data.epoch)return false;
      this.data=data;this.source=source;this.onChange();return true;
    }
    async request(url,json=true){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{const r=await this.fetcher(url,{signal:controller.signal,cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);return json?await r.json():await r.text();}finally{clearTimeout(timer);}
    }
    async refresh(force=false){
      if(this.busy||(!force&&this.now()-this.lastAttempt<3600000))return;
      this.busy=true;this.lastAttempt=this.now();this.failed=false;this.onChange();
      // Scheduled GitHub Actions snapshot also works when upstream rejects CORS.
      try{this.accept(await this.request(SNAPSHOT),'snapshot');}catch(e){}
      try{
        const rows=await this.request(URL);
        const elements=rows.find(r=>Number(r.NORAD_CAT_ID)===25544);
        this.accept({elements,fetchedAt:new Date(this.now()).toISOString()},'live');
      }catch(e){this.failed=true;}
      if(this.data)try{this.storage?.setItem(KEY,JSON.stringify({elements:this.data.elements,fetchedAt:this.data.fetchedAt}));}catch(e){}
      this.busy=false;this.onChange();
    }
  }
  return {DAY,MAX_AGE,URL,KEY,SNAPSHOT,validate,state,worldOffset,Store};
});

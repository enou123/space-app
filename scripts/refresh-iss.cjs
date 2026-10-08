// Run in GitHub Actions (or a network-enabled workstation); never fabricate elements.
const fs=require('node:fs'),O=require('../assets/iss-orbit.js');
(async()=>{
  const response=await fetch(O.URL,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('CelesTrak HTTP '+response.status);
  const rows=await response.json(),elements=rows.find(r=>Number(r.NORAD_CAT_ID)===25544);
  const raw={elements,fetchedAt:new Date().toISOString()},data=O.validate(raw);
  if(Math.abs(Date.now()-data.epoch)>O.MAX_AGE)throw Error('CelesTrak elements outside validity window');
  if(!O.state(data,Date.now()))throw Error('CelesTrak elements failed propagation');
  fs.writeFileSync(process.argv[2]||'/tmp/iss-latest.json',JSON.stringify(raw,null,2)+'\n');
  console.log('ISS OMM epoch '+elements.EPOCH+'Z; fetched '+raw.fetchedAt);
})().catch(e=>{console.error(e.message);process.exitCode=1;});

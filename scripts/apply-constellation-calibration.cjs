/* Apply exported placement values only; never rebuild or change image files. */
const fs=require('fs'),path=require('path'),P=require('../assets/constellations/placement.js');
function apply(exported,index,layout){
 if(exported.version!==1||exported.offsetUnit!=='gnomonic-degrees'||!exported.constellations||Array.isArray(exported.constellations))throw Error('Invalid calibration format');
 if(exported.baseVersion!==index.version)throw Error('Base version differs: export again from the current calibrator');
 const entries=Object.entries(exported.constellations);if(!entries.length)throw Error('No calibration values');
 const known=new Set(index.items.map(i=>i.code)),values={};
 for(const [code,value]of entries){if(!known.has(code)||!layout.items.some(i=>i.code===code))throw Error('Unknown constellation: '+code);values[code]=P.validate(value);}
 const update=data=>({...data,placement:'three-star-similarity-with-adjustments',items:data.items.map(i=>values[i.code]?{...i,adjustment:values[i.code]}:i)});
 const next=update(index);next.version='blue-nebula-calibrated-v2';
 const nextLayout=update(layout);nextLayout.version=next.version;
 return {index:next,layout:nextLayout,calibration:{...exported,baseVersion:next.version,constellations:values}};
}
module.exports={apply};
if(require.main===module){
 try{const folder=path.join(__dirname,'../assets/constellations'),read=name=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
 const result=apply(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),read('index.json'),read('layout.json'));
 // All validation and serialization finish before any write.
 const outputs=Object.entries(result).map(([name,value])=>[path.join(folder,name+'.json'),JSON.stringify(value,null,2)+'\n']);
 for(const[file,value]of outputs)fs.writeFileSync(file,value);console.log('Applied '+Object.keys(result.calibration.constellations).join(', '));
 }catch(e){console.error(e.message);process.exitCode=1;}
}

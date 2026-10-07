/* Shared by the sky renderer and the calibration tool. No rendering or camera state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ConstellationPlacement=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const DEG=Math.PI/180,DEFAULT=Object.freeze({scale:1,rotationDeg:0,offsetX:0,offsetY:0,flipX:false});
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),times=(a,s)=>a.map(x=>x*s),norm=a=>{const n=Math.hypot(...a);if(n<1e-12)throw Error('Degenerate sky direction');return times(a,1/n);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function validate(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('配置値はオブジェクトで指定してください');
  const a={...DEFAULT,...value};
  for(const k of ['scale','rotationDeg','offsetX','offsetY'])if(typeof a[k]!=='number'||!Number.isFinite(a[k]))throw Error(k+' は有限の数値で指定してください');
  if(a.scale<.05||a.scale>5||Math.abs(a.offsetX)>80||Math.abs(a.offsetY)>80||Math.abs(a.rotationDeg)>3600||typeof a.flipX!=='boolean')throw Error('配置値が調整可能な範囲を超えています');
  a.rotationDeg=((a.rotationDeg+180)%360+360)%360-180;
  return Object.fromEntries(Object.keys(DEFAULT).map(k=>[k,a[k]]));
 }
 function frame(anchors){
  if(!Array.isArray(anchors)||anchors.length!==3)throw Error('Three guide anchors are required');
  const [a,b]=anchors,center=norm(anchors.reduce((p,a)=>add(p,a.direction),[0,0,0]));
  const delta=sub(b.direction,a.direction),right=norm(sub(delta,times(center,dot(delta,center)))),up=norm(cross(center,right));
  const target=anchors.map(a=>{const d=dot(a.direction,center);if(d<=0)throw Error('Guide anchors exceed a hemisphere');return[dot(a.direction,right)/d,dot(a.direction,up)/d];});
  const mid=[0,1].map(k=>anchors.reduce((s,a)=>s+a.uv[k],0)/3),offset=[0,1].map(k=>target.reduce((s,t)=>s+t[k],0)/3);
  const area=p=>(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
  const sourceArea=area(anchors.map(a=>a.uv));if(Math.abs(sourceArea)<1e-8)throw Error('Invalid constellation guide points');
  const mirror=sourceArea*area(target)<0?-1:1;let A=0,B=0,S=0;
  anchors.forEach((a,i)=>{const x=a.uv[0]-mid[0],y=(a.uv[1]-mid[1])*mirror,tx=target[i][0]-offset[0],ty=target[i][1]-offset[1];A+=x*tx+y*ty;B+=x*ty-y*tx;S+=x*x+y*y;});
  const f={center,right,up,mid,offset,mirror,A:A/S,B:B/S,scale:Math.hypot(A,B)/S};
  // North is the celestial north pole projected onto this same tangent plane.
  // West is screen-right in the app (its sky camera uses M4.flip); east is left.
  const pole=[0,Math.cos(23.4392911*DEG),Math.sin(23.4392911*DEG)];
  f.skyUp=norm(sub(pole,times(center,dot(pole,center))));f.skyRight=norm(cross(f.skyUp,center));
  const raw=(u,v)=>{const du=u-mid[0],dv=(v-mid[1])*mirror,x=f.A*du-f.B*dv+offset[0],y=f.B*du+f.A*dv+offset[1],w=add(times(right,x),times(up,y));return[dot(w,f.skyRight),dot(w,f.skyUp)];};
  const position=raw(.5,.5);f.baseMap={center,right:f.skyRight,up:f.skyUp,position,u:sub(raw(1,.5),position).map(x=>x*2),v:sub(raw(.5,1),position).map(x=>x*2)};
  return f;
 }
 function map(f,value){
  const a=validate(value),base=f.baseMap,t=a.rotationDeg*DEG,c=Math.cos(t)*a.scale,s=Math.sin(t)*a.scale;
  const rotate=v=>[c*v[0]-s*v[1],s*v[0]+c*v[1]];
  return {...base,position:add(base.position,[Math.tan(a.offsetX*DEG),Math.tan(a.offsetY*DEG)]),u:rotate(times(base.u,a.flipX?-1:1)),v:rotate(base.v)};
 }
 const point=(m,u,v)=>add(m.position,add(times(m.u,u-.5),times(m.v,v-.5)));
 const directionFromMap=(m,u,v)=>{const p=point(m,u,v);return norm(add(m.center,add(times(m.right,p[0]),times(m.up,p[1]))));};
 const direction=(f,u,v,a)=>directionFromMap(a?map(f,a):f.baseMap,u,v);
 function project(f,d){const w=dot(d,f.center);if(w<=0)return null;return[dot(d,f.skyRight)/w,dot(d,f.skyUp)/w];}
 const angularError=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(norm(a),norm(b)))))/DEG;
 function errors(f,a,guides,stars){const m=map(f,a);return guides.map(g=>{const st=stars.find(s=>s.n===g.star);if(!st)throw Error('Unknown guide star: '+g.star);return{...g,errorDeg:angularError(directionFromMap(m,...g.uv),st.p)};});}
 function fitGuides(f,guides,stars){
  if(guides.length<2)throw Error('主要星の対応点を2点以上指定してください');
  const targets=guides.map(g=>{const st=stars.find(s=>s.n===g.star);if(!st)throw Error('Unknown guide star');const p=project(f,norm(st.p));if(!p)throw Error('Guide lies beyond the tangent plane');return p;});
  const weights=guides.map(g=>g.weight||1),W=weights.reduce((a,b)=>a+b),mean=p=>p.reduce((s,a,i)=>add(s,times(a,weights[i])),[0,0]).map(x=>x/W);let best=null;
  for(const flipX of [false,true]){
   const base=map(f,{flipX}),points=guides.map(g=>point(base,...g.uv)),pmean=mean(points),qmean=mean(targets);let A=0,B=0,S=0;
   points.forEach((p,i)=>{const d=sub(p,pmean),q=sub(targets[i],qmean),w=weights[i];A+=w*(d[0]*q[0]+d[1]*q[1]);B+=w*(d[0]*q[1]-d[1]*q[0]);S+=w*dot(d,d);});
   if(S<1e-12)throw Error('Guide points coincide');A/=S;B/=S;
   const R=p=>[A*p[0]-B*p[1],B*p[0]+A*p[1]],position=add(qmean,R(sub(base.position,pmean))),offset=sub(position,base.position);
   if(Math.hypot(A,B)<.05||Math.hypot(A,B)>5||Math.abs(Math.atan(offset[0])/DEG)>80||Math.abs(Math.atan(offset[1])/DEG)>80)continue;
   const adjustment=validate({scale:Math.hypot(A,B),rotationDeg:Math.atan2(B,A)/DEG,offsetX:Math.atan(offset[0])/DEG,offsetY:Math.atan(offset[1])/DEG,flipX});
   const fitted=map(f,adjustment),loss=guides.reduce((s,g,i)=>s+weights[i]*dot(sub(point(fitted,...g.uv),targets[i]),sub(point(fitted,...g.uv),targets[i])),0)/W;
   if(!best||loss<best.loss-1e-12)best={adjustment,loss,errors:errors(f,adjustment,guides,stars)};
  }
  if(!best)throw Error("対応点から調整可能な配置を求められません");
  return best;
 }
 return {DEFAULT,validate,frame,map,point,direction,directionFromMap,project,fitGuides,errors,angularError};
});

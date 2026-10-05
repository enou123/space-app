/* Geometry in planet-radius units, independent of the display scale.
   Positions supplied by the app are approximate ephemerides, not event predictions. */
(function (root) {
  'use strict';
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const length=a=>Math.hypot(...a);
  const clamp=x=>Math.max(-1,Math.min(1,x));
  function diskVisibility(d,s,r){
    if(s<=1e-12) return d<r?0:1;
    if(d>=s+r) return 1;
    if(d<=Math.abs(s-r)) return r>=s?0:1-r*r/(s*s);
    const a=Math.acos(clamp((d*d+s*s-r*r)/(2*d*s)));
    const b=Math.acos(clamp((d*d+r*r-s*s)/(2*d*r)));
    const area=s*s*a+r*r*b-0.5*Math.sqrt(Math.max(0,(-d+s+r)*(d+s-r)*(d-s+r)*(d+s+r)));
    return Math.max(0,Math.min(1,1-area/(Math.PI*s*s)));
  }
  function shadowLight(point,occluder,r,light,sunAngle){
    const v=sub(occluder,point),t=dot(v,light);
    return t<=0?1:diskVisibility(length(v.map((x,i)=>x-t*light[i])),t*Math.tan(sunAngle),r);
  }
  function moonEvents(m,earth,light,sunAngle){
    const z=dot(m.position,earth),miss=length(m.position.map((x,i)=>x-z*earth[i]));
    const occulted=z<0&&miss<1+m.radius,transit=z>0&&miss<1+m.radius;
    const illumination=shadowLight(m.position,[0,0,0],1,light,sunAngle);
    const along=dot(m.position,light),disc=along*along-dot(m.position,m.position)+1;
    let shadow=null;
    if(along>0&&disc>=0){const t=along-Math.sqrt(disc);if(t>0)shadow=m.position.map((x,i)=>x-t*light[i]);}
    return {transit,occulted,illumination,shadow,shadowVisible:!!shadow&&dot(shadow,earth)>0};
  }
  const shadowGLSL=`
    uniform float uJMode,uJSunAngle; uniform vec3 uJLight;
    uniform vec4 uJMoon0,uJMoon1,uJMoon2,uJMoon3,uJReceiver;
    float diskLight(float d,float s,float r){
      if(s<0.0000001) return step(r,d);
      if(d>=s+r) return 1.0;
      if(d<=abs(s-r)) return r>=s?0.0:1.0-r*r/(s*s);
      float a=acos(clamp((d*d+s*s-r*r)/(2.0*d*s),-1.0,1.0));
      float b=acos(clamp((d*d+r*r-s*s)/(2.0*d*r),-1.0,1.0));
      float area=s*s*a+r*r*b-0.5*sqrt(max(0.0,(-d+s+r)*(d+s-r)*(d-s+r)*(d+s+r)));
      return clamp(1.0-area/(3.14159265*s*s),0.0,1.0);
    }
    float moonLight(vec3 q,vec4 m){
      vec3 v=m.xyz-q;float t=dot(v,uJLight);
      if(t<=0.0) return 1.0;
      return diskLight(length(v-t*uJLight),t*tan(uJSunAngle),m.w);
    }
    float jovianLight(vec3 n){
      if(uJMode<0.5) return 1.0;
      if(uJMode>1.5) return moonLight(uJReceiver.xyz+n*uJReceiver.w,vec4(0.0,0.0,0.0,1.0));
      return min(min(moonLight(n,uJMoon0),moonLight(n,uJMoon1)),min(moonLight(n,uJMoon2),moonLight(n,uJMoon3)));
    }`;
  const api={diskVisibility,shadowLight,moonEvents,shadowGLSL};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CelestialPhysics=Object.freeze(api);
})(typeof window==='object'?window:globalThis);

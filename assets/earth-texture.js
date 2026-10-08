(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EarthTexture=factory();})(globalThis,function(){
  'use strict';
  function resolution(request,{maxTextureSize=2048,lite=false,mobile=false,memory=4,cores=4}={},near=false){
    let cap=Math.min(maxTextureSize,lite||memory<=2?2048:mobile||memory<8||cores<8?4096:8192);
    cap=2**Math.floor(Math.log2(Math.max(1,cap)));
    const wanted=request==='auto'?(near?4096:2048):Number(request);
    return Math.min(cap,[2048,4096,8192].includes(wanted)?wanted:2048);
  }
  // Keeps the original 2048 texture as a permanent fallback. At most one high
  // resolution texture is retained. Never mutates the live texture during upload.
  class Manager{
    constructor({gl,base,getBaseWidth,onChange=()=>{},makeImage=()=>new Image()}){
      Object.assign(this,{gl,base,getBaseWidth,onChange,makeImage});this.texture=base;this.width=0;this.target=0;this.sequence=0;this.failed=false;this.busy=false;this.high=null;
    }
    select(width,force=false){
      if(this.target===width&&!force)return;
      this.target=width;const sequence=++this.sequence;this.failed=false;this.busy=width>2048;
      if(width<=2048){this.useBase();this.onChange();return;}
      this.onChange();const img=this.makeImage();
      img.onload=()=>{
        if(sequence!==this.sequence)return;
        const gl=this.gl,t=gl.createTexture();
        try{
          if(img.width!==width||img.height!==width/2)throw Error('Unexpected texture dimensions');
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
          const aniso=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
          if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
          if(gl.getError()!==gl.NO_ERROR)throw Error('Texture upload failed');
          if(this.high)gl.deleteTexture(this.high);this.high=t;this.texture=t;this.width=width;this.busy=false;
        }catch(e){gl.deleteTexture(t);this.failed=true;this.useBase();}
        finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.activeTexture(gl.TEXTURE0);this.onChange();}
      };
      img.onerror=()=>{if(sequence!==this.sequence)return;this.failed=true;this.useBase();this.onChange();};
      img.src='assets/textures/earth-blue-marble-'+width+'.jpg';
    }
    useBase(){this.texture=this.base;this.width=this.getBaseWidth();this.busy=false;if(this.high){this.gl.deleteTexture(this.high);this.high=null;}}
  }
  return {resolution,Manager};
});

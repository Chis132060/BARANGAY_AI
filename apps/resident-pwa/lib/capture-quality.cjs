'use strict';
// Heuristic warnings only; cannot establish authenticity, glare or sharpness conclusively.
function assessCapture({width,height,pixels}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!pixels||pixels.length<width*height*4)throw new Error('Invalid image sample');
 const stride=Math.max(1,Math.floor(Math.sqrt(width*height/20000)));
 let count=0,dark=0,bright=0,edgeSum=0,edgeCount=0;
 const luma=(i)=>(pixels[i]*299+pixels[i+1]*587+pixels[i+2]*114)/1000;
 for(let y=0;y<height;y+=stride)for(let x=0;x<width;x+=stride){
   const i=(y*width+x)*4,v=luma(i);count++;
   if(v<35)dark++;if(v>245)bright++;
   if(x+stride<width&&y+stride<height){
     const right=luma((y*width+x+stride)*4),below=luma(((y+stride)*width+x)*4);
     edgeSum+=Math.abs(v-right)+Math.abs(v-below);edgeCount+=2;
   }
 }
 const warnings=[];
 if(width<640||height<400)warnings.push('Image resolution is too low; retake with the full ID visible.');
 if(dark/count>0.65)warnings.push('Image may be too dark.');
 if(bright/count>0.50)warnings.push('Image may have excessive glare or overexposure.');
 if(edgeCount&&edgeSum/edgeCount<5)warnings.push('Image may be blurry or lack readable detail.');
 return {warnings,metrics:{darkRatio:dark/count,brightRatio:bright/count,edgeContrast:edgeCount?edgeSum/edgeCount:0}};
}
module.exports={assessCapture};

const test=require('node:test');
const assert=require('node:assert/strict');
const {assessCapture}=require('../lib/capture-quality.cjs');
function solid(width,height,v){const p=new Uint8ClampedArray(width*height*4);for(let i=0;i<p.length;i+=4){p[i]=p[i+1]=p[i+2]=v;p[i+3]=255;}return p;}
test('warns for dark and detail-free image',()=>{const r=assessCapture({width:800,height:500,pixels:solid(800,500,0)});assert.ok(r.warnings.some(w=>w.includes('dark')));assert.ok(r.warnings.some(w=>w.includes('blurry')));});
test('warns for low resolution',()=>assert.ok(assessCapture({width:20,height:20,pixels:solid(20,20,120)}).warnings.some(w=>w.includes('resolution'))));
test('rejects invalid sample',()=>assert.throws(()=>assessCapture({width:800,height:500,pixels:[]}),/Invalid/));

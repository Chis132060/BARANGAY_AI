'use strict';
// Lightweight, dependency-free header/dimension validation. Never treats metadata as proof of ID authenticity.
function inspectImage(bytes, declaredType) {
 const b=Buffer.from(bytes);
 if(b.length<32 || b.length>5*1024*1024) throw new Error('ID image must be between 32 bytes and 5MB');
 let type,width,height;
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
   type='image/png'; width=b.readUInt32BE(16);height=b.readUInt32BE(20);
 } else if(b[0]===0xff && b[1]===0xd8 && b[2]===0xff) {
   type='image/jpeg';
   let offset=2;
   while(offset+4<=b.length){
     if(b[offset]!==0xff) break;
     const marker=b[offset+1];offset+=2;
     if(marker===0xd9||marker===0xda) break;
     if(marker===0x01||marker>=0xd0&&marker<=0xd7) continue;
     if(offset+2>b.length)break;
     const size=b.readUInt16BE(offset);
     if(size<2||offset+size>b.length)break;
     if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
       if(size<7)break;
       height=b.readUInt16BE(offset+3);width=b.readUInt16BE(offset+5);break;
     }
     offset+=size;
   }
 } else if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP') {
   type='image/webp';
   const kind=b.toString('ascii',12,16);
   if(kind==='VP8X'&&b.length>=30){width=1+b.readUIntLE(24,3);height=1+b.readUIntLE(27,3);}
   else if(kind==='VP8L'&&b.length>=25){const n=b.readUInt32LE(21);width=1+(n&0x3fff);height=1+((n>>>14)&0x3fff);}
   else if(kind==='VP8 '&&b.length>=30&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a){width=b.readUInt16LE(26)&0x3fff;height=b.readUInt16LE(28)&0x3fff;}
 }
 if(!type||type!==declaredType)throw new Error('ID image bytes do not match the selected image format');
 if(!width||!height||width<640||height<400||width>10000||height>10000)throw new Error('ID image resolution is unsupported or too low');
 if(width*height>40000000)throw new Error('ID image dimensions exceed the safety limit');
 return {type,width,height};
}
module.exports={inspectImage};

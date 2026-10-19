const test=require('node:test');
const assert=require('node:assert/strict');
const {inspectImage}=require('../lib/id-image-validation.cjs');
test('valid PNG dimensions are accepted',()=>{
 const b=Buffer.alloc(40);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(800,16);b.writeUInt32BE(600,20);
 assert.deepEqual(inspectImage(b,'image/png'),{type:'image/png',width:800,height:600});
});
test('reject MIME spoofing and low resolution',()=>{
 const b=Buffer.alloc(40);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(200,16);b.writeUInt32BE(150,20);
 assert.throws(()=>inspectImage(b,'image/jpeg'),/match/);
 assert.throws(()=>inspectImage(b,'image/png'),/resolution/);
});

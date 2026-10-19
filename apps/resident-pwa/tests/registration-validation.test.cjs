const test=require('node:test');
const assert=require('node:assert/strict');
const {validateRegistrationInput,validateIdFile}=require('../lib/registration-validation.cjs');
const valid={firstName:'Maria',lastName:'Santos',email:'maria@example.com',contactNumber:'09171234567',birthDate:'1995-02-28',purok:'Purok 1',street:'Rizal Street',idType:'Postal ID',password:'long-and-unique-password'};
test('valid registration fields pass',()=>assert.deepEqual(validateRegistrationInput(valid),[]));
test('reject malformed phone, date, ID type and weak password',()=>{
 const errors=validateRegistrationInput({...valid,contactNumber:'123',birthDate:'2024-02-30',idType:'Fake',password:'short'});
 assert.equal(errors.length,4);
});
test('reject invalid image metadata',()=>{
 assert.deepEqual(validateIdFile({type:'image/jpeg',size:1000}),[]);
 assert.equal(validateIdFile({type:'application/pdf',size:0}).length,2);
 assert.equal(validateIdFile({type:'image/png',size:6*1024*1024}).length,1);
});

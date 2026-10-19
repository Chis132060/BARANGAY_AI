'use strict';
const MAX_ID_BYTES=5*1024*1024;
const TYPES=new Set(['image/jpeg','image/png','image/webp']);
const ID_TYPES=new Set(['Philippine Identification (PhilID / ePhilID)',"Voter's ID / Voter's Certification","Driver's License",'UMID / SSS / GSIS Card','Postal ID','Barangay Clearance / Proof of Residency']);
function validateRegistrationInput(input){
 const errors=[];
 const text=k=>typeof input[k]==='string'?input[k].trim():'';
 if(!/^[\p{L}][\p{L}\p{M} .'-]{0,79}$/u.test(text('firstName')))errors.push('Invalid first name');
 if(!/^[\p{L}][\p{L}\p{M} .'-]{0,79}$/u.test(text('lastName')))errors.push('Invalid last name');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email'))||text('email').length>254)errors.push('Invalid email');
 if(!/^09\d{9}$/.test(text('contactNumber')))errors.push('Invalid Philippine mobile number');
 const dob=text('birthDate');
 const date=new Date(dob+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==dob||date>new Date()||date.getUTCFullYear()<1900)errors.push('Invalid birth date');
 if(!/^Purok [1-7]$/.test(text('purok')))errors.push('Invalid purok');
 if(!text('street')||text('street').length>150)errors.push('Invalid street');
 if(!ID_TYPES.has(text('idType')))errors.push('Invalid ID type');
 if(typeof input.password!=='string'||input.password.length<12||input.password.length>128)errors.push('Password must be 12 to 128 characters');
 return errors;
}
function validateIdFile({type,size}={}) {
 const errors=[];
 if(!TYPES.has(type))errors.push('Unsupported ID image type');
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_ID_BYTES)errors.push('Invalid ID image size');
 return errors;
}
module.exports={validateRegistrationInput,validateIdFile,MAX_ID_BYTES};

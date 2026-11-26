'use strict';
const MAX_ID_BYTES=4_000_000;
const PASSWORD_MIN=12;
const PASSWORD_MAX=128;
const TYPES=new Set(['image/jpeg','image/png','image/webp']);
const ID_TYPES=new Set(['Philippine Identification (PhilID / ePhilID)',"Voter's ID / Voter's Certification","Driver's License",'UMID / SSS / GSIS Card','Postal ID','Barangay Clearance / Proof of Residency']);
function registrationFieldErrors(input, step=0){
 const errors={};
 const text=k=>typeof input[k]==='string'?input[k].trim():'';
 if(step===0||step===1){
  if(!/^[\p{L}][\p{L}\p{M} .'-]{0,79}$/u.test(text('firstName')))errors.firstName='Enter a valid first name.';
  if(!/^[\p{L}][\p{L}\p{M} .'-]{0,79}$/u.test(text('lastName')))errors.lastName='Enter a valid last name.';
  if(!/^09\d{9}$/.test(text('contactNumber')))errors.contactNumber='Enter an 11-digit Philippine mobile number starting with 09.';
  const dob=text('birthDate'), date=new Date(dob+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==dob||date>new Date()||date.getUTCFullYear()<1900)errors.birthDate='Enter a valid date of birth.';
 }
 if(step===0||step===2){
  if(!/^Purok [1-7]$/.test(text('purok')))errors.purok='Select your purok.';
  if(!text('street')||text('street').length>150)errors.street='Enter your street (up to 150 characters).';
  if(text('householdCode').length>80)errors.householdCode='Household code must be at most 80 characters.';
 }
 if(step===0||step===3){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email'))||text('email').length>254)errors.email='Enter a valid email address.';
  if(typeof input.password!=='string'||input.password.length<PASSWORD_MIN||input.password.length>PASSWORD_MAX)errors.password='Password must be 12 to 128 characters.';
 }
 if(step===0||step===4){
  if(!ID_TYPES.has(text('idType')))errors.idType='Select a valid identification type.';
 }
 return errors;
}
function validateRegistrationInput(input){
 const legacy={firstName:'Invalid first name',lastName:'Invalid last name',email:'Invalid email',contactNumber:'Invalid Philippine mobile number',birthDate:'Invalid birth date',purok:'Invalid purok',street:'Invalid street',idType:'Invalid ID type'};
 return Object.entries(registrationFieldErrors(input)).map(([key,value])=>legacy[key]||value);
}
function validateIdFile({type,size}={}) {
 const errors=[];
 if(!TYPES.has(type))errors.push('Unsupported ID image type');
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_ID_BYTES)errors.push('Invalid ID image size');
 return errors;
}
module.exports={validateRegistrationInput,registrationFieldErrors,validateIdFile,MAX_ID_BYTES,PASSWORD_MIN,PASSWORD_MAX};

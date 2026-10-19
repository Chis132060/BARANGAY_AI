'use strict';
// Advisory classification from OCR text only. Human reviewers must verify the actual document.
const RULES=[
 {type:'PhilID / ePhilID',patterns:[/PHILIPPINE IDENTIFICATION/i,/PHILSYS/i,/PAMBANSANG PAGKAKAKILANLAN/i]},
 {type:"Driver's License",patterns:[/DRIVER.S LICENSE/i,/LAND TRANSPORTATION OFFICE/i]},
 {type:'UMID / SSS / GSIS',patterns:[/UNIFIED MULTI.PURPOSE ID/i,/SOCIAL SECURITY SYSTEM/i,/GOVERNMENT SERVICE INSURANCE SYSTEM/i]},
 {type:'Postal ID',patterns:[/POSTAL ID/i,/PHILIPPINE POSTAL CORPORATION/i]},
 {type:"Voter's Certification",patterns:[/COMMISSION ON ELECTIONS/i,/VOTER.S CERTIFICATION/i]},
 {type:'Barangay document',patterns:[/BARANGAY CLEARANCE/i,/CERTIFICATE OF RESIDENCY/i]}
];
function classifyIdText(value){
 const text=String(value||'').slice(0,20000);
 const matches=RULES.map(rule=>({type:rule.type,hits:rule.patterns.filter(p=>p.test(text)).length})).filter(r=>r.hits>0).sort((a,b)=>b.hits-a.hits);
 if(!matches.length||matches.length>1&&matches[0].hits===matches[1].hits)return {type:'Unknown',confidence:'low',requiresManualReview:true};
 return {type:matches[0].type,confidence:matches[0].hits>1?'medium':'low',requiresManualReview:true};
}
module.exports={classifyIdText};

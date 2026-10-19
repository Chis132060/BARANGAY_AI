const test=require('node:test');const assert=require('node:assert/strict');
const {classifyIdText}=require('../lib/id-text-classification.cjs');
test('classifies clear PhilID text as advisory',()=>assert.deepEqual(classifyIdText('PHILSYS PHILIPPINE IDENTIFICATION'),{type:'PhilID / ePhilID',confidence:'medium',requiresManualReview:true}));
test('ambiguous OCR stays unknown',()=>assert.equal(classifyIdText('LAND TRANSPORTATION OFFICE PHILSYS').type,'Unknown'));
test('no text stays unknown',()=>assert.equal(classifyIdText('').type,'Unknown'));

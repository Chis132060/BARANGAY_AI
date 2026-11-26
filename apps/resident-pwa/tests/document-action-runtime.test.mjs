// Execute the actual TypeScript server action with isolated in-memory
// Supabase adapters. Verifies control flow/rollback, NOT live database RLS.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../app/(app)/requests/actions.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const OP="11111111-1111-4111-8111-111111111111";
function fixture(opts={}){
  const rows=[], objects=new Map(), removed=[], attempts=[];
  const requirements=opts.requirements||["Valid ID"];
  let insertError=opts.insertError;
  const client={
    auth:{getUser:async()=>({data:{user:opts.unauth?null:{id:"fixture-auth"}},error:null})},
    from(table){
      const filters={};let pending;
      const chain={
        select:()=>chain,eq:(k,v)=>{filters[k]=v;return chain},limit:()=>chain,
        insert:v=>{pending=v;return chain},
        maybeSingle:async()=>({data:table==="document_requests"?rows.find(r=>r.resident_id===filters.resident_id&&r.client_operation_id===filters.client_operation_id)||null:null,error:null}),
        single:async()=>{
          if(table==="residents")return {data:{id:"fixture-resident",verification_status:opts.unverified?"Pending":"Verified"},error:null};
          if(table==="document_types")return {data:{name:opts.business?"Business Clearance":"Barangay Clearance",requirements_json:requirements},error:null};
          if(table==="document_requests"&&pending){
            if(insertError)return {data:null,error:{message:"synthetic DB failure",code:"TEST"}};
            const row={...pending,id:"fixture-request"};rows.push(row);return {data:{id:row.id},error:null};
          }
          throw Error("Unexpected query "+table);
        }
      };return chain;
    },
    storage:{from(bucket){
      assert.equal(bucket,"document-requirements");
      return {upload:async(path,file,config)=>{
        attempts.push(path);
        if(opts.failUploadAt===attempts.length)return {error:{message:"synthetic storage failure"}};
        assert.equal(config.upsert,false);objects.set(path,{file,config});return {error:null};
      },remove:async(paths)=>{for(const p of paths){removed.push(p);objects.delete(p)}return {error:null}}};
    }}
  };
  const imports={
    "@/lib/supabase/server":{createClient:()=>client},
    "next/cache":{revalidatePath:()=>{}},
    "@/lib/request-receipt":{formatRequestReference:id=>"TEST-"+id,isValidIdRequirement:()=>true},
    "@/lib/verified-resident-evidence":{hasRegistrationIdOnFile:()=>false,isResidencyProofRequirement:()=>false},
  };
  const exports={};
  new Function("require","exports",js)(name=>imports[name]??require(name),exports);
  return {submit:exports.submitDocumentRequest,rows,objects,removed,attempts,clearInsertError:()=>{insertError=false}};
}
function jpg(size=16){const bytes=new Uint8Array(size);bytes.set([255,216,255]);return new File([bytes],"synthetic.jpg",{type:"image/jpeg"});}
function payload(files=[["Valid ID",jpg()]],requirements=["Valid ID"]){
  const f=new FormData();f.set("documentTypeId","fixture-type");f.set("purpose","Synthetic QA");f.set("requirements",JSON.stringify(requirements));f.set("clientOperationId",OP);
  for(const [k,v] of files)f.set("file_"+k,v);return f;
}
test("runtime server action: successful JPG, pending row, private owner path, idempotent retry",async()=>{
  const f=fixture();const result=await f.submit(payload());
  assert.equal(result.success,true);assert.equal(f.rows.length,1);assert.equal(f.objects.size,1);
  assert.equal(f.rows[0].resident_id,"fixture-resident");assert.equal(f.rows[0].status,"Pending");
  assert.match(f.rows[0].form_data.attachments[0].storage_path,/^document-requirements\/fixture-auth\/req_/);
  assert.deepEqual(await f.submit(payload()),result);assert.equal(f.rows.length,1);assert.equal(f.attempts.length,1);
});
test("runtime server action: unauthenticated and unverified residents rejected before storage",async()=>{
  for(const options of [{unauth:true},{unverified:true}]){
    const f=fixture(options);await assert.rejects(f.submit(payload()),/Unauthorized|verified/);assert.equal(f.attempts.length,0);
  }
});
test("runtime server action: missing file, spoofed JPEG, MIME, empty and oversized rejected before storage",async()=>{
  const cases=[
    [payload([]),/Missing required attachment/],
    [payload([["Valid ID",new File(["not jpeg"],"fake.jpg",{type:"image/jpeg"})]]),/File content/],
    [payload([["Valid ID",new File(["abc"],"fake.jpg",{type:"text/plain"})]]),/Invalid file type/],
    [payload([["Valid ID",new File([],"empty.jpg",{type:"image/jpeg"})]]),/non-empty/],
    [payload([["Valid ID",jpg(4_000_001)]]),/at most 4 MB/]
  ];
  for(const [data,error] of cases){const f=fixture();await assert.rejects(f.submit(data),error);assert.equal(f.attempts.length,0);assert.equal(f.rows.length,0);}
});
test("runtime server action: aggregate limit validated before any upload",async()=>{
  const req=["Valid ID","Proof"];const f=fixture({requirements:req});await assert.rejects(f.submit(payload([[req[0],jpg(2_100_000)],[req[1],jpg(2_100_000)]],req)),/Combined attachments/);assert.equal(f.attempts.length,0);
});
test("runtime server action: changed catalog and business clearance rejected",async()=>{
  for(const options of [{requirements:["Different"]},{business:true}]){const f=fixture(options);await assert.rejects(f.submit(payload()),/requirements changed|in-person/);assert.equal(f.attempts.length,0);}
});
test("runtime server action: failed second upload rolls back first attachment",async()=>{
  const req=["Valid ID","Proof"];const f=fixture({requirements:req,failUploadAt:2});await assert.rejects(f.submit(payload([[req[0],jpg()],[req[1],jpg()]],req)),/synthetic storage failure/);assert.equal(f.removed.length,1);assert.equal(f.objects.size,0);assert.equal(f.rows.length,0);
});
test("runtime server action: DB failure rolls back files; same operation can retry",async()=>{
  const f=fixture({insertError:true});await assert.rejects(f.submit(payload()),/synthetic DB failure/);assert.equal(f.objects.size,0);assert.equal(f.rows.length,0);f.clearInsertError();assert.equal((await f.submit(payload())).success,true);assert.equal(f.rows.length,1);
});

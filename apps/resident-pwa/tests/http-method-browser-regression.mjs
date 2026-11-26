// Non-destructive HTTP method contract checks. No resident data or production
// mutation. Authenticated positive CRUD requires a separate seeded test tenant.
import assert from "node:assert/strict";
import { request } from "playwright";
import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
const evidence = process.env.QA_EVIDENCE_DIR || "qa-evidence";
async function record(method, path, response, includeBody=false) {
  const data = {method,path,status:response.status()};
  if (includeBody) { try { data.body = await response.json(); } catch { data.body = "[not JSON]"; } }
  mkdirSync(evidence,{recursive:true});
  appendFileSync(join(evidence,"http-results.jsonl"),JSON.stringify(data)+"\n");
  console.log("HTTP EVIDENCE "+JSON.stringify(data));
}

export async function runHttpMethodRegression(base) {
  const client=await request.newContext({baseURL:base,timeout:15000});
  try {
    const get=await client.get("/login");
    await record("GET","/login",get);
    assert.equal(get.status(),200);
    const head=await client.head("/login");
    await record("HEAD","/login",head);
    assert.equal(head.status(),200);
    assert.equal((await head.body()).length,0);
    for(const method of ["GET","HEAD","PUT","PATCH","DELETE"]) {
      const res=await client.fetch("/api/chat",{method});
      await record(method,"/api/chat",res);
      assert.equal(res.status(),405,method+" on POST-only PWA chat must be rejected");
    }
    const options=await client.fetch("/api/chat",{method:"OPTIONS"});
    await record("OPTIONS","/api/chat",options);
    assert.ok([200,204,405].includes(options.status()),"OPTIONS must return explicit capability status");
    const post=await client.post("/api/chat",{data:{message:"Synthetic authorization test",language:"en"}});
    await record("POST","/api/chat",post,true);
    assert.equal(post.status(),401,"guest cannot invoke protected chat");
    console.log("PASS: PWA GET HEAD POST PUT PATCH DELETE OPTIONS (public/unauthenticated method contract)");
  } finally {await client.dispose();}
  const api=process.env.BARANGAY_API_TEST_URL;
  if(!api){ console.log("Backend scope is executed in the separate live public HTTP job.");return; }
  const backend=await request.newContext({baseURL:api,timeout:25000});
  try {
    const health=await backend.get("/health");
    await record("GET","/health",health,true);
    assert.equal(health.status(),200);
    const schema=await backend.get("/openapi.json");
    await record("GET","/openapi.json",schema);
    assert.equal(schema.status(),200);
    const spec=await schema.json();
    for(const path of ["/api/v1/chat","/api/v1/tts/generate","/api/v1/voice/transcribe","/api/v1/voice/converse","/api/v1/ingest"])
      assert.ok(spec.paths[path]?.post,path+" must expose POST");
    assert.ok(spec.paths["/api/v1/memory/{session_id}"]?.delete);
    for(const method of ["POST","PUT","PATCH","DELETE"]) {
      const res=await backend.fetch("/health",{method});
      await record(method,"/health",res);
      assert.equal(res.status(),405,method+" must not mutate health endpoint");
    }
    const headHealth=await backend.head("/health");
    await record("HEAD","/health",headHealth);
    assert.ok([200,405].includes(headHealth.status()));
    const preflight=await backend.fetch("/api/v1/chat",{method:"OPTIONS",headers:{"Origin":"https://barangay-resident-pwa.vercel.app","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type,authorization"}});
    await record("OPTIONS","/api/v1/chat",preflight);
    assert.equal(preflight.status(),200);
    assert.equal(preflight.headers()["access-control-allow-origin"],"https://barangay-resident-pwa.vercel.app");
    const noAuth=await backend.post("/api/v1/chat",{data:{query:"Synthetic authorization test",language:"en"}});
    await record("POST","/api/v1/chat",noAuth,true);
    assert.ok([401,403].includes(noAuth.status()));
    const deletion=await backend.delete("/api/v1/memory/00000000-0000-4000-8000-000000000001");
    await record("DELETE","/api/v1/memory/{synthetic-id}",deletion,true);
    assert.ok([401,403].includes(deletion.status()),"unauthenticated deletion must be blocked");
    console.log("PASS: backend HTTP method, OpenAPI route presence, CORS and unauthenticated authorization checks");
  }finally{await backend.dispose();}
}

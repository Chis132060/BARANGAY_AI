// Non-destructive HTTP method contract checks. No resident data or production
// mutation. Authenticated positive CRUD requires a separate seeded test tenant.
import assert from "node:assert/strict";
import { request } from "playwright";

export async function runHttpMethodRegression(base) {
  const client=await request.newContext({baseURL:base,timeout:15000});
  try {
    const get=await client.get("/login");
    assert.equal(get.status(),200);
    const head=await client.head("/login");
    assert.equal(head.status(),200);
    assert.equal((await head.body()).length,0);
    for(const method of ["GET","HEAD","PUT","PATCH","DELETE"]) {
      const res=await client.fetch("/api/chat",{method});
      assert.equal(res.status(),405,method+" on POST-only PWA chat must be rejected");
    }
    const options=await client.fetch("/api/chat",{method:"OPTIONS"});
    assert.ok([200,204,405].includes(options.status()),"OPTIONS must return explicit capability status");
    const post=await client.post("/api/chat",{data:{message:"Synthetic authorization test",language:"en"}});
    assert.equal(post.status(),401,"guest cannot invoke protected chat");
    console.log("PASS: PWA GET HEAD POST PUT PATCH DELETE OPTIONS (public/unauthenticated method contract)");
  } finally {await client.dispose();}
  const api=process.env.BARANGAY_API_TEST_URL;
  if(!api){ console.log("SKIP: live API checks require BARANGAY_API_TEST_URL");return; }
  const backend=await request.newContext({baseURL:api,timeout:25000});
  try {
    assert.equal((await backend.get("/health")).status(),200);
    const schema=await backend.get("/openapi.json");
    assert.equal(schema.status(),200);
    const spec=await schema.json();
    for(const path of ["/api/v1/chat","/api/v1/tts/generate","/api/v1/voice/transcribe","/api/v1/voice/converse","/api/v1/ingest"])
      assert.ok(spec.paths[path]?.post,path+" must expose POST");
    assert.ok(spec.paths["/api/v1/memory/{session_id}"]?.delete);
    for(const method of ["POST","PUT","PATCH","DELETE"]) {
      const res=await backend.fetch("/health",{method});
      assert.equal(res.status(),405,method+" must not mutate health endpoint");
    }
    assert.ok([200,405].includes((await backend.head("/health")).status()));
    const preflight=await backend.fetch("/api/v1/chat",{method:"OPTIONS",headers:{"Origin":"https://barangay-resident-pwa.vercel.app","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type,authorization"}});
    assert.equal(preflight.status(),200);
    assert.equal(preflight.headers()["access-control-allow-origin"],"https://barangay-resident-pwa.vercel.app");
    const noAuth=await backend.post("/api/v1/chat",{data:{query:"Synthetic authorization test",language:"en"}});
    assert.ok([401,403].includes(noAuth.status()));
    const deletion=await backend.delete("/api/v1/memory/00000000-0000-4000-8000-000000000001");
    assert.ok([401,403].includes(deletion.status()),"unauthenticated deletion must be blocked");
    console.log("PASS: backend HTTP method, OpenAPI route presence, CORS and unauthenticated authorization checks");
  }finally{await backend.dispose();}
}

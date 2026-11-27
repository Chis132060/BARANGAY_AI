import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {join} from "node:path";
export async function runRegistrationRegression(browser,base){
 const evidence=process.env.QA_EVIDENCE_DIR||"qa-evidence";mkdirSync(evidence,{recursive:true});
 let page;
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:["camera"],serviceWorkers:"block"});
 try{
  page=await context.newPage();
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const email="synthetic-registration@example.invalid",password="QA-only-long-passphrase";
  await page.goto(base+"/register");
  const next1=page.getByRole("button",{name:"Next: Residency Address"}), next2=page.getByRole("button",{name:"Next: Account Info"}),next3=page.getByRole("button",{name:"Next: Upload Valid ID"});
  await next1.click();await page.getByText("Enter a valid first name.").waitFor();
  await page.locator("#firstName").fill("Synthetic");await page.locator("#lastName").fill("Tester");
  await page.locator("#birthDate").fill("1990-01-01");await page.locator("#contactNumber").fill("09123456789");
  await next1.click();await next2.click();await page.getByText("Enter your street (up to 150 characters).").waitFor();
  await page.locator("#street").fill("Synthetic Test Street");await page.locator("#houseNumber").fill("12");
  await next2.click();await page.locator("#email").fill("invalid");await page.locator("#password").fill("123456");
  await next3.click();await page.getByText("Enter a valid email address.").waitFor();await page.getByText("Password must be 12 to 128 characters.").waitFor();
  await page.locator("#email").fill(email);await page.locator("#password").fill(password);
  await page.screenshot({path:join(evidence,"registration-step3.png"),fullPage:true});
  await next3.click();await page.getByText("Account information completed").waitFor();
  await page.getByRole("button",{name:"Back",exact:true}).click();
  assert.equal(await page.locator("#password").inputValue(),password);
  assert.equal(await page.locator("#email").inputValue(),email);
  await page.getByRole("button",{name:"Back",exact:true}).click();
  assert.equal(await page.locator("#street").inputValue(),"Synthetic Test Street");
  await page.getByRole("button",{name:"Back",exact:true}).click();
  assert.equal(await page.locator("#firstName").inputValue(),"Synthetic");
  await next1.click();await next2.click();await next3.click();
  await page.getByRole("button",{name:"Submit Registration"}).click();
  await page.getByText("Capture your identification photo before submitting.").waitFor();
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"registration horizontal overflow at "+width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Start Camera",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector("video")?.videoWidth>0);
  await page.getByRole("button",{name:"Capture",exact:true}).click();
  await page.getByRole("button",{name:"Confirm",exact:true}).click();
  await page.getByAltText("ID Preview").waitFor();
  await page.screenshot({path:join(evidence,"registration-step4.png"),fullPage:true});
  let requests=0;let payloadVerified=false;
  await page.route("**/register",async route=>{
   if(route.request().method()!=="POST")return route.continue();
   requests++;
   const body=route.request().postDataBuffer()?.toString("utf8")||"";
   payloadVerified=body.includes(password)&&body.includes(email)&&body.includes("idBlob")&&body.includes("id_capture.jpg");
   await route.abort("failed");
  });
  await page.getByRole("button",{name:"Submit Registration"}).click();
  await page.getByText("Unable to submit registration. Your information is still here.",{exact:false}).waitFor();
  assert.equal(requests,1);assert.equal(payloadVerified,true);
  await page.getByAltText("ID Preview").waitFor();
  await page.getByRole("button",{name:"Back",exact:true}).click();
  assert.equal(await page.locator("#password").inputValue(),password);
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));
  assert.ok(!stored.includes(password)&&!stored.includes(email));
  page.on("dialog",d=>d.accept());
  await page.reload();await page.locator("#firstName").waitFor();assert.equal(await page.locator("#firstName").inputValue(),"");
  await page.goto(base+"/forgot-password");
  await page.getByRole("button",{name:"Send reset email"}).click();
  await page.getByText("Enter your real email address.",{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  console.log("PASS: built registration page: step validation, back/forward retention, mobile/tablet/desktop width, synthetic camera JPG, multipart credential retention, failed submission, privacy refresh, recovery input validation");
 }catch(error){if(page) await page.screenshot({path:join(evidence,"registration-failure.png"),fullPage:true}).catch(()=>{});throw error;}
 finally{await context.tracing.stop({path:join(evidence,"registration-trace.zip")}).catch(()=>{});await context.close();}
}

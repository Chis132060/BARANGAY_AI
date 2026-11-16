import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const server=read("../app/(app)/requests/actions.ts");
const page=read("../app/(app)/requests/new/page.tsx");
const chat=read("../components/chat/InChatFormCard.tsx");
const updates=read("../app/(app)/announcements/page.tsx");
const evidence=read("../lib/verified-resident-evidence.ts");
const sql=read("../../../supabase/migrations/20261115173820_verified_resident_document_refs_and_org_join_review.sql");

test("verified resident uses saved ID by reference, including old registered storage paths",()=>{
  assert.match(page,/hasRegistrationIdOnFile\(data\)/);
  assert.match(chat,/hasRegistrationIdOnFile\(data\)/);
  assert.match(server,/hasRegistrationIdOnFile\(resident\)/);
  assert.match(server,/source: reuseVerifiedIdRequirements\.includes\(req\)/);
  assert.match(server,/verified_registration_id_on_file/);
  assert.doesNotMatch(server,/\.download\(resident\.id_photo_url/);
  assert.match(evidence,/verification_status === "Verified"/);
  assert.match(sql,/guard_verified_resident_identity/);
  assert.match(sql,/NEW\.id_photo_url IS DISTINCT FROM OLD\.id_photo_url/);
});

test("residency profile is a staff-reviewed reference, not an issued certificate",()=>{
  assert.match(server,/reuseProfileProofRequirements/);
  assert.match(server,/\.from\("addresses"\)/);
  assert.match(server,/\.eq\("resident_id", resident\.id\)/);
  assert.match(server,/resident_profile_address_for_staff_review/);
  assert.match(server,/requirements_status:.*"Pending"/);
  assert.match(page,/not an issued residency certificate/i);
  assert.match(chat,/not an issued certificate/i);
  assert.match(page,/reuseProfileProofRequirements/);
  assert.match(chat,/reuseProfileProofRequirements/);
});

test("inline Ate Sora form stays inside chat and has accessible controls",()=>{
  assert.match(chat,/Interactive Document Application Form/);
  assert.match(chat,/min-h-14 w-full/);
  assert.match(chat,/min-h-24 w-full/);
  assert.match(page,/min-h-32 border/);
  assert.doesNotMatch(chat,/Make form bigger|setExpanded|Open full-page form/);
});

test("join is only for truly active organizations; membership requires staff approval",()=>{
  assert.match(updates,/joinOrganization\(organizationId: string\)/);
  assert.match(updates,/organization_join_requests/);
  assert.match(updates,/status: "Pending"/);
  assert.match(updates,/joinOrganization\(org\.id\)/);
  assert.match(updates,/organizationApplications\[org\.id\]/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.organization_join_requests/);
  assert.match(sql,/r\.verification_status='Verified'/);
  assert.match(sql,/o\.status='Active'/);
  assert.match(sql,/NEW\.status='Approved'/);
  assert.match(sql,/INSERT INTO public\.organization_members/);
  assert.match(sql,/is_barangay_staff\(\)/);
  assert.match(updates,/Past & Documented Programs/);
});

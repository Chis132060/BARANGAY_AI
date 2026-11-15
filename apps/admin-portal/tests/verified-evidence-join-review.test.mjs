import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const table=read("../app/(dashboard)/documents/requests/components/RequestsTable.tsx");
const review=read("../app/(dashboard)/organizations/join-requests/actions.ts");
const client=read("../app/(dashboard)/organizations/join-requests/JoinRequestsClient.tsx");
const orgs=read("../app/(dashboard)/organizations/components/OrganizationsClient.tsx");
const sql=read("../../../supabase/migrations/20261115173820_verified_resident_document_refs_and_org_join_review.sql");

test("staff can view reused ID via a short-lived signed photo, not a public link",()=>{
  assert.match(table,/fetchVerifiedResidentPhoto\(residentId\)/);
  assert.match(table,/verified_registration_id_on_file/);
  assert.match(table,/resident_profile_address_for_staff_review/);
  assert.match(table,/Temporary signed preview/);
  assert.doesNotMatch(table,/req\.form_data\.attachments\[0\]\.storage_path/);
});

test("organization join review is authorized and approval creates genuine membership",()=>{
  assert.match(review,/checkUserPermission\(user\.id, "organizations", kind\)/);
  assert.match(review,/reviewed_by: user\.id/);
  assert.match(review,/\.eq\("status", "Pending"\)/);
  assert.match(client,/Approve and Add Member/);
  assert.match(client,/Reject with Reason/);
  assert.match(orgs,/href="\/organizations\/join-requests"/);
  assert.match(sql,/Staff review organization applications/);
  assert.match(sql,/CREATE TRIGGER organization_join_approval/);
});

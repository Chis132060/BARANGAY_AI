import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

const migration = read("../../../supabase/migrations/20261115090000_staff_only_councils_and_rosters.sql");
const actions = read("../app/(dashboard)/councils/actions.ts");
const page = read("../app/(dashboard)/councils/page.tsx");
const client = read("../app/(dashboard)/councils/components/CouncilsClient.tsx");
const nav = read("../lib/navigation.ts");
const programs = read("../app/(dashboard)/programs/components/ProgramsClient.tsx");
const orgs = read("../app/(dashboard)/organizations/components/OrganizationsClient.tsx");
const programPage = read("../app/(dashboard)/programs/page.tsx");
const orgPage = read("../app/(dashboard)/organizations/page.tsx");

test("three separate navigation modules exist instead of calling beneficiaries councils", () => {
  for (const [title, href] of [
    ["Programs & Activities", "/programs"],
    ["Councils & Committees", "/councils"],
    ["Community Organizations", "/organizations"],
  ]) {
    assert.ok(nav.includes('title: "' + title + '", href: "' + href + '"'));
  }
  assert.match(programs, /Program Overview/);
  assert.match(programs, /Program lead:/);
  assert.match(programs, /council officers/i);
});

test("no council members or local leaders are seeded or inferred from enrollee data", () => {
  assert.match(migration, /create table if not exists public\.barangay_councils/);
  assert.match(migration, /create table if not exists public\.barangay_council_members/);
  assert.match(migration, /create table if not exists public\.barangay_council_programs/);
  assert.doesNotMatch(migration, /insert into public\./i);
  assert.doesNotMatch(client, /const EXAMPLES|EXAMPLES\.map/);
  assert.match(client, /Only actual records returned by the database appear in this registry/);
  assert.match(client, /status === "Draft"/);
  assert.doesNotMatch(actions, /program_enrollees/);
});

test("council access requires both role-specific authorization and staff-only row policies", () => {
  for (const table of ["barangay_councils", "barangay_council_members", "barangay_council_programs"]) {
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
    assert.match(migration, new RegExp("revoke all on table public\\." + table + " from public, anon"));
  }
  assert.equal((migration.match(/public\.is_barangay_staff\(\)/g) || []).length, 6);
  assert.match(actions, /checkUserPermission\(user\.id, "programs", action\)/);
  assert.match(page, /checkUserPermission\(user\.id, "programs", "canEdit"\)/);
});

test("activation and verified appointments require documentary references", () => {
  assert.match(migration, /constraint council_activation_requires_authority/);
  assert.match(migration, /status <> 'Active'/);
  assert.match(migration, /constraint council_member_verified_source_required/);
  assert.match(actions, /if \(input\.status === "Active" && !reference\)/);
  assert.match(actions, /if \(input\.verification_status === "Verified" && !appointment\)/);
  assert.match(actions, /term_end < input\.term_start/);
});

test("staff can link actual programs without claiming beneficiaries as council members", () => {
  assert.match(actions, /export async function linkCouncilProgram\(/);
  assert.match(actions, /export async function unlinkCouncilProgram\(/);
  assert.match(actions, /from\("barangay_council_programs"\)/);
  assert.match(client, /Associated programs/);
  assert.match(client, /not membership or automatic enrollment/);
});

test("organization member fetch uses proper effect and never masks errors as empty rosters", () => {
  assert.match(orgs, /useEffect\(\(\) => \{/);
  assert.doesNotMatch(orgs, /useState\(\(\) => \{\s*fetchOrgMembers/);
  assert.match(orgs, /setMembersError/);
  assert.match(orgs, /Cannot load organization members/);
  assert.match(orgs, /Organization Leadership/);
  assert.match(orgs, /recorded, not independently verified/);
  assert.match(orgPage, /loadError = "Unable to load organizations/);
});

test("program participant load failures are explicit and lead is shown separately", () => {
  assert.match(programs, /setMembersError/);
  assert.match(programs, /Cannot load participants/);
  assert.match(programs, /No members enrolled yet/);
  assert.match(programs, /Program Overview/);
  assert.match(programPage, /loadError = "Unable to load programs/);
});

test("council roster and program badges reconcile with the actual fetched rows", () => {
  assert.match(client, /member_count: memberRows\.length, program_count: linkedPrograms\.length/);
  assert.match(client, /setCouncils\(previous => previous\.map\(council => council\.id === councilId/);
  assert.match(client, /idempotent upsert may update an existing link/i);
  assert.doesNotMatch(client, /program_count: \(current\.program_count \?\? 0\) \+ 1/);
  assert.ok((client.match(/setReloadKey\(value => value \+ 1\)/g) || []).length >= 4,
    "appointment and program mutations must trigger a count refresh");
});

test("council registry has no hardcoded sample council entities", () => {
  assert.doesNotMatch(client, /const EXAMPLES|EXAMPLES\.map/);
  assert.doesNotMatch(client, /Prepare unverified draft/);
  assert.match(client, /Only actual records returned by the database appear in this registry/);
});

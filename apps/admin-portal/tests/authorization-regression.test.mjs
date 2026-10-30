import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const residentActions = read("../app/(dashboard)/residents/actions.ts");
const documentActions = read("../app/(dashboard)/documents/actions.ts");
const permissions = read("../lib/permissions.ts");
const serverRbac = read("../app/(dashboard)/administration/rbac-actions.ts");
const adminMiddleware = read("../middleware.ts");

test("resident verification actions enforce authorization and pending-only transitions", () => {
  for (const name of ["approveResident", "rejectResident"]) {
    const section = residentActions.split("export async function " + name)[1];
    assert.ok(section, name + " action exists");
    const transition = section.split(".update(")[1]?.split(".select(\"id, verification_status\")")[0];
    assert.ok(transition, name + " updates the record");
    assert.match(transition, /\.eq\("verification_status", "Pending"\)/);
    assert.match(transition, /\.not\("user_id", "is", null\)/);
  }
});

test("private resident identification images require permission before signing", () => {
  const resolver = residentActions.split("async function resolveResidentIdPhotoUrl")[1]?.split("export async function fetchResidentIdPhotoUrl")[0];
  const action = residentActions.split("export async function fetchResidentIdPhotoUrl")[1]?.split("export async function fetchVerifiedResidentPhoto")[0];
  assert.ok(resolver);
  assert.ok(action);
  assert.match(action, /checkUserPermission/);
  assert.match(resolver, /createSignedUrl/);
  assert.ok(action.indexOf("checkUserPermission") < action.indexOf("resolveResidentIdPhotoUrl"));
});

test("document approval transitions and payment changes require elevated permission", () => {
  const action = documentActions.split("export async function updateRequestStatus(")[1];
  assert.ok(action);
  assert.match(action, /validStatuses/);
  assert.match(action, /Invalid document request status/);
  assert.match(action, /\["Approved", "Ready for Pickup", "Released", "Completed", "Rejected"\]\.includes\(status\) && !canApprove/);
  assert.match(action, /paymentStatus && !canApprove/);
});

test("central permission module exists and uses explicit permission checks", () => {
  assert.match(permissions, /hasPermission/);
  assert.match(serverRbac, /checkUserPermission/);
});

test("admin auth refresh preserves all cookie chunks and role lookup failures keep the session", () => {
  assert.match(adminMiddleware, /const refreshedCookies = new Map/);
  assert.match(adminMiddleware, /for \(const \[name, cookie\] of refreshedCookies\) response\.cookies\.set/);
  assert.match(adminMiddleware, /for \(const cookie of response\.cookies\.getAll\(\)\) redirect\.cookies\.set\(cookie\)/);
  assert.match(adminMiddleware, /if \(user && !isPublic && roleLookupFailed\)/);
  const roleFailureBranch = adminMiddleware.split("if (user && !isPublic && roleLookupFailed)")[1]?.split("if (user && !isPublic && !ADMIN_ROLES")[0];
  assert.ok(roleFailureBranch);
  assert.doesNotMatch(roleFailureBranch, /signOut/);
});

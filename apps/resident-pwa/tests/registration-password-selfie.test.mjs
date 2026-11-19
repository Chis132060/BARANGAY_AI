import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateRegistrationInput } = require("../lib/registration-validation.cjs");
const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const form = read("../components/auth/RegisterForm.tsx");
const action = read("../app/(auth)/register/actions.ts");
const camera = read("../components/camera/CameraCapture.tsx");
const admin = read("../../admin-portal/app/(dashboard)/residents/actions.ts");
const reviewer = read("../../admin-portal/app/(dashboard)/residents/verification/components/VerificationQueueClient.tsx");

const common = {
  firstName: "Juan",
  lastName: "Dela Cruz",
  email: "juan@example.com",
  password: "Secure and long test password 2026",
  birthDate: "1990-10-20",
  contactNumber: "09171234567",
  street: "Main St.",
  purok: "Purok 1",
  idType: "Barangay ID",
};

test("new registration requires at least 12 characters; a valid barangay ID type is recognized", () => {
  assert.deepEqual(validateRegistrationInput(common), []);
  assert.ok(validateRegistrationInput({ ...common, password: "Short123" }).some(e => /12 to 128/.test(e)));
  assert.ok(validateRegistrationInput({ ...common, password: "a".repeat(129) }).some(e => /12 to 128/.test(e)));
  assert.ok(validateRegistrationInput({ ...common, idType: "Nonexistent ID" }).some(e => /Invalid ID type/.test(e)));
});

test("step 3 cannot reach step 4 with a six-character password or mismatched confirmation", () => {
  assert.match(form, /const passwordValid = formData\.password\.length >= 12 && formData\.password\.length <= 128/);
  assert.match(form, /const passwordMatches = formData\.confirmPassword\.length > 0 && formData\.password === formData\.confirmPassword/);
  assert.match(form, /disabled=\{!credentialsValid\}/);
  assert.match(form, /autoComplete="new-password" minLength=\{12\} maxLength=\{128\}/);
  assert.match(form, /Confirm password \*/);
  assert.doesNotMatch(form, /password\.length < 6/);
});

test("server validates confirmation and distinct real-image signatures before creating auth user", () => {
  const createPos = action.indexOf("supabase.auth.admin.createUser");
  for (const s of [
    'formData.get("confirmPassword")',
    'formData.get("selfieWithIdBlob")',
    "if (password !== confirmation)",
    "if (!privacyAcknowledged || !idPhotoConfirmed || !selfiePhotoConfirmed)",
    "inspectImage(selfieBytes, selfieWithIdBlob.type)",
    "idBytes.equals(selfieBytes)",
    "detectedImageExtension(selfieBytes)",
  ]) {
    assert.ok(action.includes(s), "expected backend guard " + s);
    assert.ok(action.indexOf(s) < createPos, "guard should run before auth user creation: " + s);
  }
  assert.match(action, /id_capture_v2_/);
  assert.match(action, /selfie_with_id_v2_/);
  assert.match(action, /uploadedPaths\.push\(storagePath\)/);
  assert.match(action, /uploadedPaths\.push\(selfieStoragePath\)/);
  assert.match(action, /\.remove\(uploadedPaths\)/);
  assert.match(action, /verification_status: "Pending"/);
});

test("selfie and ID previews are separate and revoked when replaced", () => {
  assert.match(form, /setSelfieWithIdBlob\(null\)/);
  assert.match(form, /URL\.revokeObjectURL\(url\)/);
  assert.match(form, /facingMode="environment"/);
  assert.match(form, /facingMode="user"/);
  assert.match(form, /idPhotoConfirmed &&/); // source can use disabled proof gates
  assert.match(form, /privacyAcknowledged/);
  assert.match(camera, /streamRef\.current\?\.getTracks\(\)\.forEach/);
  assert.match(camera, /if \(!activeRef\.current\)/);
});

test("private staff review requires both photos for v2 and logs human confirmation", () => {
  assert.match(admin, /function pairedSelfiePath/);
  assert.match(admin, /fetchResidentSelfieWithIdPhotoUrl/);
  assert.match(admin, /if \(!canView && !canApprove\)/);
  assert.match(admin, /if \(!evidenceReviewed\)/);
  assert.match(admin, /Required selfie-with-ID evidence is missing/);
  assert.match(admin, /paired_selfie_required: Boolean\(pairedPath\)/);
  assert.match(reviewer, /fetchResidentSelfieWithIdPhotoUrl/);
  assert.match(reviewer, /checked=\{reviewedId\}/);
  assert.match(reviewer, /checked=\{reviewedSelfie\}/);
  assert.match(reviewer, /requiresSelfieReview && \(!idPhotoUrl \|\| !selfiePhotoUrl/);
});

test("do not pretend to automatically authenticate an ID via file format", () => {
  assert.match(form, /A photo upload is not automatic identity approval/);
  assert.match(reviewer, /Neither an ID-shaped photo nor a selfie automatically proves authenticity/);
  assert.doesNotMatch(action, /verification_status: "Verified"/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const serializer = read("../lib/pdf/reference-guide.ts");
const route = read("../app/api/documents/sora-sources/pdf/route.ts");
const adminPage = read("../app/(dashboard)/documents/sora-sources/page.tsx");
const output = ts.transpileModule(serializer, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
const exports = {};
vm.runInNewContext(output.outputText, { exports, TextEncoder, Date });
const { buildReferenceGuidePdf } = exports;

test("admin can view and download an actual structurally correct PDF document", () => {
  const bytes = buildReferenceGuidePdf("Smart Barangay - Legal Guides", [
    { heading: "Theft and reporting", body: [
      "Find verified guidance in the approved source catalog.",
      "Original source: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426",
    ] },
  ], { generatedAt: "2026-11-16" });
  const pdf = Buffer.from(bytes).toString("ascii");
  assert.match(pdf, /^%PDF-1\.4\n/);
  assert.match(pdf, /\/Type \/Catalog/);
  assert.match(pdf, /\/Type \/Pages/);
  assert.match(pdf, /\/Type \/Page\b/);
  assert.match(pdf, /Theft and reporting/);
  assert.match(pdf, /Reference only - NOT a signed ordinance/i);
  assert.match(pdf, /elibrary\.judiciary\.gov\.ph/);
  assert.match(pdf, /%%EOF\s*$/);
  const xref = Number(pdf.match(/startxref\n(\d+)\n/)?.[1]);
  assert.ok(xref > 0 && pdf.slice(xref, xref + 4) === "xref");
});

test("long legal and service catalog exports paginate rather than clipping", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    heading: "Source " + (i + 1),
    body: [("Residents may see official procedures, required documents and source links. ").repeat(9)],
  }));
  const pdf = Buffer.from(buildReferenceGuidePdf("Full catalog", many)).toString("ascii");
  assert.match(pdf, /\/Count ([2-9]|\d{2,})\b/);
  assert.match(pdf, /Page 1 \/ /);
  assert.match(pdf, /Page 2 \/ /);
  assert.match(pdf, /%%EOF/);
});

test("no invented static PDF rules; source, service and full catalog use authenticated live records", () => {
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /checkUserPermission\(user\.id, "documents", "canView"\)/);
  assert.match(route, /from\("verified_legal_sources"\)/);
  assert.match(route, /from\("document_types"\)/);
  assert.match(route, /\.eq\("status", "Published"\)/);
  assert.match(route, /Content-Type": "application\/pdf"/);
  assert.match(route, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient/);
});

test("admin Documents & Services includes PDF view and export for every source and service", () => {
  assert.match(adminPage, /View PDF knowledge &amp; services guide/);
  assert.match(adminPage, /Download PDF guide/);
  assert.match(adminPage, /kind=source&id/);
  assert.match(adminPage, /kind=service&id/);
  assert.match(adminPage, /Read original official source/);
  assert.match(adminPage, /import the document as Draft/);
});

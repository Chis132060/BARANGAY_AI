"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUserPermission } from "../../administration/rbac-actions";

export type OfficialSource = {
  id: string;
  title: string;
  source_url: string;
  jurisdiction_scope: "philippines" | "butuan_city" | "tandang_sora_butuan";
  authority: "national_law" | "city_code_index" | "barangay_policy";
  summary: string;
  keywords: string[];
  status: "Published" | "Archived";
  verified_at: string;
};

export type DocumentService = {
  id: string;
  name: string;
  description: string | null;
  requirements_json: unknown;
};

export type SourceInput = {
  id?: string;
  title: string;
  source_url: string;
  jurisdiction_scope: OfficialSource["jurisdiction_scope"];
  authority: OfficialSource["authority"];
  summary: string;
  keywords: string[];
};

function requireUUID(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error("Invalid record ID.");
}

async function authorize(action: "canView" | "canEdit" | "canCreate" | "canApprove") {
  const session = createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user || !(await checkUserPermission(user.id, "documents", action))) {
    throw new Error("You are not authorized to manage Documents & Services.");
  }
  return { userId: user.id, admin: createAdminClient() };
}

function verifiedGovernmentUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw.trim()); }
  catch { throw new Error("Enter a valid HTTPS government source URL."); }
  if (u.protocol !== "https:" || u.username || u.password ||
      !/(?:^|\.)gov\.ph$/i.test(u.hostname) || u.port) {
    throw new Error("Only official Philippine government HTTPS links can be published.");
  }
  return u.toString();
}

function cleanSource(input: SourceInput) {
  if (!input || typeof input !== "object") throw new Error("Missing source details.");
  const title = input.title?.trim() ?? "";
  const summary = input.summary?.trim() ?? "";
  if (title.length < 8 || title.length > 180) throw new Error("Source title must be 8–180 characters.");
  if (summary.length < 40 || summary.length > 3500) throw new Error("Provide a source-checked 40–3500 character plain-language summary.");
  const allowedScopes = ["philippines", "butuan_city", "tandang_sora_butuan"];
  const allowedAuthority = ["national_law", "city_code_index", "barangay_policy"];
  if (!allowedScopes.includes(input.jurisdiction_scope) || !allowedAuthority.includes(input.authority))
    throw new Error("Choose an approved jurisdiction and source classification.");
  if (input.authority === "national_law" && input.jurisdiction_scope !== "philippines" ||
      input.authority === "city_code_index" && input.jurisdiction_scope !== "butuan_city" ||
      input.authority === "barangay_policy" && input.jurisdiction_scope !== "tandang_sora_butuan") {
    throw new Error("The document classification does not match its jurisdiction.");
  }
  const keywords = (Array.isArray(input.keywords) ? input.keywords : [])
    .filter((w): w is string => typeof w === "string")
    .map(w => w.trim().toLowerCase()).filter(w => w.length >= 2 && w.length <= 60);
  if (keywords.length > 30) throw new Error("Use up to 30 search terms.");
  return {
    title,
    source_url: verifiedGovernmentUrl(input.source_url),
    jurisdiction_scope: input.jurisdiction_scope,
    authority: input.authority,
    summary,
    keywords: [...new Set(keywords)],
  };
}

async function audit(admin: ReturnType<typeof createAdminClient>, actor: string, action: string, details: object) {
  const { error } = await admin.from("audit_logs").insert({
    user_id: actor, action, module: "documents", details,
  });
  if (error) console.error("Ate Sora sources audit log unavailable:", error.message);
}

export async function listSoraSourcesAndServices() {
  const { admin } = await authorize("canView");
  const [sources, services] = await Promise.all([
    admin.from("verified_legal_sources")
      .select("id,title,source_url,jurisdiction_scope,authority,summary,keywords,status,verified_at")
      .order("title").limit(200),
    admin.from("document_types")
      .select("id,name,description,requirements_json")
      .order("name").limit(100),
  ]);
  if (sources.error) throw new Error("Legal sources are unavailable: " + sources.error.message);
  if (services.error) throw new Error("Document services are unavailable: " + services.error.message);
  return {
    sources: (sources.data ?? []) as OfficialSource[],
    services: (services.data ?? []) as DocumentService[],
  };
}

export async function saveSoraSource(input: SourceInput) {
  const { userId, admin } = await authorize(input.id ? "canEdit" : "canCreate");
  const payload = cleanSource(input);
  if (input.id) {
    requireUUID(input.id);
    // Edits are ALWAYS unpublished first. Re-approval is required to go live.
    const { data, error } = await admin.from("verified_legal_sources")
      .update({ ...payload, status: "Archived" })
      .eq("id", input.id).select("id").single();
    if (error || !data) throw new Error("Could not update source: " + (error?.message ?? "not found"));
    await audit(admin, userId, "EDIT_SORA_LEGAL_SOURCE", { source_id: input.id, status: "Archived" });
  } else {
    const { data, error } = await admin.from("verified_legal_sources")
      .insert({ ...payload, status: "Archived", verified_at: new Date().toISOString() })
      .select("id").single();
    if (error || !data) throw new Error("Could not add source: " + (error?.message ?? "not found"));
    await audit(admin, userId, "ADD_SORA_LEGAL_SOURCE", { source_id: data.id, status: "Archived" });
  }
  return { success: true };
}

export async function setSoraSourcePublication(id: string, publish: boolean, confirmedReviewed: boolean) {
  requireUUID(id);
  const { userId, admin } = await authorize("canApprove");
  if (publish && confirmedReviewed !== true)
    throw new Error("Review the original official government source before publishing.");
  const { data: existing, error: readError } = await admin.from("verified_legal_sources")
    .select("id,title,source_url,summary,authority,jurisdiction_scope")
    .eq("id", id).single();
  if (readError || !existing) throw new Error("Source could not be found.");
  if (publish) cleanSource({ ...existing, keywords: [] });
  const { error } = await admin.from("verified_legal_sources")
    .update({ status: publish ? "Published" : "Archived", verified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Could not update publication: " + error.message);
  await audit(admin, userId, publish ? "PUBLISH_SORA_LEGAL_SOURCE" : "ARCHIVE_SORA_LEGAL_SOURCE", {
    source_id: id, title: existing.title,
  });
  return { success: true };
}

export async function updateSoraDocumentService(id: string, description: string, requirements: string[]) {
  requireUUID(id);
  const { userId, admin } = await authorize("canEdit");
  const desc = (typeof description === "string" ? description : "").trim();
  if (desc.length > 2000) throw new Error("Description is too long.");
  if (!Array.isArray(requirements) || requirements.length > 20 ||
      requirements.some(s => typeof s !== "string" || s.trim().length < 2 || s.trim().length > 250))
    throw new Error("Use up to 20 short, non-empty requirements.");
  const clean = requirements.map(x => x.trim());
  const { data, error } = await admin.from("document_types")
    .update({ description: desc || null, requirements: clean.join("\n"), requirements_json: clean })
    .eq("id", id).select("id,name").single();
  if (error || !data) throw new Error("Could not update service: " + (error?.message ?? "not found"));
  await audit(admin, userId, "EDIT_SORA_DOCUMENT_SERVICE", { service_id: id, name: data.name });
  return { success: true };
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "@/app/(dashboard)/administration/rbac-actions";
import { buildReferenceGuidePdf, type PdfSection } from "@/lib/pdf/reference-guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Source = {
  id: string; title: string; source_url: string; jurisdiction_scope: string;
  authority: string; summary: string; status: string; verified_at: string | null;
};
type Service = {
  id: string; name: string; description: string | null;
  requirements_json: unknown;
};

function sourceSection(row: Source): PdfSection {
  return {
    heading: row.title,
    body: [
      "Classification: " + row.authority.replaceAll("_", " ") +
        " | Jurisdiction: " + row.jurisdiction_scope.replaceAll("_", " "),
      "Publication: " + row.status + " | Verified: " + (row.verified_at || "Not reviewed"),
      "Summary and suggested resident guidance (reviewed by authorized staff): " + row.summary,
      "Original official government source: " + row.source_url,
    ],
  };
}

function serviceSection(row: Service): PdfSection {
  const requirements = Array.isArray(row.requirements_json)
    ? row.requirements_json.filter((x): x is string => typeof x === "string")
    : [];
  return {
    heading: row.name,
    body: [
      "Current description: " + (row.description?.trim() || "Not recorded"),
      "Required evidence (live service catalog): " +
        (requirements.length ? requirements.map((x, i) => (i + 1) + ". " + x).join("; ") : "Not recorded"),
      "This is an application-service record, NOT an ordinance. Confirm eligibility, fees and schedules with authorized staff.",
    ],
  };
}

function pdfResponse(title: string, sections: PdfSection[], filename: string, download: boolean) {
  const bytes = buildReferenceGuidePdf(title, sections, {
    subtitle: "Admin > Documents & Services > Ate Sora Sources",
  });
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": (download ? "attachment" : "inline") + '; filename="' + filename + '"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view admin PDF guides." }, { status: 401 });
  if (!(await checkUserPermission(user.id, "documents", "canView"))) {
    return NextResponse.json({ error: "Documents permission required." }, { status: 403 });
  }

  const kind = request.nextUrl.searchParams.get("kind") || "catalog";
  const id = request.nextUrl.searchParams.get("id");
  const download = request.nextUrl.searchParams.get("download") === "1";
  if (!["catalog", "source", "service"].includes(kind))
    return NextResponse.json({ error: "Invalid PDF type." }, { status: 400 });
  if (kind !== "catalog" && (!id || !/^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: "A valid source/service ID is required." }, { status: 400 });
  }

  try {
    if (kind === "source") {
      const { data, error } = await supabase.from("verified_legal_sources")
        .select("id,title,source_url,jurisdiction_scope,authority,summary,status,verified_at")
        .eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Official source not found or not permitted." }, { status: 404 });
      return pdfResponse(data.title, [sourceSection(data as Source)], "ate-sora-legal-reference.pdf", download);
    }
    if (kind === "service") {
      const { data, error } = await supabase.from("document_types")
        .select("id,name,description,requirements_json").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Document service not found." }, { status: 404 });
      return pdfResponse(data.name, [serviceSection(data as Service)], "barangay-document-service.pdf", download);
    }

    const [sourcesResult, servicesResult] = await Promise.all([
      supabase.from("verified_legal_sources")
        .select("id,title,source_url,jurisdiction_scope,authority,summary,status,verified_at")
        .eq("status", "Published").order("title").limit(200),
      supabase.from("document_types").select("id,name,description,requirements_json").order("name").limit(100),
    ]);
    if (sourcesResult.error || servicesResult.error) {
      return NextResponse.json({ error: "Could not build PDF from live approved sources." }, { status: 503 });
    }
    const sections: PdfSection[] = [
      { heading: "Approved legal references",
        body: ["Only source-verified, published references are included. National laws, city code directory entries and barangay policies are not interchangeable."] },
      ...(sourcesResult.data ?? []).map(s => sourceSection(s as Source)),
      { heading: "Live document and service requirements", body: [
        "These application records are separate from ordinances. Submit requests in the resident app; actual review happens in the barangay office.",
      ] },
      ...(servicesResult.data ?? []).map(s => serviceSection(s as Service)),
    ];
    return pdfResponse("Smart Barangay - Ate Sora Knowledge and Service Guide",
      sections, "ate-sora-approved-knowledge-and-services.pdf", download);
  } catch (err) {
    console.error("Admin PDF guide generation failed:", err);
    return NextResponse.json({ error: "The PDF guide could not be generated." }, { status: 500 });
  }
}

// Official source-gated policy answers. This path does not send untrusted PDF
// content to an LLM and never infers a Tandang Sora ordinance from a citywide code.
export type PolicyScope = "tandang_sora_butuan" | "butuan_city";

type ApprovedPolicy = {
  policy_number: string;
  title: string;
  full_text: string;
  description: string;
  enacted_by: string;
  jurisdiction_scope: PolicyScope;
  source_reference: string;
};

const STOPWORDS = new Set([
  "ano", "ang", "mga", "nang", "ng", "sa", "may", "para", "tungkol",
  "paano", "ano", "what", "which", "does", "is", "are", "our", "the", "and",
  "about", "barangay", "brgy", "butuan", "city", "tandang", "sora",
  "poblacion", "policy", "policies", "ordinance", "ordinances", "ordinansa",
  "batas", "rules", "rule", "patakaran", "balaod", "regulation",
]);

export function isPolicyQuestion(message: string): boolean {
  return /(?:^|[^a-z])(?:policy|policies|polisiya|ordinance|ordinances|ordinansa|ordinansiya|patakaran|batas|balaod|lagda|curfew|multa|fine|penalty|penalties|noise|karaoke|ordinance number|ordinance no|regulation|zoning|sanitation|solid waste|basura|garbage|smoking|traffic rule|resolution)(?:$|[^a-z])/i.test(message);
}

export function isWrongBarangayQuestion(message: string): boolean {
  return /quezon\s+city|district\s*6\b|novaliches/i.test(message);
}

function significantTerms(message: string): string[] {
  return [...new Set(message.toLowerCase().normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length >= 4 && !STOPWORDS.has(word)))].slice(0, 12);
}

function sourceExcerpt(text: string, terms: string[]): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const indexes = terms.map(word => lower.indexOf(word)).filter(x => x >= 0);
  const first = indexes.length ? Math.min(...indexes) : 0;
  const start = Math.max(0, first - 170);
  return (start ? "…" : "") + clean.slice(start, start + 1000) +
    (clean.length > start + 1000 ? "…" : "");
}

export async function getVerifiedPolicyAnswer(supabase: any, message: string, language: "tgl" | "ceb" | "en") {
  const localityLabel = "Barangay Tandang Sora (Poblacion), Butuan City";
  if (isWrongBarangayQuestion(message)) {
    const answer = language === "en"
      ? "This portal serves Barangay Tandang Sora (Poblacion), Butuan City, not Tandang Sora in Quezon City. I cannot claim another barangay's policies are local rules here."
      : "Ang portal na ito ay para sa Barangay Tandang Sora (Poblacion), Butuan City, hindi sa Tandang Sora, Quezon City. Hindi ko ituturing na lokal na ordinansa rito ang patakaran ng ibang lugar.";
    return { answer, citations: [] as string[], context_used: false, flagged: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("policies")
    .select("policy_number,title,full_text,description,enacted_by,jurisdiction_scope,source_reference")
    .eq("status", "Active")
    .in("jurisdiction_scope", ["tandang_sora_butuan", "butuan_city"])
    .or(`effective_date.is.null,effective_date.lte.${today}`)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .limit(100);

  // Fail closed if DB, migration or permissions are unavailable.
  const rows: ApprovedPolicy[] = error || !Array.isArray(data) ? [] : data.filter((p: ApprovedPolicy) =>
    p.source_reference?.trim().length >= 12 && p.policy_number?.trim() &&
    p.enacted_by?.trim() && p.full_text?.trim().length >= 40);
  const terms = significantTerms(message);
  const matches = rows.filter(p => {
    if (terms.length === 0) return true; // General request: list approved policies only.
    const searchable = [p.title, p.policy_number, p.description, p.full_text].join(" ").toLowerCase();
    return terms.some(term => searchable.includes(term));
  }).slice(0, 3);

  if (!matches.length) {
    const answer = language === "en"
      ? `I cannot verify an approved current policy for ${localityLabel} from the official uploaded records. Please ask barangay staff for the signed ordinance or current Butuan City code. I will not invent local fines, curfews, dates or rules.`
      : `Wala pa akong ma-verify na aprubado at kasalukuyang dokumento tungkol dito para sa ${localityLabel}. Pakihingi sa barangay ng signed ordinance o sa Butuan City ng opisyal na code. Hindi ako mag-iimbento ng curfew, multa, petsa o lokal na patakaran.`;
    return { answer, citations: [] as string[], context_used: false, flagged: true };
  }

  const citations: string[] = [];
  const blocks = matches.map(p => {
    const scope = p.jurisdiction_scope === "butuan_city"
      ? "Butuan City-wide rule; NOT a barangay-issued Tandang Sora ordinance"
      : "Barangay Tandang Sora (Poblacion), Butuan City record";
    const citation = `${p.policy_number} — ${p.title} [${scope}]; Primary source: ${p.source_reference}`;
    citations.push(citation);
    const excerpt = sourceExcerpt(p.full_text || p.description, terms);
    return `${citation}\nOfficial document excerpt (not an AI interpretation): ${excerpt}`;
  });
  const preface = language === "en"
    ? "Based only on current, source-verified documents in the approved barangay registry:"
    : "Batay lamang sa kasalukuyan at source-verified na dokumento sa approved barangay registry:";
  return { answer: preface + "\n\n" + blocks.join("\n\n"), citations, context_used: true, flagged: false };
}

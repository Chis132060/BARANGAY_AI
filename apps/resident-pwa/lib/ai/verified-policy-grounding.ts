/**
 * Server-side, source-gated answers from the CURRENT barangay database.
 *
 * The only legal authorities are staff-published policies and properly
 * provenance-verified documents. GENERAL knowledge chunks may contain
 * unverified fees/contact details and must never become a legal source.
 * Document-service entries are shown separately as application guidance.
 */
export type PolicyScope = "tandang_sora_butuan" | "butuan_city";
export type Language = "tgl" | "ceb" | "en";

type RegistryPolicy = {
  policy_number: string | null;
  title: string | null;
  description: string | null;
  full_text: string | null;
  enacted_by: string | null;
  jurisdiction_scope: string | null;
  source_reference: string | null;
};
type PublishedBarangayPolicy = {
  id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  content: string | null;
};
type Service = { name: string; description: string | null; requirements_json: unknown };
type KnowledgeChunk = {
  content: string | null;
  metadata: unknown;
  trust_level: string | null;
  published_at: string | null;
  source_domain: string | null;
};

type GroundedItem = { title: string; citation: string; body: string; scope: string; searchable: string };

const STOPWORDS = new Set([
  "ano", "ang", "mga", "nang", "ng", "sa", "may", "para", "tungkol",
  "paano", "pano", "yong", "iyong", "aking", "anong", "lang", "ba",
  "what", "which", "does", "are", "our", "the", "and", "about", "there",
  "barangay", "brgy", "butuan", "city", "tandang", "sora", "poblacion",
  "policy", "policies", "policys", "polisiya", "ordinance", "ordinances",
  "ordinansa", "ordinansiya", "batas", "rules", "rule", "patakaran",
  "balaod", "regulation", "regulasyon", "listahan", "lahat", "available",
  "document", "documents", "service", "services", "serbisyo", "dokumento",
  "requirements", "requirement", "rekisitos", "kailangan", "kinahanglan",
  "need", "apply", "application", "kuha", "kumuha", "request", "mag",
  "yung", "meron", "laman", "namin", "natin", "atin", "doon", "rito",
  "pambansang", "national", "philippine", "pilipinas", "bansa", "batasan",
  "regarding", "law", "laws", "legal", "gusto", "malaman", "list", "available", "nandoon",
]);

export function isPolicyQuestion(message: string): boolean {
  return /(?:^|[^a-z])(?:polic(?:y|ies|ys)|polisiya|ordinance|ordinances|ordinansa|ordinansiya|patakaran|batas|balaod|lagda|curfew|multa|fine|penalty|penalties|noise|karaoke|regulation|regulasyon|zoning|sanitation|solid waste|basura|garbage|smoking|traffic rule|resolution|reklamo|magreklamo|sumbong|kapitbahay|away|gulo|pananakit|nananakit|abuso|abuse|harass(?:ment)?|bastos|threat|banta|marital|asawa|protection order|evacuation|bagyo|baha|disaster|data privacy|jobseeker|job seeker|first time job|senior citizen|pwd|child abuse|bata|bullying|diskriminasyon|discrimination|labor rights)(?:$|[^a-z])/i.test(message);
}

export function isServiceInformationQuestion(message: string): boolean {
  return /(?:^|[^a-z])(?:serbisyo|services?|dokumento|documents?|requirements?|rekisitos|kinahanglan|kailangan|paano|pagkuha|how to apply)(?:$|[^a-z])/i.test(message);
}

export function isWrongBarangayQuestion(message: string): boolean {
  return /quezon\s+city|district\s*6\b|novaliches/i.test(message);
}

function significantTerms(message: string): string[] {
  return [...new Set(message.toLowerCase().normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length >= 4 && !STOPWORDS.has(word)))].slice(0, 14);
}

function excerpt(text: string, terms: string[], max = 700): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLocaleLowerCase();
  const offsets = terms.map(t => lower.indexOf(t)).filter(x => x >= 0);
  const start = offsets.length ? Math.max(0, Math.min(...offsets) - 130) : 0;
  return (start ? "…" : "") + clean.slice(start, start + max) +
    (clean.length > start + max ? "…" : "");
}

function matchesTerms(item: string, terms: string[]): boolean {
  return !terms.length || terms.some(term => item.toLowerCase().includes(term));
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

async function loadServiceCatalog(supabase: any): Promise<Service[] | null> {
  const { data, error } = await supabase.from("document_types")
    .select("name,description,requirements_json").limit(50);
  if (error || !Array.isArray(data)) return null;
  return data.filter((service: Service) => safeText(service.name).length > 0);
}

function relevantServices(services: Service[], terms: string[]): Service[] {
  if (!terms.length) return services.slice(0, 6);
  return services.filter(service => {
    // Do not treat text inside an unrelated service's requirements as a title match.
    const name = safeText(service.name).toLowerCase();
    return terms.some(term => name.includes(term));
  }).slice(0, 5);
}

function serviceBlock(service: Service, lang: Language): string {
  const requirements = Array.isArray(service.requirements_json)
    ? service.requirements_json.filter((v: unknown) => typeof v === "string")
      .map((v: string) => safeText(v)).filter(Boolean).slice(0, 12)
    : [];
  const title = safeText(service.name);
  const description = safeText(service.description).slice(0, 500);
  const reqLabel = lang === "en" ? "Requirements listed in the service catalog" :
    lang === "ceb" ? "Mga rekisitos sa service catalog" : "Mga requirement sa service catalog";
  return title + (description ? "\n" + description : "") +
    (requirements.length ? "\n" + reqLabel + ": " + requirements.join("; ") : "");
}

function serviceNote(language: Language): string {
  if (language === "en") return "These are current service-catalog entries, NOT ordinances. You can request a listed document in Ate Sora's form; staff review follows submission. Confirm fees and schedules with staff.";
  if (language === "ceb") return "Kini mga impormasyon sa service catalog, DILI mga ordinansa. Mahimo kang mag-apply dinhi sa Ate Sora; repasohon sa staff ang request. Kumpirmaha sa barangay ang bayad ug iskedyul.";
  return "Mga impormasyon ito mula sa service catalog, HINDI mga ordinansa. Maaari kang mag-request gamit ang form sa Ate Sora; rerepasuhin ito ng staff. Kumpirmahin sa barangay ang bayad at schedule.";
}

export async function getVerifiedServiceAnswer(
  supabase: any, message: string, language: Language
) {
  const services = await loadServiceCatalog(supabase);
  if (!services) return null;
  const terms = significantTerms(message);
  const matched = relevantServices(services, terms);
  if (!matched.length) return null;
  const intro = language === "en" ? "From the live barangay document-service catalog:" :
    language === "ceb" ? "Gikan sa kasamtangang barangay document-service catalog:" :
    "Mula sa kasalukuyang barangay document-service catalog:";
  return {
    answer: intro + "\n\n" + matched.map(s => serviceBlock(s, language)).join("\n\n") +
      "\n\n" + serviceNote(language),
    citations: matched.map(s => "Barangay document-service catalog: " + safeText(s.name)),
    context_used: true,
    flagged: false,
  };
}

export async function getVerifiedPolicyAnswer(
  supabase: any, message: string, language: Language
) {
  const localityLabel = "Barangay Tandang Sora (Poblacion), Butuan City";
  if (isWrongBarangayQuestion(message)) {
    const answer = language === "en"
      ? "This portal serves " + localityLabel + ", not Tandang Sora in Quezon City. Another barangay's policies cannot be described as local rules here."
      : "Ang portal na ito ay para sa " + localityLabel + ", hindi sa Tandang Sora, Quezon City. Hindi ko ituturing na lokal na ordinansa rito ang ibang barangay.";
    return { answer, citations: [] as string[], context_used: false, flagged: true };
  }

  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [official, barangay, knowledge, services] = await Promise.all([
    supabase.from("policies")
      .select("policy_number,title,full_text,description,enacted_by,jurisdiction_scope,source_reference")
      .eq("status", "Active")
      .in("jurisdiction_scope", ["tandang_sora_butuan", "butuan_city"])
      .or("effective_date.is.null,effective_date.lte." + today)
      .or("expiry_date.is.null,expiry_date.gte." + today)
      .limit(100),
    supabase.from("barangay_policies")
      .select("id,title,category,description,content")
      .eq("status", "Published")
      .or("effective_date.is.null,effective_date.lte." + today)
      .or("expiration_date.is.null,expiration_date.gte." + today)
      .limit(100),
    // GENERAL or unverified uploaded PDFs may make false fee, income or
    // contact assertions. Only indexed chunks marked VERIFIED/AUTHORITATIVE
    // with publication metadata and an explicit Butuan jurisdiction qualify.
    supabase.from("knowledge_chunks")
      .select("content,metadata,trust_level,published_at,source_domain")
      .in("trust_level", ["VERIFIED", "AUTHORITATIVE"])
      .not("published_at", "is", null)
      .limit(100),
    loadServiceCatalog(supabase),
  ]);

  const items: GroundedItem[] = [];
  if (!official.error && Array.isArray(official.data)) {
    for (const row of official.data as RegistryPolicy[]) {
      if (!safeText(row.source_reference) || safeText(row.source_reference).length < 12 ||
          !safeText(row.policy_number) || !safeText(row.enacted_by) ||
          safeText(row.full_text).length < 40) continue;
      const scope = row.jurisdiction_scope === "butuan_city"
        ? "Butuan City-wide; not a barangay-issued ordinance" : "Barangay Tandang Sora";
      items.push({
        title: safeText(row.title),
        citation: safeText(row.policy_number) + " — " + safeText(row.title) +
          " [" + scope + "]; Primary source: " + safeText(row.source_reference),
        body: safeText(row.full_text),
        scope,
        searchable: [row.title, row.description, row.full_text].map(safeText).join(" "),
      });
    }
  }
  if (!barangay.error && Array.isArray(barangay.data)) {
    for (const row of barangay.data as PublishedBarangayPolicy[]) {
      if (!safeText(row.title) || safeText(row.content).length < 40) continue;
      items.push({
        title: safeText(row.title),
        citation: "Published barangay policy registry: " + safeText(row.title) +
          " (record " + String(row.id) + "; category: " + safeText(row.category) + ")",
        body: safeText(row.content),
        scope: "Staff-published barangay policy; confirm ordinance number with the office",
        searchable: [row.title,row.category,row.description,row.content].map(safeText).join(" "),
      });
    }
  }
  if (!knowledge.error && Array.isArray(knowledge.data)) {
    for (const row of knowledge.data as KnowledgeChunk[]) {
      if (safeText(row.content).length < 40 || !row.published_at ||
          !["VERIFIED", "AUTHORITATIVE"].includes(row.trust_level ?? "")) continue;
      const meta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown> : {};
      const scope = safeText(meta.jurisdiction_scope);
      const source = safeText(meta.source_reference) || safeText(meta.source);
      if (!["tandang_sora_butuan", "butuan_city", "philippines"].includes(scope) || source.length < 12) continue;
      // Verified references are restricted to government primary sources.
      // Database metadata can be edited, so never trust arbitrary external URLs.
      let officialUrl: URL;
      try { officialUrl = new URL(source); } catch { continue; }
      if (officialUrl.protocol !== "https:" || !/(?:^|\.)gov\.ph$/i.test(officialUrl.hostname)) continue;
      const title = safeText(meta.title) || "Verified government reference";
      const keywords = Array.isArray(meta.keywords) ? meta.keywords.filter((v): v is string => typeof v === "string").slice(0, 35) : [];
      const isNational = scope === "philippines";
      const isCityIndex = safeText(meta.authority) === "city_code_index";
      items.push({
        title,
        citation: (isNational ? "Philippine national law: " : isCityIndex ? "Butuan City code index: " : "Verified published document: ") +
          title + " [" + scope + "]; Official source: " + source,
        body: safeText(row.content),
        scope: isNational ? "National law applicable in the Philippines, not a barangay ordinance"
          : scope === "butuan_city" ? "Butuan City-wide" : "Barangay Tandang Sora",
        searchable: [title, safeText(row.content), ...keywords].join(" "),
      });
    }
  }

  const terms = significantTerms(message);
  const chosen = items.filter(item =>
    matchesTerms(item.searchable, terms)).slice(0, terms.length ? 4 : 7);
  const serviceMatches = Array.isArray(services) ? relevantServices(services, terms) : [];
  const citations = chosen.map(item => item.citation);
  const text = chosen.map(item =>
    item.citation + "\n" + (item.scope.includes("National") ? "General legal guidance from source: " : "Published record summary: ") + excerpt(item.body, terms)).join("\n\n");
  const intro = language === "en"
    ? "These are the matching government-source-linked legal references. National laws, city codes and barangay ordinances are different authorities:"
    : language === "ceb"
      ? "Kini ang mga legal references gikan sa opisyal nga government sources; lahi ang national laws, city codes ug barangay ordinances:"
      : "Ito ang mga legal reference mula sa opisyal na government sources. Magkaiba ang pambansang batas, city code at barangay ordinance:";
  const noPolicy = official.error || barangay.error
    ? (language === "en"
      ? "The policy registry cannot be fully checked right now. I cannot confirm a local ordinance; please verify with barangay staff."
      : "Hindi ma-check nang buo ang policy registry ngayon. Hindi ko makumpirma ang lokal na ordinansa; pakiverify sa barangay.")
    : (language === "en"
      ? "No matching currently published and source-verified ordinance is available in the barangay registry. I will not invent fines or other legal rules."
      : "Wala pang matching na kasalukuyang published at source-verified na ordinansa sa barangay registry. Hindi ako mag-iimbento ng multa o ibang batas.");
  const canShowServices = !terms.length || serviceMatches.length > 0;
  const servicesSection = canShowServices && serviceMatches.length
    ? "\n\n" + (language === "en" ? "Available document services (separate from laws):" :
      "Available na document services (hiwalay sa mga batas):") +
      "\n\n" + serviceMatches.map(s => serviceBlock(s, language)).join("\n\n") +
      "\n\n" + serviceNote(language)
    : "";
  if (!chosen.length) {
    return {
      answer: noPolicy + servicesSection,
      citations: serviceMatches.map(s => "Barangay document-service catalog: " + safeText(s.name)),
      context_used: canShowServices && serviceMatches.length > 0,
      flagged: true,
    };
  }
  return {
    answer: intro + "\n\n" + text + servicesSection,
    citations: [...citations, ...(
      canShowServices ? serviceMatches.map(s => "Barangay document-service catalog: " + safeText(s.name)) : []
    )],
    context_used: true,
    flagged: false,
  };
}

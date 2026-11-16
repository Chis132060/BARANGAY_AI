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
type VerifiedLegalSource = {
  title: string;
  source_url: string;
  jurisdiction_scope: string;
  authority: string;
  summary: string;
  keywords: unknown;
  status: string;
  verified_at: string | null;
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
  "hey", "hello", "could", "give", "tell", "show", "please", "kayo", "ate", "ako", "aking", "mo", "naman", "din", "na", "sige",
]);

export function isPolicyQuestion(message: string): boolean {
  return /(?:^|[^a-z])(?:polic(?:y|ies|ys)|polisiya|ordinance|ordinances|ordinansa|ordinansiya|patakaran|batas|balaod|lagda|curfew|multa|fine|penalty|penalties|noise|karaoke|regulation|regulasyon|zoning|sanitation|solid waste|basura|garbage|smoking|traffic rule|resolution|reklamo|magreklamo|sumbong|kapitbahay|away|gulo|pananakit|nananakit|sinasaktan|sinaktan|binubugbog|bugbog|saktan|pananakot|pinagbabantaan|abuso|abuse|harass(?:ment)?|bastos|threat|banta|marital|asawa|protection order|evacuation|bagyo|baha|disaster|data privacy|jobseeker|job seeker|first time job|senior citizen|pwd|child abuse|bata|bullying|diskriminasyon|discrimination|labor rights)(?:$|[^a-z])/i.test(message);
}

function isPersonalSafetyDisclosure(message: string): boolean {
  // Situation detection only. Law numbers and remedies still come from live records.
  const harm = /\b(?:sinasaktan|sinaktan|binubugbog|sinusuntok|nananakit|pinagbabantaan|abuso|abuse|hurting|beating|hitting|threatening)\b/i;
  const selfOrFamily = /\b(?:ako|aking|akin|ko|kami|namin|asawa|anak|partner|me|my|mine|us|mother|daughter)\b/i;
  return harm.test(message) && selfOrFamily.test(message);
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
  // Prefer the best matching title. A query for Certificate of Indigency
  // must not return Certificate of Residency just because both share "Certificate".
  const ranked = services.map(service => ({
    service,
    score: terms.filter(term => safeText(service.name).toLowerCase().includes(term)).length,
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? 0;
  return ranked.filter(item => item.score === best).slice(0, 5).map(item => item.service);
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
    // Raw knowledge_chunks are intentionally private, even for residents.
    // Use the separately reviewed, RLS-protected published legal catalog.
    supabase.from("verified_legal_sources")
      .select("title,source_url,jurisdiction_scope,authority,summary,keywords,status,verified_at")
      .eq("status", "Published")
      .not("verified_at", "is", null)
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
    for (const row of knowledge.data as VerifiedLegalSource[]) {
      // Defense in depth: enforce the same source gates beyond Supabase RLS.
      if (row.status !== "Published" || !row.verified_at ||
          safeText(row.summary).length < 40) continue;
      const scope = safeText(row.jurisdiction_scope);
      const source = safeText(row.source_url);
      const authority = safeText(row.authority);
      if (!["tandang_sora_butuan", "butuan_city", "philippines"].includes(scope) ||
          !["national_law", "city_code_index", "barangay_policy"].includes(authority)) continue;
      // A government hostname is mandatory. Do not accept lookalike domains.
      let officialUrl: URL;
      try { officialUrl = new URL(source); } catch { continue; }
      if (officialUrl.protocol !== "https:" || !/(?:^|\.)gov\.ph$/i.test(officialUrl.hostname)) continue;
      const title = safeText(row.title);
      if (!title) continue;
      const keywords = Array.isArray(row.keywords)
        ? row.keywords.filter((v): v is string => typeof v === "string").slice(0, 35) : [];
      const isNational = scope === "philippines";
      const isCityIndex = authority === "city_code_index";
      items.push({
        title,
        citation: (isNational ? "Philippine national law: " : isCityIndex ? "Butuan City code index: " : "Verified barangay policy: ") +
          title + " [" + scope + "]; Official source: " + source,
        body: safeText(row.summary),
        scope: isNational ? "National law applicable in the Philippines, not a barangay ordinance"
          : isCityIndex ? "Butuan City-wide; index entry is not the complete ordinance"
          : "Barangay Tandang Sora",
        searchable: [title, safeText(row.summary), ...keywords].join(" "),
      });
    }
  }

  const terms = significantTerms(message);
  // Generic "give me a policy" is an invitation to converse, not to select
  // an arbitrary law (formerly the first row, e.g. Data Privacy).
  if (!terms.length) {
    const exampleTitles = items.slice(0, 5).map(item => item.title);
    const examples = exampleTitles.length ? "\n\n" +
      (language === "en" ? "Some available official topics: " : "May mga official reference ako gaya ng: ") +
      exampleTitles.join("; ") + "." : "";
    const answer = language === "en"
      ? "Of course, I can help. What happened or which barangay policy do you need? You can ask about a complaint, documents, safety or another concern. I'll explain what you can do next and cite the relevant official source."
      : language === "ceb"
        ? "Oo, tabangan tika. Unsa imong kabalaka o unsang policy ang imong gipangita? Isulti lang ang sitwasyon aron matagaan tika ug sunod nga lakang ug opisyal nga source."
        : "Oo naman, tutulungan kita. Anong problema o patakaran ang gusto mong malaman? Kuwento mo lang ang sitwasyon, at tutulungan kitang malaman ang puwedeng gawin at ang tamang opisyal na sanggunian.";
    return { answer: answer + examples, citations: [] as string[], context_used: items.length > 0,
      flagged: items.length === 0 };
  }
  // Brief overview on mobile; residents can ask a follow-up for a specific law.
  const ranked = items.map(item => ({
    item,
    relevance: terms.filter(term => item.searchable.toLowerCase().includes(term)).length,
  })).filter(entry => !terms.length || entry.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
  const chosen = ranked.slice(0, terms.length ? 4 : 5).map(entry => entry.item);
  const serviceMatches = Array.isArray(services) ? relevantServices(services, terms) : [];
  if (isPersonalSafetyDisclosure(message) && chosen.length) {
    const relevant = chosen[0];
    // Safety-first natural language, followed by content from a published
    // government reference. No hardcoded law, fine, office address or fee.
    const opener = language === "en"
      ? "I'm sorry you're going through this. Your safety matters. If you are in immediate danger, move somewhere safe if you can and contact police or emergency services."
      : language === "ceb"
        ? "Nasubo ko sa imong giagian. Importante ang imong kaluwasan. Kung naa kay dayong hulga, adto sa luwas nga lugar kon mahimo ug pangayo dayon ug tabang sa pulis o emergency responders."
        : "Nalulungkot akong marinig na nararanasan mo ito. Mahalaga ang kaligtasan mo. Kung may agarang panganib, pumunta sa ligtas na lugar kung kaya at humingi agad ng tulong sa pulis o emergency responders.";
    const guidance = language === "en" ? "Here's what the official guidance says you can do:" :
      language === "ceb" ? "Mao ni ang mahimo nimong buhaton sumala sa opisyal nga source:" :
      "Batay sa opisyal na gabay, ito ang puwede mong gawin:";
    const question = language === "en" ? "Are you safe to talk right now? You don't need to share your address or identifying details." :
      language === "ceb" ? "Luwas ba ka nga makig-istorya karon? Dili kinahanglan ihatag ang imong adres o personal nga detalye." :
      "Ligtas ka bang makipag-usap ngayon? Hindi mo kailangang ibigay ang address o personal na detalye mo.";
    return {
      answer: opener + "\n\n" + guidance + "\n" + relevant.title + "\n" + excerpt(relevant.body, terms, 850) +
        "\n\n" + question,
      citations: [relevant.citation],
      context_used: true, flagged: false,
    };
  }

  const citations = chosen.map(item => item.citation);
  const text = chosen.map(item => excerpt(item.body, terms, 650)).join("\n\n");
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
  const matchedBarangay = chosen.some(item => item.scope.includes("Barangay Tandang Sora") ||
    item.scope.startsWith("Staff-published barangay"));
  const localDisclosure = !matchedBarangay && /barangay|brgy|tandang/i.test(message)
    ? (language === "en"
      ? "I cannot confirm a matching barangay-issued ordinance in the approved local registry. The references below are national laws or city-code sources, not new barangay ordinances.\n\n"
      : "Wala pang matching na barangay-issued ordinance na verified sa approved local registry. Ang mga reference sa ibaba ay pambansang batas o Butuan City code sources, hindi bagong barangay ordinance.\n\n")
    : "";
  return {
    answer: (language === "en" ? "I can help you figure out what to do. Based on the published source I found:\n\n" :
      language === "ceb" ? "Tabangan tika. Base sa opisyal nga reference:\n\n" :
      "Sige, tutulungan kita. Batay sa opisyal na impormasyong nakita ko:\n\n") +
      localDisclosure + text + servicesSection +
      (language === "en" ? "\n\nTell me a little more about what happened so we can work out the best next step." :
        language === "ceb" ? "\n\nUnsa pa ang nahitabo? Tabangan tika sa sunod nga lakang." :
        "\n\nGusto mo bang ikuwento nang kaunti kung ano ang nangyari para matulungan kitang piliin ang susunod na hakbang?") +
      (!terms.length ? "\n\n" + (language === "en" ? "Ask me about a specific concern to see the most relevant law and next steps." : "Ikwento ang partikular na problema para makita ang pinakaangkop na batas at susunod na hakbang.") : ""),
    citations: [...citations, ...(
      canShowServices ? serviceMatches.map(s => "Barangay document-service catalog: " + safeText(s.name)) : []
    )],
    context_used: true,
    flagged: false,
  };
}

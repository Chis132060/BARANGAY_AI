/**
 * Read-only, zero-network Ate Sora service information for the resident PWA.
 *
 * Cached rows are the names/descriptions already visible in the authenticated
 * app document catalog, NOT official fees, eligibility, requirements, policies,
 * or permission to submit anything. Never cache chat messages or personal data.
 */
export type OfflineGuideLanguage = "tgl" | "ceb" | "en";
export type OfflineDocument = { id?: string; name: string; description?: string | null };
export type OfflineDocumentSnapshot = {
  data: OfflineDocument[];
  cachedAt: number;
  stale: boolean;
} | null;
export type OfflineGuideReply = { answer: string; savedCatalogUsed: boolean };

const SHORTCUTS = [
  { title: "Barangay Clearance", matches: /\b(?:barangay|brgy)\s+clearance\b|\bclearance\b/i },
  { title: "Certificate of Indigency", matches: /\bindigency\b|\bkakabus\b/i },
  { title: "Certificate of Residency", matches: /\bresiden(?:cy|ce)\b|\bpaninirahan\b|\blumulupyo\b/i },
  { title: "Business Clearance", matches: /\bbusiness\s+(?:clearance|permit)\b|\bpermit\s+(?:sa|ng)\s+negosyo\b/i },
] as const;

const GENERAL_SERVICES = /\b(?:services?|serbisyo|servisyo|document(?:s)?|dokumento|certificate(?:s)?|sertipiko|mga\s+clearance|unsay\s+(?:mga\s+)?serbisyo|ano(?:-ano)?\s+(?:ang\s+)?serbisyo)\b/i;
const PROGRAM_INFO = /\b(?:barangay\s+programs?|community\s+programs?|mga\s+programa|programa\s+sa\s+barangay|ayuda|assistance\s+programs?)\b/i;
const NEEDS_ONLINE_SOURCE = /\b(?:ordinan[sc]|batas|law|policy|policies|patakaran|curfew|fine|penalty|multas?|bayad|magkano|price|cost|fee|fees|libre|free|office\s+hours|oras\s+(?:ng\s+)?opisina|schedule|iskedyul)\b/i;
// Important resident crises should not be misclassified as a routine document FAQ.
const RESIDENT_CRISIS = /\b(?:ninakawan|nakawan|sinaktan|sinasaktan|pang-aabuso|inaabuso|violence|abuse|assault|rape|pinagbabantaan|threat|emergency|wala\s+(?:kaming|akong)\s+makain|gutom\s+na)\b/i;
const DIRECT_SUBMISSION = /\b(?:submit|ipasa\s+ang\s+(?:form|request)|i\s+want\s+to\s+request|mag-apply\s+ako|gusto\s+kong\s+mag-apply|mag-request\s+ako)\b/i;

const clean = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

function safeDocuments(snapshot: OfflineDocumentSnapshot): OfflineDocument[] {
  if (!snapshot || !Array.isArray(snapshot.data)) return [];
  return snapshot.data.filter(doc =>
    !!doc && typeof doc.name === "string" &&
    clean(doc.name).length > 0 && clean(doc.name).length <= 120
  ).slice(0, 100);
}

function note(lang: OfflineGuideLanguage, snapshot: OfflineDocumentSnapshot): string {
  const when = snapshot && Number.isFinite(snapshot.cachedAt) && snapshot.cachedAt > 0
    ? new Date(snapshot.cachedAt).toLocaleString("en-PH", { dateStyle: "medium" })
    : null;
  if (lang === "ceb") return snapshot
    ? "Offline guide gikan sa na-save nga app catalog" + (when ? " (" + when + ")" : "") +
      ". Posibleng karaan na kini; dili kini kumpirmasyon sa karong rekisitos, bayad o availability."
    : "Wala pay na-save nga opisyal nga service catalog sa device. Kini nga giya kay navigation ra.";
  if (lang === "en") return snapshot
    ? "Offline guide from the saved app catalog" + (when ? " (" + when + ")" : "") +
      ". It may be outdated and does not verify current requirements, fees or availability."
    : "No service catalog has been saved on this device yet. This is navigation guidance only.";
  return snapshot
    ? "Offline guide mula sa naka-save na app catalog" + (when ? " (" + when + ")" : "") +
      ". Maaaring luma na ito; hindi pa verified ang kasalukuyang requirements, bayad o availability."
    : "Wala pang saved service catalog sa device. Gabay sa paggamit ng app lamang ito.";
}

function reconnectMessage(lang: OfflineGuideLanguage): string {
  if (lang === "ceb") return "Pag-online na, ablihi ang Ate Sora aron ma-verify ang requirements ug mag-request. Walay application nga na-submit o na-queue gikan niining tubaga.";
  if (lang === "en") return "Reconnect to verify current requirements or request a document in Ate Sora. This answer did not submit or queue an application.";
  return "Kapag online na, bumalik kay Ate Sora para i-verify ang requirements o mag-request. Walang application na na-submit o na-queue mula sa sagot na ito.";
}

function sourceDescription(doc: OfflineDocument, lang: OfflineGuideLanguage): string {
  if (typeof doc.description !== "string" || !clean(doc.description)) return "";
  // The description is untrusted content for display, never executable instructions.
  const description = clean(doc.description).slice(0, 380);
  if (lang === "ceb") return "Na-save nga deskripsyon sa serbisyo: " + description;
  if (lang === "en") return "Saved service description: " + description;
  return "Naka-save na paglalarawan ng serbisyo: " + description;
}

export function buildOfflineServiceReply(
  question: string,
  lang: OfflineGuideLanguage,
  snapshot: OfflineDocumentSnapshot
): OfflineGuideReply | null {
  if (typeof question !== "string" || !question.trim() || question.length > 4000) return null;
  const query = clean(question).toLowerCase();
  if (RESIDENT_CRISIS.test(query) || DIRECT_SUBMISSION.test(query)) return null;

  const rows = safeDocuments(snapshot);
  const business = SHORTCUTS[3].matches.test(query);
  const matches = SHORTCUTS.filter(service => service.matches.test(query) &&
    !(business && service.title === "Barangay Clearance"));
  const multiple = matches.length > 1;
  const exact = matches.length === 1 ? matches[0] : null;
  const isGeneral = GENERAL_SERVICES.test(query);
  const isProgram = PROGRAM_INFO.test(query);
  const asksCurrentFacts = NEEDS_ONLINE_SOURCE.test(query);
  if (!exact && !multiple && !isGeneral && !isProgram && !asksCurrentFacts) return null;

  const intro = note(lang, snapshot && rows.length ? snapshot : null);
  const ending = reconnectMessage(lang);
  const saved = !!snapshot && rows.length > 0;

  if (multiple) {
    const titles = matches.map(s => s.title).join(", ");
    const ask = lang === "ceb" ? "Unsa nga dokumento ang una nimong gustong hisgutan?"
      : lang === "en" ? "Which document would you like to ask about first?"
      : "Aling dokumento ang gusto mong unahin?";
    return { answer: [intro, titles + ". " + ask, ending].join("\n\n"), savedCatalogUsed: saved };
  }

  if (exact) {
    const doc = rows.find(row => clean(row.name).toLowerCase() === exact.title.toLowerCase());
    const opening = lang === "ceb"
      ? "Mahimo tika matabangan sa impormasyon mahitungod sa " + exact.title + "."
      : lang === "en"
        ? "I can help with information about " + exact.title + "."
        : "Matutulungan kita sa impormasyon tungkol sa " + exact.title + ".";
    const detail = doc ? sourceDescription(doc, lang) : (lang === "ceb"
      ? "Walay na-save nga detalye sa maong dokumento. Dili nako makumpirma kung available kini karon."
      : lang === "en"
        ? "No saved details for this document. Its current availability cannot be confirmed offline."
        : "Walang naka-save na detalye para sa dokumentong ito. Hindi makumpirma offline kung available ito ngayon.");
    return {
      answer: [opening, intro, detail, ending].filter(Boolean).join("\n\n"),
      savedCatalogUsed: !!doc,
    };
  }

  if (isProgram) {
    const body = lang === "ceb"
      ? "Para sa mga programa ug ayuda, tan-awa ang na-save nga Programs sa Updates o View offline help. Dili pa makumpirma offline ang eligibility, petsa, o slots."
      : lang === "en"
        ? "For community programs and assistance, review saved Programs in Updates or View offline help. Eligibility, dates and slots cannot be verified offline."
        : "Para sa mga programa at ayuda, tingnan ang naka-save na Programs sa Updates o View offline help. Hindi ma-verify offline ang eligibility, petsa o slots.";
    return { answer: [intro, body, ending].join("\n\n"), savedCatalogUsed: saved };
  }

  if (isGeneral) {
    const names = rows.map(row => "• " + clean(row.name)).slice(0, 20);
    const list = names.length ? names.join("\n") : (lang === "ceb"
      ? "Sa app adunay pangutana kabahin sa Barangay Clearance, Business Clearance, Certificate of Indigency ug Certificate of Residency. Dili pa kini verified nga current catalog."
      : lang === "en"
        ? "The app has shortcuts for Barangay Clearance, Business Clearance, Certificate of Indigency and Certificate of Residency. This is not a verified current catalog."
        : "May shortcuts ang app para sa Barangay Clearance, Business Clearance, Certificate of Indigency at Certificate of Residency. Hindi ito kumpirmasyon ng kasalukuyang available services.");
    const title = lang === "ceb" ? "Na-save nga mga serbisyo:" : lang === "en" ? "Saved services:" : "Mga naka-save na serbisyo:";
    return { answer: [intro, names.length ? title + "\n" + list : list, ending].join("\n\n"), savedCatalogUsed: saved };
  }

  const unavailable = lang === "ceb"
    ? "Dili nako ma-verify ang kasamtangang ordinansa, bayad, office hours o polisiya samtang offline. Dili ko maghimo og numero sa ordinansa o kantidad."
    : lang === "en"
      ? "I cannot verify current ordinances, fees, office hours or policies while offline. I won't invent ordinance numbers or amounts."
      : "Hindi ko ma-verify ang kasalukuyang ordinansa, bayad, office hours o patakaran habang offline. Hindi ako mag-iimbento ng ordinance number o halaga.";
  return { answer: [unavailable, ending].join("\n\n"), savedCatalogUsed: false };
}

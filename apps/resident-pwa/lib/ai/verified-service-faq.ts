/**
 * Safe, token-free guidance for common requests in the resident portal.
 *
 * This module contains APPLICATION NAVIGATION only; no hardcoded fee, required ID,
 * office hours, eligibility decision, or ordinance is treated as an official fact.
 * The API must confirm the service is present in the authenticated, RLS-filtered
 * document_types catalog before returning application instructions.
 */
export type FaqLanguage = "tgl" | "ceb" | "en";
export type ServiceId = "clearance" | "indigency" | "residency" | "business";
export type ServiceFaq = { id: ServiceId; documentName: string; slug: string };

const SERVICES: readonly ServiceFaq[] = [
  { id: "clearance", documentName: "Barangay Clearance", slug: "clearance" },
  { id: "indigency", documentName: "Certificate of Indigency", slug: "indigency" },
  { id: "residency", documentName: "Certificate of Residency", slug: "residency" },
  { id: "business", documentName: "Business Clearance", slug: "business" },
];

const SERVICE_MATCHERS: Record<ServiceId, RegExp> = {
  clearance: /\b(?:barangay|brgy)\s+clearance\b|\bclearance\b/i,
  indigency: /\bindigency\b|\bsertipiko\s+(?:sa|ng)\s+(?:indigency|kakabus)\b/i,
  residency: /\bresiden(?:cy|ce)\b|\bpaninirahan\b|\blumulupyo\b/i,
  business: /\b(?:business\s+(?:clearance|permit)|permit\s+(?:sa|ng)\s+negosyo)\b/i,
};

const HOW_TO_INTENT =
  /\b(?:unsaon|unsay|unsa\s+(?:ang|mga)|pagkuha|pagkuhag|pangayo|kuhaon|paano|pano|pagkuha|makakuha|kumuha|mag-apply|magapply|apply|application|pag-apply|requirements?|rekisitos|kinahanglan|kailangan|how|request|get|obtain|steps?|guide|where\s+to\s+apply)\b/i;

// Such answers require a signed/current record rather than generic navigation.
const REQUIRES_CURRENT_OFFICIAL_FACT =
  /\b(?:fee|fees|bayad|magkano|presyo|pila|tagpila|price|cost|amount|libre|free|schedule|oras|office\s+hours|when|kanus-a|hours|processing\s+time|how\s+long|pickup\s+time|release\s+date|penalty|fine|curfew|ordinance|ordinansa|patakaran|policy|legal|eligible|eligibility)\b/i;

export function matchServiceFaq(query: string): ServiceFaq | null {
  if (typeof query !== "string") return null;
  const text = query.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  if (text.length < 9 || text.length > 220 || text.includes("@") || /\b\d{7,}\b/.test(text)) return null;
  if (!HOW_TO_INTENT.test(text) || REQUIRES_CURRENT_OFFICIAL_FACT.test(text)) return null;

  // "Business Clearance" contains "Clearance". Do not mistake a compound
  // question about *both* Barangay and Business Clearance for one service.
  const businessMentioned = SERVICE_MATCHERS.business.test(text);
  if (businessMentioned && /\b(?:barangay|brgy)\s+clearance\b/i.test(text)) return null;
  const matches = SERVICES.filter((service) =>
    SERVICE_MATCHERS[service.id].test(text) &&
    (service.id !== "clearance" || !businessMentioned)
  );
  return matches.length === 1 ? matches[0] : null;
}

export function buildServiceFaqAnswer(service: ServiceFaq, lang: FaqLanguage): string {
  const name = service.documentName;
  // This response is navigation guidance only. The in-chat form independently
  // loads the current document catalog and refuses submission if it cannot.
  if (lang === "ceb") return [
    "Para makapangayo og " + name + ":",
    "1. Ablihi ug pun-a ang application form nga makita ubos sa akong tubag dinhi sa chat.",
    "2. Basaha ang mga rekisitos gikan sa barangay document catalog ug i-attach ang mga gikinahanglan nga file.",
    "3. I-review ang imong mga detalye, unya i-submit. Hulata ang confirmation.",
    "4. Human sa successful submission, sa Requests tab na makita ang status.",
    "Dili pa nako ma-verify ang bayad o pickup schedule. Kumpirmaha kini sa barangay.",
  ].join("\n");
  if (lang === "tgl") return [
    "Para mag-request ng " + name + ":",
    "1. Punan ang application form na nasa ibaba ng sagot ko rito mismo sa chat.",
    "2. Basahin ang requirements mula sa barangay document catalog at i-attach ang hinihinging files.",
    "3. I-review ang detalye at i-submit. Hintayin ang confirmation.",
    "4. Pagkatapos ng successful submission, sa Requests tab makikita ang status.",
    "Hindi pa verified ang bayad o pickup schedule; kumpirmahin sa barangay.",
  ].join("\n");
  return [
    "To request " + name + ":",
    "1. Complete the application form shown below this reply in our chat.",
    "2. Check the requirements loaded from the barangay document catalog and attach the required files.",
    "3. Review and submit. Wait for the confirmation.",
    "4. After successful submission, track the status on the Requests tab.",
    "Fees and pickup times are not verified here; confirm with barangay staff.",
  ].join("\n");
}

export function buildServiceFaqUnavailable(service: ServiceFaq, lang: FaqLanguage): string {
  if (lang === "ceb") return "Dili nako ma-load ang kasamtangang online catalog alang sa " + service.documentName + ". Dili kini awtomatikong pasabot nga offline imong device. Palihug sulayi pag-usab; dili ma-submit ang form hangtod makumpirma ang mga rekisitos.";
  if (lang === "tgl") return "Hindi ma-load ang kasalukuyang service catalog para sa " + service.documentName + ". Hindi ibig sabihin nito na offline ang device mo. Subukan muli; hindi maipapasa ang form hangga't hindi makumpirma ang requirements.";
  return "The current catalog for " + service.documentName + " could not be loaded. This does not mean your device is offline. Try again; the form cannot be submitted until requirements are verified.";
}

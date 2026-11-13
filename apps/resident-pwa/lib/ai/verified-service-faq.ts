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

  const matches = SERVICES.filter((service) =>
    SERVICE_MATCHERS[service.id].test(text) &&
    (service.id !== "clearance" || !SERVICE_MATCHERS.business.test(text))
  );
  return matches.length === 1 ? matches[0] : null;
}

export function buildServiceFaqAnswer(service: ServiceFaq, lang: FaqLanguage): string {
  const name = service.documentName;
  if (service.id === "business") {
    if (lang === "ceb") return [
      "Para sa " + name + ", personal nga pag-adto ug appointment ang proseso nga gipakita sa Smart Barangay app.",
      "1. Adto sa Requests > Request Document ug pilia ang " + name + ".",
      "2. Gamiton ang Book an Appointment para sa personal nga pagproseso.",
      "3. Kumpirmaha sa Barangay Hall ang aktuwal nga mga rekisitos, bayad, ug iskedyul sa dili pa moadto.",
      "Wala pa nako ma-verify ang opisyal nga bayad o oras sa pagproseso.",
    ].join("\n");
    if (lang === "tgl") return [
      "Para sa " + name + ", personal na pagpunta at appointment ang prosesong ipinapakita sa Smart Barangay app.",
      "1. Buksan ang Requests > Request Document at piliin ang " + name + ".",
      "2. Gamitin ang Book an Appointment para sa personal na pagproseso.",
      "3. Kumpirmahin sa Barangay Hall ang aktuwal na requirements, bayad, at schedule bago pumunta.",
      "Hindi ko pa ma-verify ang opisyal na bayad o processing time.",
    ].join("\n");
    return [
      "For " + name + ", the Smart Barangay app currently directs residents to an in-person appointment.",
      "1. Open Requests > Request Document and choose " + name + ".",
      "2. Use Book an Appointment for the in-person process.",
      "3. Confirm current requirements, fees, and schedules with the barangay before visiting.",
      "I cannot verify the official fee or processing time.",
    ].join("\n");
  }

  if (lang === "ceb") return [
    "Para makapangayo og " + name + " sa Smart Barangay:",
    "1. Ablihi ang Requests > Request Document.",
    "2. Pilia ang " + name + ".",
    "3. Isulat ang purpose ug i-upload ang mga file nga gipangayo sa online form.",
    "4. I-review ang details ug i-submit kung online ka.",
    "5. Tan-awa ang status sa Requests human makumpirma ang submission.",
    "Ang mga rekisitos sa form, bayad, ug pickup schedule kinahanglan kumpirmahon sa Barangay Hall; dili pa nako ma-verify ang opisyal nga mga detalye.",
  ].join("\n");
  if (lang === "tgl") return [
    "Para mag-request ng " + name + " sa Smart Barangay:",
    "1. Buksan ang Requests > Request Document.",
    "2. Piliin ang " + name + ".",
    "3. Ilagay ang purpose at i-upload ang mga file na hinihingi ng online form.",
    "4. I-review ang detalye at mag-submit kapag online.",
    "5. Tingnan ang status sa Requests pagkatapos makumpirma ang submission.",
    "Kumpirmahin sa Barangay Hall ang kasalukuyang requirements, bayad, at pickup schedule; hindi pa verified ang mga opisyal na detalyeng iyon.",
  ].join("\n");
  return [
    "To request " + name + " in Smart Barangay:",
    "1. Open Requests > Request Document.",
    "2. Select " + name + ".",
    "3. Enter your purpose and upload any files requested by the online form.",
    "4. Review and submit while connected to the internet.",
    "5. Track the request in Requests after successful submission.",
    "Confirm official requirements, fees, and pickup times with barangay staff; those details are not verified here.",
  ].join("\n");
}

export function buildServiceFaqUnavailable(service: ServiceFaq, lang: FaqLanguage): string {
  if (lang === "ceb") return "Dili pa nako makumpirma kung available karon ang " + service.documentName + " sa online catalog. Tan-awa ang Requests > Request Document o pangutana sa Barangay Hall. Wala koy ma-verify nga bayad o iskedyul.";
  if (lang === "tgl") return "Hindi ko pa makumpirma kung available ngayon ang " + service.documentName + " sa online catalog. Tingnan ang Requests > Request Document o magtanong sa Barangay Hall. Wala pa akong verified na bayad o schedule.";
  return "I can't confirm whether " + service.documentName + " is currently available in the online service catalog. Check Requests > Request Document or contact barangay staff. Fees and schedules are not verified.";
}

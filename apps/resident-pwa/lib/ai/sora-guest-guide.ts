/**
 * Bounded, public-only guidance for guests. This is deliberately NOT a model,
 * not a substitute for verified policy/catalog data, and never contacts the
 * authenticated AI API or reads residents' messages.
 */
export type GuestGuideLanguage = "tgl" | "ceb" | "en";
export type GuestGuideReply = { text: string; needsSignIn: boolean };

const greetings = /^(?:hi+|hey+|hello+|kumusta|kamusta|musta|good\s+(?:morning|afternoon|evening)|magandang\s+(?:umaga|hapon|gabi)|maayong\s+(?:buntag|udto|hapon|gabii))[!?.\s]*$/i;
const crisis = /\b(?:ninakawan|nakawan|sinasaktan|sinaktan|abuse|inaabuso|violence|assault|rape|threatened|pinagbabantaan|emergency|sunog|fire|walang\s+(?:kaming|akong)\s+makain|gutom|walay\s+pagkaon)\b/i;
const policy = /\b(?:ordinan(?:sa|ce|ces)|batas|law|policy|policies|patakaran|penalty|fine|multa|curfew|bayad|magkano|fee|fees|office\s+hours|iskedyul|schedule|requirements?|rekisitos|eligib(?:le|ility))\b/i;
const service = /\b(?:barangay\s+services?|services?|serbisyo|servisyo|document(?:s)?|dokumento|certificate(?:s)?|sertipiko|clearances?)\b/i;
const documentTopics: ReadonlyArray<{ title: string; pattern: RegExp }> = [
  { title: "Business Clearance", pattern: /\bbusiness\s+(?:clearance|permit)\b|\bpermit\s+(?:sa|ng)\s+negosyo\b/i },
  { title: "Barangay Clearance", pattern: /\b(?:barangay|brgy)\s+clearance\b|\bclearance\b/i },
  { title: "Certificate of Indigency", pattern: /\bindigency\b|\bkakabus\b/i },
  { title: "Certificate of Residency", pattern: /\bresiden(?:cy|ce)\b|\bpaninirahan\b|\blumulupyo\b/i },
];

/** Never imply that a public shortcut guarantees availability or eligibility. */
export function getGuestGuideReply(question: string, lang: GuestGuideLanguage): GuestGuideReply {
  const query = typeof question === "string" ? question.normalize("NFKC").trim().slice(0, 4000) : "";
  const privacy = lang === "ceb"
    ? "Guest Quick Guide ra kini. Wala nay na-submit nga request ug walay personal nga chat history nga gi-save."
    : lang === "en"
      ? "This is a general Guest Quick Guide. No application was submitted or personal chat history saved."
      : "Guest Quick Guide lamang ito. Walang request na na-submit at walang personal chat history na na-save.";
  const signIn = lang === "ceb"
    ? "Mag-sign in aron makagamit sa live AI, ma-verify ang mga rekord ug masubay ang requests."
    : lang === "en"
      ? "Sign in for live AI answers, verified records and request tracking."
      : "Mag-sign in para sa live AI answers, verified records at request tracking.";

  if (greetings.test(query)) {
    const greeting = lang === "ceb"
      ? "Maayong adlaw! Ako si Ate Sora. Pwede ka mangutana bahin sa barangay services ug mga dokumento. Unsa akong ikatabang?"
      : lang === "en"
        ? "Hello! I'm Ate Sora. You can ask about barangay services and documents. How can I help?"
        : "Kumusta! Ako si Ate Sora. Maaari kang magtanong tungkol sa barangay services at mga dokumento. Ano ang maitutulong ko?";
    return { text: greeting + "\n\n" + signIn + "\n\n" + privacy, needsSignIn: false };
  }

  if (crisis.test(query)) {
    const help = lang === "ceb"
      ? "Kung anaa ka sa peligro karon, pangayo dayon og tabang sa local emergency services o pinakaduol nga police station. Para sa dili emerhensiyang tabang, pangutana sa barangay office o social welfare office bahin sa hustong referral. Dili nako ma-verify ang kasamtangang contact number o eligibility isip guest."
      : lang === "en"
        ? "If you're in immediate danger, contact local emergency services or the nearest police station. For non-emergency assistance, ask the barangay office or social welfare office for a referral. I cannot verify current contact numbers or eligibility in Guest Mode."
        : "Kung may agarang panganib, makipag-ugnayan agad sa emergency services o pinakamalapit na police station. Para sa ibang tulong, humingi ng referral sa barangay office o social welfare office. Hindi ko ma-verify ang kasalukuyang contact number o eligibility sa Guest Mode.";
    return { text: help + "\n\n" + signIn + "\n\n" + privacy, needsSignIn: true };
  }

  if (policy.test(query)) {
    const current = lang === "ceb"
      ? "Dili nako makumpirma isip guest ang kasamtangang ordinansa, official fees, requirements, o office hours. Kinahanglan og verified records; dili ko mohimo og numero o kantidad."
      : lang === "en"
        ? "I can't verify current ordinances, official fees, requirements or office hours in Guest Mode. These need verified records; I won't invent ordinance numbers or amounts."
        : "Hindi ko makumpirma sa Guest Mode ang kasalukuyang ordinansa, official fees, requirements o office hours. Kailangan ito ng verified records; hindi ako mag-iimbento ng numero o halaga.";
    return { text: current + "\n\n" + signIn + "\n\n" + privacy, needsSignIn: true };
  }

  const business = documentTopics[0].pattern.test(query);
  const found = documentTopics.find(topic => topic.pattern.test(query) &&
    !(business && topic.title === "Barangay Clearance"));
  if (found) {
    const info = lang === "ceb"
      ? "Mahimo kang mangutana bahin sa " + found.title + ". Ablihi ang service directory alang sa navigation; sign in aron ma-check ang live availability ug requirements ug makasugod sa official request."
      : lang === "en"
        ? "You can ask about " + found.title + ". Browse the service directory for navigation; sign in to confirm current availability and requirements and start an official request."
        : "Maaari kang magtanong tungkol sa " + found.title + ". Tingnan ang service directory para sa navigation; mag-sign in para ma-check ang kasalukuyang availability at requirements at makapagsimula ng official request.";
    return { text: info + "\n\n" + privacy, needsSignIn: true };
  }

  if (service.test(query)) {
    const topics = lang === "ceb"
      ? "Sa app adunay mga shortcut para sa Barangay Clearance, Certificate of Indigency, Certificate of Residency ug Business Clearance. Dili kini garantiya nga available tanan karon."
      : lang === "en"
        ? "The app has shortcuts for Barangay Clearance, Certificate of Indigency, Certificate of Residency and Business Clearance. This doesn't confirm their current availability."
        : "May shortcuts ang app para sa Barangay Clearance, Certificate of Indigency, Certificate of Residency at Business Clearance. Hindi nito kinukumpirma kung available ang mga ito ngayon.";
    return { text: topics + "\n\n" + signIn + "\n\n" + privacy, needsSignIn: true };
  }

  const fallback = lang === "ceb"
    ? "Sa Guest Mode, ang akong matubag mao ang basic navigation sa barangay services. Alang sa mas detalyadong pangutana kinahanglan ang live AI ug verified records."
    : lang === "en"
      ? "In Guest Mode I can provide basic barangay service navigation. Your question needs the live AI and verified records for a detailed answer."
      : "Sa Guest Mode, basic barangay service navigation lang ang maibibigay ko. Kailangan ng live AI at verified records para sa detalyadong sagot sa tanong mo.";
  return { text: fallback + "\n\n" + signIn + "\n\n" + privacy, needsSignIn: true };
}

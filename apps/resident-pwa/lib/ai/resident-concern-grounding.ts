/**
 * Source-grounded guidance for resident situations described in everyday
 * language. Topic discovery comes from reviewed, published DB keywords, not a
 * switch statement of hardcoded legal responses. Unmatched questions may
 * continue through the authenticated AI backend.
 */
import type { Language } from "./verified-policy-grounding";

type VerifiedSource = {
  title: string | null;
  source_url: string | null;
  jurisdiction_scope: string | null;
  authority: string | null;
  summary: string | null;
  keywords: unknown;
  status: string | null;
  verified_at: string | null;
};

const IGNORE = new Set([
  "alam", "naman", "sino", "anong", "ano", "dapat", "gawin", "paano",
  "tulong", "help", "please", "gusto", "sora", "ate", "hey", "hello",
  "aking", "akin", "sakin", "siya", "sila", "niya", "nila", "namin",
  "barangay", "mga", "yung", "iyon", "yon", "kasi", "tas", "lang",
  "si", "sa", "ng", "ko", "ako", "ka", "ba", "po", "at", "na",
  "here", "what", "should", "could", "can", "with", "your",
  "were", "when", "this", "that", "from", "just", "need", "have",
  "law", "laws", "policy", "policies", "document", "services",
]);

function words(value: string): string[] {
  return String(value ?? "").toLowerCase().normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/u).filter(Boolean);
}

function canonical(value: string): string {
  return words(value).join(" ");
}

function sourceAllowed(row: VerifiedSource): boolean {
  if (row.status !== "Published" || !row.verified_at ||
      !row.title?.trim() || !row.summary || row.summary.trim().length < 40) return false;
  if (!["national_law", "city_code_index", "barangay_policy", "government_program", "city_service"].includes(row.authority ?? "")) return false;
  if (!["philippines", "butuan_city", "tandang_sora_butuan"].includes(row.jurisdiction_scope ?? "")) return false;
  try {
    const u = new URL(row.source_url ?? "");
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      /(?:^|\.)gov\.ph$/i.test(u.hostname);
  } catch { return false; }
}

function relevance(message: string, row: VerifiedSource): number {
  const text = " " + canonical(message) + " ";
  const terms = new Set(words(message).filter(w => w.length >= 4 && !IGNORE.has(w)));
  const keywords = Array.isArray(row.keywords)
    ? row.keywords.filter((x): x is string => typeof x === "string")
    : [];
  let score = 0;
  for (const item of keywords) {
    const k = canonical(item);
    if (!k || k.length < 4 || IGNORE.has(k)) continue;
    if (text.includes(" " + k + " ")) {
      // Staff keywords can contain everyday phrases ("ninakawan ako").
      score += k.includes(" ") ? 9 : 6;
    }
  }
  for (const word of words(row.title ?? "")) {
    if (word.length > 5 && !IGNORE.has(word) && terms.has(word)) score += 2;
  }
  // A source is relevant only when its *reviewed keywords* or distinctive
  // law title match. Generic words inside summary never make a legal match.
  return score;
}

export function isWelfareSupportQuestion(message: string): boolean {
  // Match everyday hunger and financial-crisis descriptions, not every
  // service or certificate query. Authorities, office locations and eligibility
  // are read ONLY from published verified database records.
  return /walang[\s-]*wala|walang[\s-]+(?:makain|pagkain|pera|pambili|trabaho|mapakain)|wala[\s-]+(?:akong|kaming|po[\s-]+akong)[\s\S]{0,55}(?:makain|pagkain|pera|pambili)|gutom|nagugutom|mah[i]?rap[\s-]+kami|h[i]?rap[\s-]+sa[\s-]+pagkain|pambili[\s-]+(?:ng[\s-]+)?(?:pagkain|bigas|gatas)|food[\s-]+(?:assistance|aid|support)|financial[\s-]+(?:assistance|aid|help)|tulong[\s-]+pinansyal|cash[\s-]+(?:assistance|aid)|need[\s-]+(?:money|food)|no[\s-]+(?:money|food)|nangangailangan[\s-]+(?:ng[\s-]+)?(?:tulong|pagkain|pera)|ayuda|aics|mangayo[\s-]+(?:og[\s-]+)?(?:tabang|pagkaon)|walay[\s-]+(?:pagkaon|kwarta)/i.test(message);
}

function sourceCitation(source: VerifiedSource): string {
  const label = source.authority === "national_law" ? "Philippine national law"
    : source.authority === "city_code_index" ? "Butuan City code index"
    : source.authority === "government_program" ? "Official government assistance program"
    : source.authority === "city_service" ? "Butuan City public social service"
    : "Published barangay policy";
  return label + ": " + source.title + " [" + source.jurisdiction_scope + "]; Official source: " + source.source_url;
}

export async function getVerifiedResidentConcernAnswer(
  supabase: any, message: string, language: Language
): Promise<{ answer: string; citations: string[]; context_used: true; flagged: false } | null> {
  // Do not interpret a short greeting or generic open-ended prompt as a legal
  // complaint. It can be handled by the normal conversational assistant.
  const significant = words(message).filter(w => w.length >= 4 && !IGNORE.has(w));
  if (!significant.length) return null;

  const { data, error } = await supabase.from("verified_legal_sources")
    .select("title,source_url,jurisdiction_scope,authority,summary,keywords,status,verified_at")
    .eq("status", "Published")
    .not("verified_at", "is", null).limit(150);
  if (error || !Array.isArray(data)) return null;

  const welfare = isWelfareSupportQuestion(message) && !/(?:4ps|pantawid)/i.test(message);
  const candidates = (data as VerifiedSource[])
    .filter(sourceAllowed)
    // A resident asking for FOOD or emergency cash needs AICS/referral
    // information, not an arbitrary local penalty or long-term 4Ps law.
    .filter(source => !welfare || ["government_program", "city_service"].includes(source.authority ?? ""))
    .map(source => ({ source, score: relevance(message, source) }))
    .filter(match => match.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;

  const source = candidates[0].source;
  const intro = welfare
    ? language === "en"
      ? "I'm here to help you find food or emergency assistance. You can ask for an urgent social-worker assessment; assistance is not automatically guaranteed."
      : language === "ceb"
        ? "Tabangan tika sa pagpangita og pagkaon o pinansyal nga tabang. Pangayo og dali nga assessment sa social worker; dili awtomatikong garantiya ang ayuda."
        : "Tutulungan kitang maghanap ng pagkain o pinansyal na tulong. Kung wala nang makain ngayon, sabihin sa barangay o social worker na urgent ang pangangailangan."
    : language === "en"
      ? "I can help you work through this. Here's what you can do, based on a verified official reference:"
      : language === "ceb"
        ? "Tabangan tika niini. Mao ni ang angay nga mga lakang base sa opisyal nga reference:"
        : "Naiintindihan ko ang concern mo. Narito ang puwede mong gawin, batay sa verified na opisyal na gabay:";
  const followup = welfare
    ? language === "en"
      ? "Does your family have anything to eat today? Do you have any ID or a barangay certificate? No need to send private details here."
      : language === "ceb"
        ? "Aduna pa moy pagkaon karong adlawa? Aduna kay ID o barangay certification? Ayaw ibutang dinhi ang pribadong detalye."
        : "May makakain pa ba kayo ngayong araw? May kahit anong ID o barangay certification ka ba? Huwag magpadala rito ng personal na detalye."
    : language === "en"
      ? "Are you safe now? What happened, and have you reported it yet? You don't need to share names or private details here."
      : language === "ceb"
        ? "Luwas ba ka karon? Unsa ang nahitabo ug naka-report na ba ka? Dili kinahanglan isulti dinhi ang mga ngalan o pribadong detalye."
        : "Ligtas ka ba ngayon? Ano ang nangyari at nakapag-report ka na ba? Hindi mo kailangang magbigay dito ng pangalan o pribadong detalye.";

  return {
    answer: intro + "\n\n" + (source.summary ?? "").trim().replace(/\s+\(([1-4])\)\s+/g, "\n$1. ") + "\n\n" + followup,
    citations: [sourceCitation(source)],
    context_used: true,
    flagged: false,
  };
}

export function getOfflineConversationReply(message: string, language: Language): string {
  const incident = /(?:problema|nangyari|nakaw|nawala|sinaktan|takot|threat|reklamo|help|tulong|gawin|nasaktan|emergency|accident|scam|away|nagrereklamo)/i.test(message);
  if (language === "en") {
    return incident
      ? "I want to help you find a safe next step. If there is immediate danger, go somewhere safe and contact emergency services. Keep a record of what happened and any evidence, and contact the appropriate barangay office or police station for reporting. I don't have a verified source for the exact procedure yet. What happened, and are you safe right now?"
      : "I can help with barangay services and resident concerns. What do you need help with? I can also guide you to the appropriate office while I check the verified records.";
  }
  if (language === "ceb") {
    return incident
      ? "Tabangan tika sa sunod nga lakang. Kon naa kay dayong hulga, adto sa luwas nga lugar ug tawag sa emergency responders. Itago ang ebidensiya ug pangayo og tabang sa angay nga barangay office o police station. Wala pa nako makumpirma ang eksaktong lokal nga proseso. Unsa ang nahitabo, ug luwas ba ka karon?"
      : "Tabangan tika sa mga serbisyo ug concern sa barangay. Unsa imong kinahanglan?";
  }
  return incident
    ? "Tutulungan kitang hanapin ang tamang susunod na hakbang. Kung may agarang panganib, pumunta sa ligtas na lugar at humingi ng tulong sa emergency responders. Itala ang nangyari at itabi ang ebidensiya; maaaring mag-report sa nararapat na barangay office o police station. Hindi ko pa ma-verify ang eksaktong lokal na proseso, kaya hindi ako mag-iimbento ng batas o parusa. Ano ang nangyari, at ligtas ka ba ngayon?"
    : "Nandito ako para tumulong sa mga serbisyo at concern sa barangay. Ano ang gusto mong malaman o ipagawa? Maaari kitang gabayan sa tamang opisina habang tinitingnan natin ang verified records.";
}

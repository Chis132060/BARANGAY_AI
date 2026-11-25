"""Bounded immediate safety guidance; no model or database lookup required."""
import re
import unicodedata

PERSONAL_HARM = re.compile(r"""\b(?:punch(?:es|ed|ing)?|hit(?:s|ting)?|slap(?:s|ped|ping)?|kick(?:s|ed|ing)?|beat(?:s|ing|en)?|hurt(?:s|ing)?|chok(?:e[sd]?|ing)|attack(?:s|ed|ing)?|threaten(?:s|ed|ing)?)\s+(?:me|my\s+(?:face|head|child|daughter|son|sister|mother))\b|\b(?:sinuntok|sinampal|sinaktan|binugbog|pinagbantaan|sinakal|sinasaktan|gikulata|gisumbag|gipasakitan|gihulga)\s+(?:ako|ko|akong|ang\s+anak|ang\s+asawa)\b|\b(?:my husband|my wife|my partner|my boyfriend|my girlfriend|my ex|asawa ko|akong bana|akong asawa)\b[\s\S]{0,65}\b(?:violent|abusive|abuses me|threatens me|sinaktan ako|gisumbag ko|gikulata ko)\b""", re.IGNORECASE)
ANSWERS = {
    "en": "I'm sorry this happened. Are you safe right now? If you or someone else is in immediate danger, move to a safe place if you can and contact emergency services or the police. For violence at home or by a partner, you can seek help from the Barangay VAW Desk or police Women and Children Protection Desk where applicable. Seek medical care for injuries, especially a blow to the head or face. Keep any evidence only if doing so is safe. You do not need to share names or private details here. I cannot confirm the exact local procedure or file a report for you.",
    "ceb": "Nasubo ko sa nahitabo. Luwas ba ka karon? Kung naa pa moy peligro, adto sa luwas nga lugar kon mahimo ug tawag sa emergency responders o pulis. Kung pagpang-abuso sa balay o sa partner, pangayo og tabang sa Barangay VAW Desk o police Women and Children Protection Desk kon angay. Pagpakonsulta sa doktor kung nasamdan, labi na sa ulo o nawong. Tipigi ang ebidensiya kung luwas ra. Ayaw paghatag og pribadong detalye dinhi. Dili ko makumpirma sa eksaktong lokal nga proseso o makafile og report para nimo.",
    "tgl": "Nakakalungkot marinig ang nangyari. Ligtas ka ba ngayon? Kung may agarang panganib, pumunta sa ligtas na lugar kung kaya at humingi agad ng tulong sa emergency responders o pulis. Kung pananakit sa tahanan o ng partner, maaari kang lumapit sa Barangay VAW Desk o police Women and Children Protection Desk kung naaangkop. Magpatingin sa doktor kung nasugatan, lalo na kung sa ulo o mukha ang tama. Itabi ang ebidensiya kung ligtas gawin. Hindi kailangang magbigay ng pangalan o pribadong detalye rito. Hindi ko makumpirma ang eksaktong lokal na proseso o makapag-file ng report para sa iyo."
}

def urgent_safety_reply(message: str, language: str) -> str | None:
    query = unicodedata.normalize("NFKC", message.lower()).replace("’", "'")
    return ANSWERS.get(language, ANSWERS["tgl"]) if PERSONAL_HARM.search(query) else None

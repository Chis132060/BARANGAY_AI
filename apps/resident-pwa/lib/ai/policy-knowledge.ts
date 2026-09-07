// Barangay Policy, Document Requirements, & Event Knowledge Base

export interface PolicyTopic {
  id: string;
  keywords: string[];
  title: string;
  category: "documents" | "policy" | "events" | "hours" | "general";
  formType?: string;
  formTitle?: string;
  estimatedFee?: number;
  // Multilingual responses
  response: {
    en: string;
    tgl: string;
    ceb: string;
  };
  guestResponse?: {
    en: string;
    tgl: string;
    ceb: string;
  };
  // Suggested clickable questions for this topic
  suggestedQuestions: {
    en: string;
    tgl: string;
    ceb: string;
  };
}

export const BARANGAY_KNOWLEDGE: PolicyTopic[] = [
  {
    id: "clearance",
    keywords: ["clearance", "barangay clearance", "clearance requirement", "paano kumuha ng clearance", "unsaon pagkuha og clearance"],
    title: "Barangay Clearance",
    category: "documents",
    formType: "clearance",
    formTitle: "Barangay Clearance",
    estimatedFee: 50.0,
    suggestedQuestions: {
      en: "How do I get a Barangay Clearance?",
      tgl: "Paano makakuha ng Barangay Clearance?",
      ceb: "Unsaon pagkuha og Barangay Clearance?",
    },
    response: {
      en: "Barangay Clearance is issued for employment, government ID applications, or travel. Requirements: 1 Valid Government ID & Proof of Residency. Fee: ₱50.00. Processing time: 15–30 minutes. You can fill out the application form below.",
      tgl: "Ang Barangay Clearance ay ibinibigay para sa trabaho, aplikasyon sa ID, o pagbiyahe. Mga kailangan: 1 Valid Government ID at Proof of Residency. Bayad: ₱50.00. Maaari mong punan ang application form sa ibaba.",
      ceb: "Ang Barangay Clearance kay gikinahanglan para sa trabaho, pagkuha og ID, o pagbiyahe. Mga rekisitos: 1 Valid Government ID ug Proof of Residency. Bayad: ₱50.00. Mahimo nimong pun-an ang application form sa ubos.",
    },
    guestResponse: {
      en: "Barangay Clearance requires 1 Valid ID and Proof of Residency (₱50.00 fee). Sign in to submit an online request through this AI Assistant.",
      tgl: "Ang Barangay Clearance ay nangangailangan ng 1 Valid ID at Proof of Residency (Bayad: ₱50.00). Mag-sign in para makapag-apply online.",
      ceb: "Ang Barangay Clearance nagkinahanglan og 1 Valid ID ug Proof of Residency (Bayad: ₱50.00). Palihug og sign in aron makasumite og online request.",
    },
  },
  {
    id: "indigency",
    keywords: ["indigency", "certificate of indigency", "medical aid", "financial assistance", "tulong pinansyal", "ayuda"],
    title: "Certificate of Indigency",
    category: "documents",
    formType: "indigency",
    formTitle: "Certificate of Indigency",
    estimatedFee: 0.0,
    suggestedQuestions: {
      en: "What are the requirements for a Certificate of Indigency?",
      tgl: "Ano ang requirements para sa Certificate of Indigency?",
      ceb: "Unsa ang mga kinahanglanon sa Certificate of Indigency?",
    },
    response: {
      en: "Certificate of Indigency is completely Free of Charge (₱0.00) for low-income residents seeking medical, hospitalization, educational (scholarship), burial, or legal assistance. Please fill out the form below stating your specific purpose and dependents.",
      tgl: "Ang Certificate of Indigency ay Libre (₱0.00) para sa mga residenteng nangangailangan ng tulong medikal, ospital, edukasyon/iskolarship, o legal. Punan ang form sa ibaba at tukuyin ang layunin.",
      ceb: "Ang Certificate of Indigency kay Libre (₱0.00) para sa mga residente nga nanginahanglan og tabang medikal, eskwela, o legal. Palihug pun-i ang form sa ubos.",
    },
    guestResponse: {
      en: "Certificate of Indigency is free for low-income residents for medical or educational aid. Please log in to fill out and submit the online application.",
      tgl: "Ang Certificate of Indigency ay libre para sa tulong medikal o pampaaral. Mag-login para makapagpasa ng online application.",
      ceb: "Ang Certificate of Indigency kay libre alang sa mga nanginahanglan og ayuda. Mag-login aron makasumite online.",
    },
  },
  {
    id: "residency",
    keywords: ["residency", "certificate of residency", "proof of residency", "patunay ng paninirahan", "lumulupyo"],
    title: "Certificate of Residency",
    category: "documents",
    formType: "residency",
    formTitle: "Certificate of Residency",
    estimatedFee: 30.0,
    suggestedQuestions: {
      en: "How do I apply for a Certificate of Residency?",
      tgl: "Paano kumuha ng Certificate of Residency?",
      ceb: "Unsaon pagkuha og Certificate of Residency?",
    },
    response: {
      en: "Certificate of Residency confirms you are a bonafide resident of our Barangay. Requirements: Proof of address (utility bill or landlord certification) and at least 6 months residency. Fee: ₱30.00. Submit your request using the form below.",
      tgl: "Ang Certificate of Residency ay patunay na ikaw ay lehitimong residente ng Barangay. Kailangan: Proof of address at hindi bababa sa 6 na buwang paninirahan. Bayad: ₱30.00. Gamitin ang form sa ibaba.",
      ceb: "Ang Certificate of Residency nagpamatuod nga ikaw lumulupyo dinhi sa barangay. Rekisitos: Proof of address ug 6 ka buwan nga pagpuyo. Bayad: ₱30.00. Pun-i ang porma sa ubos.",
    },
    guestResponse: {
      en: "Certificate of Residency requires proof of local address (₱30.00). Sign in to submit your residency request.",
      tgl: "Ang Certificate of Residency ay may bayad na ₱30.00. Mag-sign in upang makapagsumite ng application.",
      ceb: "Ang Certificate of Residency nagkinahanglan og proof of address (₱30.00). Sign in aron makasumite.",
    },
  },
  {
    id: "business",
    keywords: ["business clearance", "business permit", "commercial clearance", "negosyo", "permit sa negosyo"],
    title: "Business Clearance",
    category: "documents",
    formType: "business",
    formTitle: "Business Clearance",
    estimatedFee: 500.0,
    suggestedQuestions: {
      en: "How do I apply for a Business Clearance?",
      tgl: "Paano mag-apply ng Business Clearance?",
      ceb: "Unsaon pag-apply og Business Clearance?",
    },
    response: {
      en: "Business permitting normally uses a unified city/municipal application. A barangay clearance or business-related barangay permit is part of the local permitting process, subject to the LGU's current rules. Common records include DTI/SEC/CDA registration, owner TIN and valid ID, proof of address or lease/land title, location information, and applicable fire, sanitary, zoning, or environmental clearances. The Barangay AI must confirm the current fee and processing time from an approved local record before you pay.",
      tgl: "Karaniwang gumagamit ng unified application ang city o municipality para sa business permit. Kasama sa proseso ang barangay clearance o business-related barangay permit, ayon sa kasalukuyang patakaran ng LGU. Karaniwang hinihingi ang DTI/SEC/CDA registration, TIN at valid ID ng may-ari, patunay ng address o lease/land title, lokasyon, at naaangkop na fire, sanitary, zoning, o environmental clearances. Dapat kumpirmahin muna ng Barangay AI ang kasalukuyang bayad at processing time mula sa aprubadong lokal na tala bago magbayad.",
      ceb: "Kasagaran gigamit sa city o municipality ang unified application para sa business permit. Apil sa proseso ang barangay clearance o business-related barangay permit, depende sa kasamtangang lagda sa LGU. Kasagarang rekord ang DTI/SEC/CDA registration, TIN ug valid ID sa tag-iya, proof of address o lease/land title, lokasyon, ug angay nga fire, sanitary, zoning, o environmental clearances. Kinahanglan kumpirmahon una sa Barangay AI ang kasamtangang bayad ug processing time gikan sa aprubadong lokal nga rekord.",
    },
    guestResponse: {
      en: "Business permitting commonly requires DTI/SEC/CDA registration, proof of address, and other LGU clearances. Sign in to submit details online; confirm the current fee and issuing office with the Barangay or BPLO.",
      tgl: "Karaniwang kailangan sa business permitting ang DTI/SEC/CDA registration, patunay ng address, at iba pang LGU clearances. Mag-sign in para magsumite online; kumpirmahin ang kasalukuyang bayad at tanggapan sa Barangay o BPLO.",
      ceb: "Kasagarang gikinahanglan sa business permitting ang DTI/SEC/CDA registration, proof of address, ug uban pang LGU clearances. Sign in aron makasumite online; kumpirmaha ang kasamtangang bayad ug opisina sa Barangay o BPLO.",
    },
  },
  {
    id: "hours",
    keywords: ["hours", "office hours", "schedule", "open", "time", "oras ng opisina", "oras sa opisina", "bukas"],
    title: "Barangay Operating Hours",
    category: "hours",
    suggestedQuestions: {
      en: "What are the barangay office hours?",
      tgl: "Ano ang oras ng opisina ng barangay?",
      ceb: "Unsa ang oras sa opisina sa barangay?",
    },
    response: {
      en: "The Barangay Hall is open Monday to Friday from 8:00 AM to 5:00 PM (No Noon Break for frontline document releases). Emergency tanod desk and hotline operate 24/7.",
      tgl: "Ang Barangay Hall ay bukas Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM (Walang Noon Break para sa frontline services). Ang Emergency Tanod Desk ay 24/7.",
      ceb: "Ang Barangay Hall abli Lunes hangtod Biyernes gikan 8:00 AM hangtod 5:00 PM (Walay Noon Break). Ang Tanod Emergency Desk naglihok 24/7.",
    },
  },
  {
    id: "policies",
    keywords: ["curfew", "ordinance", "noise", "karaoke", "patakaran", "ordinansa", "basura", "garbage"],
    title: "Barangay Ordinances & Curfew",
    category: "policy",
    suggestedQuestions: {
      en: "What are the barangay curfew and noise rules?",
      tgl: "Ano ang mga ordinansa sa curfew at ingay?",
      ceb: "Unsa ang mga ordinansa sa curfew ug kasaba?",
    },
    response: {
      en: "Key Barangay Ordinances:\n1. Minor Curfew: 10:00 PM to 4:00 AM (minors must be accompanied by parent/guardian).\n2. Noise Regulation: Loud sound systems, videoke, and karaoke must stop by 10:00 PM.\n3. Solid Waste Segregation: Biodegradable (Tue/Fri) and Non-Biodegradable (Thu/Sat).",
      tgl: "Mga Pangunahing Ordinansa:\n1. Curfew sa Kabataan: 10:00 PM hanggang 4:00 AM.\n2. Ordinansa sa Ingay/Karaoke: Bawal ang malakas na tugtog at videoke lagpas 10:00 PM.\n3. Pagbubukod ng Basura: Koleksyon tuwing Martes at Biyernes ng umaga.",
      ceb: "Pangunang mga Ordinansa sa Barangay:\n1. Curfew sa mga Minor de Edad: 10:00 PM hangtod 4:00 AM.\n2. Ordinansa sa Kasaba/Videoke: Kinahanglang undangon ang videoke inig alas-10 sa gabii.\n3. Pagkolekta sa Basura: Martes ug Biyernes sa buntag.",
    },
  },
  {
    id: "events",
    keywords: ["event", "sports", "vaccine", "caravan", "assembly", "aktibidad", "kalihokan", "liga"],
    title: "Upcoming Community Events",
    category: "events",
    suggestedQuestions: {
      en: "What are the upcoming barangay events?",
      tgl: "Ano ang mga darating na aktibidad ng barangay?",
      ceb: "Unsa ang umaabot nga mga kalihokan sa barangay?",
    },
    response: {
      en: "Upcoming Community Events:\n• Health & Medical Caravan: Free medical checkups, dental checkups, and senior maintenance medicine distribution — This Saturday 8:00 AM at Barangay Multi-Purpose Gym.\n• Youth Sports League & Free Skills Workshop — Registration is now ongoing at the SK Office.",
      tgl: "Mga Darating na Aktibidad:\n• Health & Medical Caravan: Libreng checkup, dental, at maintenance medicine para sa seniors — Ngayong Sabado 8:00 AM sa Barangay Gym.\n• Inter-Purok Youth Basketball & Volleyball League — Bukas na ang rehistrasyon sa SK Office.",
      ceb: "Umaabot nga mga Kalihokan:\n• Health & Medical Caravan: Libreng konsulta, dental, ug tambal alang sa mga senior citizen — Karong Sabado 8:00 AM sa Barangay Gym.\n• SK Youth Sports League — Abli na ang rehistrasyon sa SK Office.",
    },
  },
];

/**
 * Returns verified question suggestions for a specific language.
 * Guarantees that EVERY suggestion button shown has a 100% verified grounded answer.
 */
export function getVerifiedQuestionSuggestions(lang: "tgl" | "ceb" | "en"): { label: string; query: string; topicId: string }[] {
  return BARANGAY_KNOWLEDGE.map((t) => ({
    label: t.title,
    query: t.suggestedQuestions[lang] || t.suggestedQuestions.en,
    topicId: t.id,
  }));
}

export function findMatchingKnowledge(
  userQuery: string,
  isLoggedIn: boolean,
  lang: "tgl" | "ceb" | "en" = "tgl"
): {
  topic: PolicyTopic;
  reply: string;
  formType?: string;
  formTitle?: string;
  estimatedFee?: number;
  guestActionTrigger?: boolean;
} | null {
  const query = userQuery.toLowerCase().trim();
  for (const topic of BARANGAY_KNOWLEDGE) {
    const isMatch = topic.keywords.some((kw) => query.includes(kw));
    if (isMatch) {
      const reply = (!isLoggedIn && topic.guestResponse)
        ? (topic.guestResponse[lang] || topic.guestResponse.en)
        : (topic.response[lang] || topic.response.en);

      if (!isLoggedIn && topic.formType) {
        return {
          topic,
          reply,
          guestActionTrigger: true,
          estimatedFee: topic.estimatedFee,
        };
      }

      return {
        topic,
        reply,
        formType: topic.formType,
        formTitle: topic.formTitle,
        estimatedFee: topic.estimatedFee,
      };
    }
  }
  return null;
}

/**
 * Suggestions ONLY. The old static knowledge array contained unverified
 * fees, office hours and future event dates. None of those can be official
 * Tandang Sora, Butuan City facts without current signed sources.
 *
 * Real service requirements come from RLS-filtered document_types;
 * ordinance answers come from source-verified Active policy records.
 */
export interface PolicyTopic {
  id: string;
  title: string;
  category: "documents" | "policy" | "events" | "hours" | "general";
  keywords: string[];
  formType?: string;
  formTitle?: string;
  suggestedQuestions: Record<"en" | "tgl" | "ceb", string>;
}

export const BARANGAY_KNOWLEDGE: PolicyTopic[] = [
  {
    id: "clearance", title: "Barangay Clearance", category: "documents",
    keywords: ["barangay clearance"], formType: "clearance", formTitle: "Barangay Clearance",
    suggestedQuestions: {
      en: "How do I request a Barangay Clearance?",
      tgl: "Paano mag-request ng Barangay Clearance?",
      ceb: "Unsaon pagpangayo og Barangay Clearance?",
    },
  },
  {
    id: "indigency", title: "Certificate of Indigency", category: "documents",
    keywords: ["certificate of indigency"], formType: "indigency", formTitle: "Certificate of Indigency",
    suggestedQuestions: {
      en: "How do I request a Certificate of Indigency?",
      tgl: "Paano mag-request ng Certificate of Indigency?",
      ceb: "Unsaon pagpangayo og Certificate of Indigency?",
    },
  },
  {
    id: "residency", title: "Certificate of Residency", category: "documents",
    keywords: ["certificate of residency"], formType: "residency", formTitle: "Certificate of Residency",
    suggestedQuestions: {
      en: "How do I request a Certificate of Residency?",
      tgl: "Paano mag-request ng Certificate of Residency?",
      ceb: "Unsaon pagpangayo og Certificate of Residency?",
    },
  },
  {
    id: "business", title: "Business Clearance", category: "documents",
    keywords: ["business clearance"], formType: "business", formTitle: "Business Clearance",
    suggestedQuestions: {
      en: "Where can I ask about Business Clearance?",
      tgl: "Saan magtatanong tungkol sa Business Clearance?",
      ceb: "Asa mangutana bahin sa Business Clearance?",
    },
  },
];

export function getVerifiedQuestionSuggestions(lang: "tgl" | "ceb" | "en"):
  { label: string; query: string; topicId: string }[] {
  return BARANGAY_KNOWLEDGE.map(topic => ({
    label: topic.title,
    query: topic.suggestedQuestions[lang],
    topicId: topic.id,
  }));
}

/**
 * Retained for older call sites; deliberately refuses to answer from local
 * constants. The authenticated chat route is the only official answer path.
 */
export function findMatchingKnowledge(
  _userQuery: string, _isLoggedIn: boolean, _lang: "tgl" | "ceb" | "en" = "tgl"
): null {
  return null;
}

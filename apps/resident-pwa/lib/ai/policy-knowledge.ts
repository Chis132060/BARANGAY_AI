// Barangay Policy, Document Requirements, & Event Knowledge Base

export interface PolicyTopic {
  keywords: string[];
  title: string;
  category: "documents" | "policy" | "events" | "hours" | "general";
  formType?: string;
  response: string;
  guestResponse?: string;
}

export const BARANGAY_KNOWLEDGE: PolicyTopic[] = [
  {
    keywords: ["clearance", "barangay clearance", "clearance requirement"],
    title: "Barangay Clearance",
    category: "documents",
    formType: "clearance_request",
    response: "Barangay Clearance is issued for employment, ID applications, or travel. Requirements: 1 Valid ID & Proof of Residency. Fee: ₱50.00. Processing time: 15-30 minutes.",
    guestResponse: "Barangay Clearance requires 1 Valid ID and Proof of Residency. Processing fee is ₱50.00. To apply online and submit a request form, please sign in or register your resident account.",
  },
  {
    keywords: ["indigency", "certificate of indigency", "medical aid", "financial assistance"],
    title: "Certificate of Indigency",
    category: "documents",
    formType: "indigency_request",
    response: "Certificate of Indigency is free of charge for low-income residents seeking medical, educational, or legal assistance. Requirements: Case study recommendation or proof of low income.",
    guestResponse: "Certificate of Indigency is free for low-income residents for medical or educational aid. Online application is available for registered residents.",
  },
  {
    keywords: ["residency", "certificate of residency", "proof of residency"],
    title: "Certificate of Residency",
    category: "documents",
    formType: "residency_request",
    response: "Certificate of Residency confirms your residence in the barangay. Requirements: Proof of address (utility bill or landlord endorsement). Processing fee: ₱30.00.",
    guestResponse: "Certificate of Residency confirms your local residence. Requirements: Proof of address. Please log in to fill up the application form.",
  },
  {
    keywords: ["business clearance", "business permit", "commercial clearance"],
    title: "Business Clearance",
    category: "documents",
    formType: "business_clearance",
    response: "Barangay Business Clearance is required prior to Mayor's Permit application. Requirements: DTI/SEC registration, Lease Contract/Land Title, and Fire Safety inspection.",
    guestResponse: "Barangay Business Clearance requires DTI/SEC registration and lease contract. Registered residents can apply online through the PWA portal.",
  },
  {
    keywords: ["hours", "office hours", "schedule", "open", "time"],
    title: "Barangay Operating Hours",
    category: "hours",
    response: "The Barangay Hall is open Monday to Friday from 8:00 AM to 5:00 PM. Emergency desk operates 24/7.",
  },
  {
    keywords: ["curfew", "ordinance", "noise", "karaoke"],
    title: "Barangay Public Policies & Curfew",
    category: "policy",
    response: "Barangay Ordinance Rules:\n1. Minor Curfew: 10:00 PM to 4:00 AM.\n2. Noise Regulation: Loud sound systems & karaoke must be turned off by 10:00 PM.\n3. Waste Disposal: Segregated garbage collection every Tuesday and Friday morning.",
  },
  {
    keywords: ["event", "sports", "vaccine", "caravan", "assembly"],
    title: "Barangay Events & Youth Programs",
    category: "events",
    formType: "event_registration",
    response: "Upcoming Barangay Events:\n1. Health & Medical Caravan (Free Checkup & Vaccines) - This Saturday 9 AM at Barangay Gym.\n2. Summer Youth Basketball League - Registration open now!",
    guestResponse: "Upcoming Barangay Events include the Health Caravan this Saturday at the Gym and the Youth Basketball League. Log in to register for events!",
  },
];

export function findMatchingKnowledge(userQuery: string, isLoggedIn: boolean): { topic: PolicyTopic; reply: string; canTriggerForm: boolean } | null {
  const query = userQuery.toLowerCase();
  for (const topic of BARANGAY_KNOWLEDGE) {
    const isMatch = topic.keywords.some((kw) => query.includes(kw));
    if (isMatch) {
      const reply = (!isLoggedIn && topic.guestResponse) ? topic.guestResponse : topic.response;
      const canTriggerForm = isLoggedIn && !!topic.formType;
      return { topic, reply, canTriggerForm };
    }
  }
  return null;
}

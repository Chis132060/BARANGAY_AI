/** Existing document types supported by InChatFormCard. Never execute arbitrary model actions. */
export const DOCUMENT_FORMS = {
  clearance: { title: "Barangay Clearance", pattern: /barangay\\s+clearance|barangay\\s+cle[a]?rance/i },
  indigency: { title: "Certificate of Indigency", pattern: /indigency|certificate\\s+of\\s+indigency/i },
  residency: { title: "Certificate of Residency", pattern: /residen(?:cy|ce)\\s+certificate|certificate\\s+of\\s+residen(?:cy|ce)|proof\\s+of\\s+residen(?:cy|ce)/i },
  business: { title: "Business Clearance", pattern: /business\\s+clearance|business\\s+permit/i },
} as const;
export type DocumentFormId = keyof typeof DOCUMENT_FORMS;
export function isDocumentFormId(value: unknown): value is DocumentFormId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DOCUMENT_FORMS, value);
}
/** Only explicit user requests may trigger a form, not a model's incidental mention. */
export function requestedDocumentForm(text: string): DocumentFormId | null {
  const matches = (Object.keys(DOCUMENT_FORMS) as DocumentFormId[]).filter((key) => DOCUMENT_FORMS[key].pattern.test(text));
  return matches.length === 1 ? matches[0] : null;
}

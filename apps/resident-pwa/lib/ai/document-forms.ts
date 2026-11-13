/** Supported document types shown by Ate Sora's in-chat application form.
 * Form creation is driven by the resident's question, never by model-generated text.
 */
export const DOCUMENT_FORMS = {
  clearance: { title: "Barangay Clearance", pattern: /\b(?:barangay|brgy)\s+clearance\b|\bclearance\s+(?:sa|ng)\s+barangay\b/i },
  indigency: { title: "Certificate of Indigency", pattern: /\bindigency\b|\bsertipiko\s+(?:sa|ng)\s+kakabus\b/i },
  residency: { title: "Certificate of Residency", pattern: /\b(?:certificate\s+of\s+residen(?:cy|ce)|residen(?:cy|ce)\s+certificate|proof\s+of\s+residen(?:cy|ce))\b/i },
  business: { title: "Business Clearance", pattern: /\bbusiness\s+(?:clearance|permit)\b|\bpermit\s+(?:sa|ng)\s+negosyo\b/i },
} as const;

export type DocumentFormId = keyof typeof DOCUMENT_FORMS;
export function isDocumentFormId(value: unknown): value is DocumentFormId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DOCUMENT_FORMS, value);
}

/** Return one unambiguous supported document; do not guess from a multi-document question. */
export function requestedDocumentForm(text: string): DocumentFormId | null {
  if (typeof text !== "string") return null;
  const matches = (Object.keys(DOCUMENT_FORMS) as DocumentFormId[]).filter((key) => DOCUMENT_FORMS[key].pattern.test(text));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Classify requirements from the barangay's actual document_types catalog.
 * These are not newly issued certificates; staff reviews profile evidence.
 */
export function isResidencyProofRequirement(label: string): boolean {
  return /\bproof\s+of\s+residen(?:cy|ce)\b/i.test(label);
}
export function hasRegistrationIdOnFile(profile: {
  verification_status?: string | null;
  id_type?: string | null;
  id_photo_url?: string | null;
} | null): boolean {
  return profile?.verification_status === "Verified" &&
    Boolean(profile.id_type?.trim() && profile.id_photo_url?.trim());
}

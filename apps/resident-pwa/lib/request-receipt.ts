// Stable, collision-free public tracking label derived from the database-generated UUID.
// This is a request receipt, never a payment/official receipt number.
export function formatRequestReference(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return "Pending server confirmation";
  }
  return "TS12-" + id.replace(/-/g, "").toUpperCase();
}

export function isValidIdRequirement(requirement: string): boolean {
  const normalized = requirement.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return /(?:^|\s)(?:valid|government|govt|national|photo)\s+(?:issued\s+)?id(?:\s|$)/.test(normalized)
    || /(?:^|\s)id\s+(?:card|photo)(?:\s|$)/.test(normalized);
}

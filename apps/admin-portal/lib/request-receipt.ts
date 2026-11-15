// Match the resident PWA reference format; the complete database UUID makes this unique.
export function formatRequestReference(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return "Pending server confirmation";
  }
  return "TS12-" + id.replace(/-/g, "").toUpperCase();
}

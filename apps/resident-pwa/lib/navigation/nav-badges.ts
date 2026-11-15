/**
 * Resident navigation badges. Counts come from user-visible RLS-filtered data.
 * No personal request details are saved here; only public announcement IDs seen
 * on this device are persisted per signed-in account.
 */
export const NAV_BADGES_CHANGED = "barangay:nav-badges-changed";
const MAX_SEEN_IDS = 300;

export function countActiveRequests(statuses: readonly (string | null)[]): number {
  const terminal = /^(released|completed|complete|rejected|cancelled|canceled|closed|withdrawn)$/i;
  return statuses.filter((value) => typeof value === "string" && value.trim().length > 0 && !terminal.test(value.trim())).length;
}

function seenStorageKey(userId: string): string {
  return "barangay:announcements-seen:" + userId;
}

export function readSeenAnnouncements(userId: string): Set<string> {
  if (!userId || typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(seenStorageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item))
      : []);
  } catch {
    return new Set();
  }
}

export function countUnseenAnnouncements(ids: readonly string[], seen: ReadonlySet<string>): number {
  return ids.filter((id) => !seen.has(id)).length;
}

export function markAnnouncementsSeen(userId: string, ids: readonly string[]): void {
  if (!userId || typeof window === "undefined" || !ids.length) return;
  try {
    const merged = new Set([...readSeenAnnouncements(userId), ...ids]);
    window.localStorage.setItem(seenStorageKey(userId), JSON.stringify(Array.from(merged).slice(-MAX_SEEN_IDS)));
    window.dispatchEvent(new Event(NAV_BADGES_CHANGED));
  } catch {
    // localStorage may be disabled; the UI must remain functional.
  }
}

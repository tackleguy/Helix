const DAY = 86_400_000;

export type SessionBucket =
  | "Today"
  | "Yesterday"
  | "Last 7 days"
  | "Older";

export function bucketFor(updatedAt: number, now = Date.now()): SessionBucket {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const d = new Date(updatedAt);
  const n = new Date(now);
  if (sameDay(d, n)) return "Today";
  const y = new Date(now - DAY);
  if (sameDay(d, y)) return "Yesterday";
  if (now - updatedAt < 7 * DAY) return "Last 7 days";
  return "Older";
}

export const BUCKET_ORDER: SessionBucket[] = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Older",
];

export interface SessionListItem {
  id: string;
  title: string;
  updatedAt: number;
}

export function groupSessions(items: SessionListItem[]) {
  const map = new Map<SessionBucket, SessionListItem[]>();
  for (const s of items) {
    const b = bucketFor(s.updatedAt);
    const arr = map.get(b) ?? [];
    arr.push(s);
    map.set(b, arr);
  }
  return BUCKET_ORDER.flatMap((b) =>
    map.has(b) ? ([[b, map.get(b)!] as const] as const) : [],
  );
}

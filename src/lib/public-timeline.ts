import type { ProfileDisplayPrefs } from "@/lib/profile-display";

export type TimelineItem = {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  source: string;
  occurred_at: string;
};

/** Combine badge grants and permitted public activity, newest first. */
export function mergeTimeline(badges: TimelineItem[], activity: TimelineItem[], limit = 20) {
  return [...badges, ...activity]
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, limit);
}

/** Fields a visitor may never see on a private profile. */
const PRIVATE_FIELDS = ["bio", "tagline", "blocks", "avatar_url", "favicon_url", "verified_legal_name", "business_name", "total_reach_count"] as const;

/** Strip profile content when the owner switched the public profile off. */
export function redactPrivateProfile<T extends Record<string, unknown>>(row: T, prefs: Pick<ProfileDisplayPrefs, "publicProfile">): T {
  if (prefs.publicProfile) return row;
  const copy: Record<string, unknown> = { ...row, is_private: true };
  for (const f of PRIVATE_FIELDS) copy[f] = f === "blocks" ? [] : null;
  return copy as T;
}

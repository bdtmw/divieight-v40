/**
 * Pre-Publication Compliance trigger-phrase list (Gate 2).
 *
 * MAINTAINABLE BY COMPLIANCE: this array is the single source of truth. Adding
 * or removing a phrase here changes the filter everywhere — no other file
 * hardcodes trigger words.
 *
 * Rev 42 terminology standing rule: this same list must also be checked
 * against any NEW user-facing label, role name, button, or heading introduced
 * anywhere in the app — not only marketplace listing content. Use
 * `scanForTriggerPhrases()` before shipping new copy.
 */
export const COMPLIANCE_TRIGGER_PHRASES: string[] = [
  "investment",
  "investor",
  "invest",
  "roi",
  "return on investment",
  "guaranteed appreciation",
  "guaranteed return",
  "guaranteed",
  "profit",
  "profitable",
  "cap rate",
  "yield",
  "risk-free",
  "risk free",
  "no risk",
  "passive income",
  "cash flow",
  "equity growth",
  "wealth building",
  "portfolio",
  "securities",
  "dividend",
  "appreciation potential",
  "double your money",
];

export interface TriggerPhraseHit {
  phrase: string;
  /** Short surrounding text so the seller can see exactly what tripped it. */
  excerpt: string;
  /** Which content item the phrase came from, when scanning listing content. */
  source?: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive, whole-phrase scan. Returns one hit per matched phrase. */
export function scanForTriggerPhrases(text: string, source?: string): TriggerPhraseHit[] {
  if (!text) return [];
  const hits: TriggerPhraseHit[] = [];
  for (const phrase of COMPLIANCE_TRIGGER_PHRASES) {
    const re = new RegExp(`(^|[^a-z0-9])(${escapeRegExp(phrase)})([^a-z0-9]|$)`, "i");
    const match = re.exec(text);
    if (!match) continue;
    const idx = Math.max(0, (match.index ?? 0) - 40);
    hits.push({
      phrase,
      excerpt: text.slice(idx, Math.min(text.length, idx + 140)).trim(),
      ...(source ? { source } : {}),
    });
  }
  return hits;
}

/** Convenience for new UI copy checks (Rev 42 terminology standing rule). */
export function isCompliantLabel(label: string) {
  return scanForTriggerPhrases(label).length === 0;
}

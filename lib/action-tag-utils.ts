/**
 * Normalization for action-card tags (e.g. `Multi(2)`, `Penetrate(5)`, `Ranged(8)`)
 * so filters, glossary lookup, and weapon-action checks treat parameterized tags like their base name.
 */

/** Remove `(12)` / `( 3 )` style numeric parentheticals from tags like `Multi(2)` or `Penetrate(5)`. */
export function stripNumericParentheticals(raw: string): string {
  return raw.replace(/\(\s*\d+\s*\)/g, "").trim()
}

/** e.g. `Multi2` → `Multi` (digits only when preceded by a letter at the end). */
export function stripTrailingParameterDigits(raw: string): string {
  return raw.replace(/(?<=[a-zA-Z])\d+$/i, "").trim()
}

/**
 * Canonical stem for comparisons: strip numeric parens, trailing param digits,
 * collapse whitespace, lowercase.
 */
export function normalizeActionTagStem(tag: string): string {
  let s = stripTrailingParameterDigits(stripNumericParentheticals(tag.trim()))
  s = s.replace(/\s+/g, " ").trim().toLowerCase()
  return s
}

/** True if any tag’s stem equals `canonical` (case-insensitive, after param stripping). */
export function actionTagsIncludeCanonical(
  tags: string[] | null | undefined,
  canonical: string
): boolean {
  if (!tags?.length) return false
  const want = normalizeActionTagStem(canonical)
  if (!want) return false
  return tags.some((t) => normalizeActionTagStem(t) === want)
}

/** Filter chip: tag stem equals filter string (filter is already lowercased). */
export function actionTagMatchesFilterChip(tag: string, filterLower: string): boolean {
  return normalizeActionTagStem(tag) === filterLower
}

/**
 * Search box: match raw tag substring or normalized stem substring (so `ranged` finds `Ranged(8)`).
 */
export function actionTagMatchesSearchQuery(tag: string, queryLower: string): boolean {
  if (!queryLower) return true
  const raw = String(tag).toLowerCase()
  if (raw.includes(queryLower)) return true
  const stemTag = normalizeActionTagStem(tag)
  const stemQ = normalizeActionTagStem(queryLower)
  if (stemQ.length > 0 && stemTag.includes(stemQ)) return true
  return false
}

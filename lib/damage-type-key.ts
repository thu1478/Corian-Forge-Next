/** Normalize damage-type strings for comparisons (trait resist names vs rules list vs vuln keys). */
export function normalizeDamageTypeKey(s: string): string {
  return s.trim().toLowerCase()
}

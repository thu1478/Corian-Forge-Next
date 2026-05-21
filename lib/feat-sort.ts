/** Readable min level from rules JSON (`minLevel` missing → treat as unattainably high). */
export function featMinLevelNumeric(feat: { minLevel?: unknown }): number {
    const raw = feat.minLevel
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw)
    const n = Number(raw)
    return Number.isFinite(n) ? Math.floor(n) : 999
}

/** Stable A→Z sort for feats (creator grid + rules library). */
export function compareFeatsAlphabetically(
    idA: string,
    fa: { name?: string } | null | undefined,
    idB: string,
    fb: { name?: string } | null | undefined
): number {
    const na = String(fa?.name ?? idA).trim()
    const nb = String(fb?.name ?? idB).trim()
    const c = na.localeCompare(nb, undefined, { sensitivity: "base", numeric: true })
    return c !== 0 ? c : idA.localeCompare(idB, undefined, { sensitivity: "base", numeric: true })
}

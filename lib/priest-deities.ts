/** Priest deity helpers (passives live on `rules.classes.priest.deities[].passives`). */

export type DeityPassiveEntry = {
    slug: string;
    name: string;
    description: string;
    minLevel: number;
};

export function getDeityPassiveEntries(
    rulesData: { classes?: Record<string, unknown> },
    deityId: string | null | undefined
): DeityPassiveEntry[] {
    if (!deityId) return [];
    const priest = rulesData.classes?.priest as { deities?: Array<{ id: string; passives?: Record<string, { name?: string; description?: string; minLevel?: number }> }> } | undefined;
    const d = priest?.deities?.find((x) => x.id === deityId);
    if (!d?.passives) return [];
    return Object.entries(d.passives).map(([slug, p]) => ({
        slug,
        name: String(p.name ?? slug),
        description: String(p.description ?? ""),
        minLevel: typeof p.minLevel === "number" ? p.minLevel : 3,
    }));
}

/** Merge Deity Boon class passive with the chosen deity's passive text (creator / sheet). */
export function resolveDeityBoonDisplay(
    rulesData: { classes?: Record<string, unknown> },
    priestDeity: string | null | undefined,
    base: { name?: string; description?: string }
): { name: string; description: string } {
    const entries = getDeityPassiveEntries(rulesData, priestDeity);
    if (entries.length > 0) {
        const lines = entries.map((e) => (entries.length > 1 ? `${e.name} — ${e.description}` : e.description));
        return {
            name: entries.length === 1 ? entries[0].name : String(base.name ?? "Deity Boon"),
            description: lines.join("\n\n"),
        };
    }
    return {
        name: String(base.name ?? "Deity Boon"),
        description: String(
            base.description ??
                "At level 3 you gain a passive from your chosen deity. Select a deity above to see it here."
        ),
    };
}

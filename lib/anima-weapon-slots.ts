export const ANIMA_WEAPON_UID_PREFIX = "anima:"

export function buildAnimaWeaponSlotUid(key: string): string {
    return `${ANIMA_WEAPON_UID_PREFIX}${String(key).trim()}`
}

export function isAnimaWeaponSlotUid(uid: string | null | undefined): boolean {
    return typeof uid === "string" && uid.startsWith(ANIMA_WEAPON_UID_PREFIX)
}

export function parseAnimaWeaponSlotUid(uid: string | null | undefined): string | null {
    if (!isAnimaWeaponSlotUid(uid)) return null
    const key = String(uid).slice(ANIMA_WEAPON_UID_PREFIX.length).trim()
    return key || null
}

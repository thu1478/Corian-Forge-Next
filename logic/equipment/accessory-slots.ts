import type { Equipment } from "@/lib/equipment-data"

export const ACCESSORY_SLOT_KEYS = [
    "head",
    "neck",
    "waist",
    "wristLeft",
    "wristRight",
    "feet",
] as const

export type AccessorySlotKey = (typeof ACCESSORY_SLOT_KEYS)[number]

/** Legacy save / rules slot ids mapped to current accessory slots. */
const LEGACY_ACCESSORY_SLOT_MAP: Record<string, readonly AccessorySlotKey[]> = {
    face: ["head"],
    ears: ["head"],
    back: ["waist"],
    hands: ["wristLeft", "wristRight"],
    ringLeft: ["wristLeft"],
    ringRight: ["wristRight"],
}

export type EquipmentSlotRef =
    | AccessorySlotKey
    | keyof typeof LEGACY_ACCESSORY_SLOT_MAP
    | "rightHand"
    | "leftHand"
    | "armor"

export const ACCESSORY_SLOT_UI: {
    key: AccessorySlotKey
    label: string
    hint: string
}[] = [
    { key: "head", label: "Head", hint: "Hats, glasses, etc." },
    { key: "neck", label: "Neck", hint: "Necklaces" },
    { key: "waist", label: "Waist", hint: "Belts, pouches, cloaks" },
    { key: "wristLeft", label: "Wrist (L)", hint: "Rings, bracelets" },
    { key: "wristRight", label: "Wrist (R)", hint: "Rings, bracelets" },
    { key: "feet", label: "Footwear", hint: "Boots" },
]

export function emptyAccessories(): Equipment["accessories"] {
    return {
        head: null,
        neck: null,
        waist: null,
        wristLeft: null,
        wristRight: null,
        feet: null,
    }
}

function isAccessorySlotKey(value: string): value is AccessorySlotKey {
    return (ACCESSORY_SLOT_KEYS as readonly string[]).includes(value)
}

/** Expand catalog `allowedSlots` into current accessory slot keys (includes legacy aliases). */
export function expandItemAccessorySlots(allowedSlots: readonly string[] | undefined): Set<AccessorySlotKey> {
    const out = new Set<AccessorySlotKey>()
    if (!allowedSlots) return out
    for (const raw of allowedSlots) {
        const slot = String(raw).trim()
        if (!slot) continue
        if (isAccessorySlotKey(slot)) {
            out.add(slot)
            continue
        }
        const mapped = LEGACY_ACCESSORY_SLOT_MAP[slot]
        if (mapped) {
            for (const key of mapped) out.add(key)
        }
    }
    return out
}

export function itemAllowedInAccessorySlot(
    allowedSlots: readonly string[] | undefined,
    slot: AccessorySlotKey,
): boolean {
    return expandItemAccessorySlots(allowedSlots).has(slot)
}

/** Migrate older saves (face, back, ring slots, …) to the reduced accessory layout. */
export function migrateAccessories(
    raw: Record<string, string | null | undefined> | null | undefined,
): Equipment["accessories"] {
    const src = raw ?? {}
    const next = emptyAccessories()

    const assign = (slot: AccessorySlotKey, uid: unknown) => {
        if (uid == null || uid === "") return
        if (next[slot] != null) return
        next[slot] = String(uid)
    }

    assign("head", src.head ?? src.face ?? src.ears)
    assign("neck", src.neck)
    assign("waist", src.waist ?? src.back)
    assign("wristLeft", src.wristLeft ?? src.ringLeft ?? src.hands)
    assign("wristRight", src.wristRight ?? src.ringRight)
    assign("feet", src.feet)

    return next
}

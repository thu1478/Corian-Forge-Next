/** Elements inside an action card that must not trigger outer “pick this card” handlers. */
export const ACTION_CARD_INTERACTIVE_SELECTOR =
    "button, a, input, textarea, select, [data-action-no-edit]"

export function isActionCardInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return !!target.closest(ACTION_CARD_INTERACTIVE_SELECTOR)
}

export type NotificationType = 'endOfCombat' | 'zennyAdded' | 'zennySpent'

export type NotificationPayloadMap = {
  endOfCombat: undefined
  zennyAdded: { amount: number }
  zennySpent: { amount: number }
}

export type NotificationPayload<T extends NotificationType> =
  NotificationPayloadMap[T]

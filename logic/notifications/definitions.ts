import type { NotificationPayload, NotificationType } from './types'

export type NotificationDefinition = {
  title: string
  description: string
}

const staticDefinitions = {
  endOfCombat: {
    title: 'End of combat',
    description:
      'Focus and barrier cleared. Combat defense, stability, and speed deltas reset. End-of-combat charges restored.',
  },
} as const satisfies Record<string, NotificationDefinition>

export function getNotificationDefinition<T extends NotificationType>(
  type: T,
  payload?: NotificationPayload<T>,
): NotificationDefinition {
  switch (type) {
    case 'endOfCombat':
      return staticDefinitions.endOfCombat
    case 'zennyAdded': {
      const amount = (payload as NotificationPayload<'zennyAdded'> | undefined)
        ?.amount
      return {
        title: 'Zenny added',
        description: `Added ${amount ?? 0} Zenny.`,
      }
    }
    case 'zennySpent': {
      const amount = (payload as NotificationPayload<'zennySpent'> | undefined)
        ?.amount
      return {
        title: 'Zenny spent',
        description: `Spent ${amount ?? 0} Zenny.`,
      }
    }
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

import { addNotification } from '@/hooks/use-notifications'

import { getNotificationDefinition } from './definitions'
import type { NotificationPayload, NotificationType } from './types'

export function pushNotification<T extends NotificationType>(
  type: T,
  payload?: NotificationPayload<T>,
) {
  const { title, description } = getNotificationDefinition(type, payload)
  return addNotification(type, title, description)
}

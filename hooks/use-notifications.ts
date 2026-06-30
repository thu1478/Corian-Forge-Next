'use client'

import * as React from 'react'

import type { ToastProps } from '@/components/ui/toast'
import type { NotificationType } from '@/logic/notifications/types'

export const NOTIFICATION_LIMIT = 5
export const NOTIFICATION_DURATION = 10000
const NOTIFICATION_REMOVE_DELAY = 300

export type NotificationItem = ToastProps & {
  id: string
  type: NotificationType
  title: string
  description: string
}

type Action =
  | { type: 'ADD_NOTIFICATION'; notification: NotificationItem }
  | { type: 'DISMISS_NOTIFICATION'; notificationId?: string }
  | { type: 'REMOVE_NOTIFICATION'; notificationId?: string }

interface State {
  notifications: NotificationItem[]
}

const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const clearRemoveQueue = (notificationId: string) => {
  const timeout = removeTimeouts.get(notificationId)
  if (timeout) {
    clearTimeout(timeout)
    removeTimeouts.delete(notificationId)
  }
}

const addToRemoveQueue = (notificationId: string) => {
  if (removeTimeouts.has(notificationId)) {
    return
  }

  const timeout = setTimeout(() => {
    removeTimeouts.delete(notificationId)
    dispatch({ type: 'REMOVE_NOTIFICATION', notificationId })
  }, NOTIFICATION_REMOVE_DELAY)

  removeTimeouts.set(notificationId, timeout)
}

function purgeClosingNotifications(notifications: NotificationItem[]) {
  return notifications.filter((notification) => {
    if (notification.open === false) {
      clearRemoveQueue(notification.id)
      return false
    }
    return true
  })
}

function forceRemoveTop(notifications: NotificationItem[]) {
  if (notifications.length === 0) {
    return notifications
  }

  clearRemoveQueue(notifications[0].id)
  return notifications.slice(1)
}

function evictTopNotification(notifications: NotificationItem[]) {
  if (notifications.length === 0) {
    return notifications
  }

  const [top, ...rest] = notifications

  addToRemoveQueue(top.id)
  return [{ ...top, open: false }, ...rest]
}

export function notificationReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const hadClosing = state.notifications.some(
        (notification) => notification.open === false,
      )
      let notifications = purgeClosingNotifications(state.notifications)

      if (notifications.length >= NOTIFICATION_LIMIT) {
        if (
          !hadClosing &&
          notifications.length === NOTIFICATION_LIMIT
        ) {
          notifications = evictTopNotification(notifications)
        } else {
          while (notifications.length >= NOTIFICATION_LIMIT) {
            notifications = forceRemoveTop(notifications)
          }
        }
      }

      let next = [...notifications, action.notification]

      if (next.length > NOTIFICATION_LIMIT + 1) {
        while (next.length > NOTIFICATION_LIMIT) {
          next = forceRemoveTop(next)
        }
      }

      return {
        ...state,
        notifications: next,
      }
    }

    case 'DISMISS_NOTIFICATION': {
      const { notificationId } = action

      if (notificationId) {
        addToRemoveQueue(notificationId)
      } else {
        state.notifications.forEach((notification) => {
          addToRemoveQueue(notification.id)
        })
      }

      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId || notificationId === undefined
            ? { ...notification, open: false }
            : notification,
        ),
      }
    }

    case 'REMOVE_NOTIFICATION':
      if (action.notificationId === undefined) {
        return { ...state, notifications: [] }
      }
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.notificationId,
        ),
      }

    default:
      return state
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { notifications: [] }

function dispatch(action: Action) {
  memoryState = notificationReducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

export function addNotification(
  type: NotificationType,
  title: string,
  description: string,
) {
  const id = genId()
  const dismiss = () =>
    dispatch({ type: 'DISMISS_NOTIFICATION', notificationId: id })

  dispatch({
    type: 'ADD_NOTIFICATION',
    notification: {
      id,
      type,
      title,
      description,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return { id, dismiss }
}

export function dismissNotification(notificationId?: string) {
  dispatch({ type: 'DISMISS_NOTIFICATION', notificationId })
}

export function useNotifications() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    dismissNotification,
  }
}

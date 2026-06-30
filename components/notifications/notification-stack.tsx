'use client'

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { NOTIFICATION_DURATION, useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

export function NotificationStack() {
  const { notifications } = useNotifications()

  return (
    <ToastProvider swipeDirection="right" duration={NOTIFICATION_DURATION}>
      {notifications.map(({ id, title, description, ...props }) => (
        <Toast
          key={id}
          className={cn('relative w-full p-4 pr-10')}
          {...props}
        >
          <div className="grid gap-1">
            <ToastTitle>{title}</ToastTitle>
            <ToastDescription>{description}</ToastDescription>
          </div>
          <ToastClose className="opacity-100" />
        </Toast>
      ))}
      <ToastViewport className="fixed bottom-4 right-4 top-auto z-[100] flex max-h-none w-full max-w-[420px] flex-col gap-2 items-stretch p-0" />
    </ToastProvider>
  )
}

import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

/**
 * Why push can't be turned on here, if it can't. iOS delivers Web Push only to a PWA added to
 * the Home Screen (iOS 16.4+), so Safari tabs get a hint to install first.
 */
export type PushBlocker = 'not-configured' | 'not-installed' | 'unsupported' | 'denied' | null

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function pushBlocker(): PushBlocker {
  if (!env.VITE_VAPID_PUBLIC_KEY) return 'not-configured'
  if (isIos() && !isStandalone()) return 'not-installed'
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  return null
}

/** The VAPID key as the bytes PushManager wants. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** This device's subscription, if reminders are on here. */
export async function currentSubscription() {
  if (pushBlocker()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** Must run from a tap: iOS only asks for permission in response to the user. */
export async function subscribe() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission_denied')

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(env.VITE_VAPID_PUBLIC_KEY!),
    }))

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  // Re-subscribing the same device keeps one row per endpoint.
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
  if (error) throw error
}

export async function unsubscribe() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('send-reminders', {
    body: { test: true },
  })
  if (error) throw error
  return (data as { sent: number }).sent
}

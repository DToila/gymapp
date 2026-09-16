import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase environment variables on the server.' }
  }

  return { supabaseUrl, serviceRoleKey }
}

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
}

// Fans a notification out to every subscribed device. Never throws — a push
// failure should never block whatever real action (a lead being saved, a
// payment being recorded) triggered the notification.
export async function sendPushToAll(payload: PushNotificationPayload): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.log('[webPush] VAPID not configured — skipping push send:', payload.title)
    return
  }

  const env = getEnv()
  if ('error' in env) {
    console.error('[webPush] missing Supabase env:', env.error)
    return
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const { data: subscriptions, error } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error) {
    console.error('[webPush] failed to load subscriptions:', error)
    return
  }

  if (!subscriptions || subscriptions.length === 0) return

  const payloadJson = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson
        )
      } catch (err: any) {
        const statusCode = err?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (browser data cleared, app uninstalled, etc.).
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('[webPush] send failed for subscription', sub.id, err)
        }
      }
    })
  )
}

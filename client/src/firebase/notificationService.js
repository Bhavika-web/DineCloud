import { getToken, onMessage } from 'firebase/messaging'
import http from '../api/http'
import { messagingPromise } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

const foregroundMessageListeners = new Set()
let unsubscribeFirebaseMessageListener

export const getMessagingServiceWorkerRegistration = async () => {
  const rootUrl = `${window.location.origin}/`
  const registration = await navigator.serviceWorker.getRegistration(rootUrl)
  if (!registration) {
    throw new Error('The Firebase messaging service worker is not registered.')
  }

  const readyRegistration = await navigator.serviceWorker.ready
  if (readyRegistration.scope !== registration.scope) {
    throw new Error('The active service worker does not match the messaging scope.')
  }

  const activeRegistration = registration.active ? registration : readyRegistration
  if (!activeRegistration.active) {
    throw new Error('The Firebase messaging service worker is not active.')
  }

  console.info('[FCM CLIENT] Service worker available.', {
    scope: activeRegistration.scope,
    activeState: activeRegistration.active.state,
    pageControlled: Boolean(navigator.serviceWorker.controller),
  })

  return activeRegistration
}

export const registerOrderNotifications = async ({
  orderId,
  trackingToken,
}) => {
  let token
  let stage = 'permission'

  try {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications.')
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('This browser cannot run notification service workers.')
    }

    if (!VAPID_KEY) {
      throw new Error('Browser notifications are not configured.')
    }

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    console.info('[FCM CLIENT] Notification permission checked.', {
      permission,
    })
    if (permission !== 'granted') {
      throw new Error(
        permission === 'denied'
          ? 'Notifications are blocked in this browser. You can enable them in browser settings.'
          : 'Notification permission was not granted.',
      )
    }

    stage = 'messaging-support'
    const messaging = await messagingPromise
    if (!messaging) {
      throw new Error('Browser notifications are not available in this environment.')
    }

    stage = 'service-worker'
    const existingRegistration = await navigator.serviceWorker.getRegistration(
      `${window.location.origin}/`,
    )
    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    )
    const activeRegistration = await getMessagingServiceWorkerRegistration()
    if (activeRegistration.scope !== serviceWorkerRegistration.scope) {
      throw new Error('The registered messaging service worker has an unexpected scope.')
    }

    console.info('[FCM CLIENT] Messaging service worker registration ready.', {
      alreadyRegistered: Boolean(existingRegistration),
      scope: serviceWorkerRegistration.scope,
    })

    stage = 'token-generation'
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: activeRegistration,
    })

    if (!token) {
      throw new Error('Firebase did not provide a notification token.')
    }

    console.info('[FCM CLIENT] Registration token generated.', {
      tokenSuffix: token.slice(-6),
    })

    stage = 'registration-api'
    await http.post(
      `/orders/${encodeURIComponent(orderId)}/notifications`,
      { token },
      { headers: { Authorization: `Bearer ${trackingToken}` } },
    )
    console.info('[FCM CLIENT] Order token registration accepted by backend.', {
      orderId,
    })
  } catch (error) {
    const message = String(error.message || 'Unknown notification error.')
    console.error('[FCM CLIENT] Customer registration failed.', {
      orderId,
      stage,
      name: error.name,
      code: error.code || error.response?.status,
      message: token ? message.split(token).join('[redacted]') : message,
    })
    throw error
  }
}

export const subscribeToForegroundMessages = async (onNotification) => {
  const messaging = await messagingPromise
  if (!messaging) {
    console.warn(
      '[FCM CLIENT] onMessage listener not registered; Firebase Messaging is unavailable.',
    )
    return () => {}
  }

  foregroundMessageListeners.add(onNotification)

  if (!unsubscribeFirebaseMessageListener) {
    console.info('[FCM CLIENT] Registering onMessage listener.')
    unsubscribeFirebaseMessageListener = onMessage(messaging, (payload) => {
      console.info('[FCM CLIENT] Foreground message received.', {
        messageId: payload.messageId,
        data: {
          title: payload.data?.title,
          body: payload.data?.body,
          orderId: payload.data?.orderId,
          status: payload.data?.status,
          eventId: payload.data?.eventId,
          url: payload.data?.url,
        },
      })
      foregroundMessageListeners.forEach((listener) => listener(payload))
    })
    console.info('[FCM CLIENT] onMessage listener registered.')
  } else {
    console.info('[FCM CLIENT] Reusing active onMessage listener.')
  }

  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    foregroundMessageListeners.delete(onNotification)

    if (foregroundMessageListeners.size === 0) {
      unsubscribeFirebaseMessageListener?.()
      unsubscribeFirebaseMessageListener = undefined
      console.info('[FCM CLIENT] onMessage listener unregistered.')
    }
  }
}

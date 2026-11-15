const { randomUUID } = require('node:crypto')
const NotificationSubscription = require('../models/NotificationSubscription')

const NOTIFICATION_CONTENT = {
  Preparing: {
    title: 'DineCloud order update',
    body: 'Your DineCloud order is now being prepared!',
  },
  Ready: {
    title: 'DineCloud order update',
    body: 'Your DineCloud order is ready for pickup!',
  },
  Cancelled: {
    title: 'DineCloud order update',
    body: 'Your DineCloud order has been cancelled.',
  },
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
])

const redactTokens = (message, tokens) =>
  tokens.reduce(
    (safeMessage, token) => safeMessage.split(token).join('[redacted]'),
    String(message || 'Unknown Firebase Messaging error.'),
  )

const sendOrderStatusNotification = async (order) => {
  const content = NOTIFICATION_CONTENT[order.status]
  if (!content) return { sentCount: 0, failedCount: 0, removedCount: 0 }

  const subscriptions = await NotificationSubscription.find({
    orderId: order._id,
  })
    .select('_id token')
    .lean()

  console.info('[FCM] Order subscriptions found.', {
    orderId: String(order._id),
    status: order.status,
    subscriptionCount: subscriptions.length,
  })

  if (subscriptions.length === 0) {
    return { sentCount: 0, failedCount: 0, removedCount: 0 }
  }

  const firebaseApp = require('../config/firebase/firebaseAdmin')
  const { getMessaging } = require('firebase-admin/messaging')
  const messaging = getMessaging(firebaseApp)
  const orderId = String(order._id)
  const clickUrl = `/track-order?orderId=${encodeURIComponent(orderId)}`
  const eventId = randomUUID()
  let sentCount = 0
  let failedCount = 0
  let removedCount = 0

  for (let start = 0; start < subscriptions.length; start += 500) {
    const batch = subscriptions.slice(start, start + 500)
    const batchTokens = batch.map(({ token }) => token)
    console.info('[FCM] Multicast send attempted.', {
      orderId,
      status: order.status,
      tokenCount: batch.length,
    })

    let response
    try {
      response = await messaging.sendEachForMulticast({
        data: {
          title: content.title,
          body: content.body,
          eventId,
          orderId,
          status: order.status,
          url: clickUrl,
        },
        webpush: {
          headers: { Urgency: 'high' },
        },
        tokens: batchTokens,
      })
    } catch (error) {
      console.error('[FCM] Multicast request failed.', {
        orderId,
        status: order.status,
        code: error.code,
        message: redactTokens(error.message, batchTokens),
      })
      throw error
    }

    sentCount += response.successCount
    failedCount += response.failureCount
    console.info('[FCM] Multicast results received.', {
      orderId,
      status: order.status,
      successCount: response.successCount,
      failureCount: response.failureCount,
    })

    const invalidSubscriptions = response.responses
      .map((result, index) => ({
        result,
        subscription: batch[index],
      }))
      .filter(({ result }) => result.error)
      .map(({ result, subscription }) => {
        console.error('[FCM] Individual token send failed.', {
          orderId,
          status: order.status,
          code: result.error.code,
          message: redactTokens(result.error.message, [subscription.token]),
        })
        return { result, subscription }
      })
      .filter(({ result }) => INVALID_TOKEN_CODES.has(result.error.code))
      .map(({ subscription }) => subscription)

    if (invalidSubscriptions.length > 0) {
      const deleted = await NotificationSubscription.deleteMany({
        $or: invalidSubscriptions.map(({ _id, token }) => ({ _id, token })),
      })
      removedCount += deleted.deletedCount
      console.info('[FCM] Invalid token cleanup completed.', {
        orderId,
        attemptedCount: invalidSubscriptions.length,
        removedCount: deleted.deletedCount,
      })
    }
  }

  console.info('[FCM] Order status notification delivery completed.', {
    orderId,
    status: order.status,
    sentCount,
    failedCount,
    removedCount,
  })

  return { sentCount, failedCount, removedCount }
}

module.exports = { sendOrderStatusNotification }

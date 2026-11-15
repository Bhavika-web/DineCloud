import { useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { registerOrderNotifications } from '../firebase/notificationService'

const trackingCredentialKey = (orderId) =>
  `dinecloud-order-tracking:${orderId}`

function EnableOrderNotifications({ orderId, trackingToken }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const isSupported = (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  )
  const isDenied = isSupported && Notification.permission === 'denied'

  const enableNotifications = async () => {
    setIsRegistering(true)
    setMessage('')

    try {
      await registerOrderNotifications({ orderId, trackingToken })
      let storageWarning = ''

      try {
        localStorage.setItem(
          trackingCredentialKey(orderId),
          JSON.stringify({ trackingId: orderId, trackingToken }),
        )
      } catch {
        storageWarning =
          'Notifications are enabled, but a notification may not be able to open tracking in a new tab.'
      }

      setIsEnabled(true)
      setMessage(storageWarning)
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.message ||
        'Could not enable order notifications. Your order is unaffected.',
      )
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <section aria-labelledby="notification-opt-in-title" className="confirmation-card notification-opt-in">
      <div className="confirmation-section-heading">
        {isEnabled
          ? <BellRing aria-hidden="true" size={19} />
          : <Bell aria-hidden="true" size={19} />}
        <h3 id="notification-opt-in-title">Order notifications</h3>
      </div>
      <p className="tracking-intro">
        Get a browser notification when your order is being prepared or ready.
        This is optional and does not affect your order.
      </p>
      {!isSupported && (
        <p className="notification-feedback" role="status">
          Browser notifications are not available here. You can still track your order.
        </p>
      )}
      {isDenied && (
        <p className="notification-feedback" role="status">
          Notifications are blocked. Allow them in browser settings if you want order updates.
        </p>
      )}
      {message && (
        <p className="notification-feedback" role="status">{message}</p>
      )}
      <button
        className="confirmation-track-button notification-action"
        disabled={
          !orderId ||
          !trackingToken ||
          !isSupported ||
          isDenied ||
          isRegistering ||
          isEnabled
        }
        onClick={enableNotifications}
        type="button"
      >
        {isRegistering
          ? 'Enabling…'
          : isEnabled
            ? 'Notifications enabled'
            : isDenied
              ? 'Allow notifications in browser settings'
              : 'Enable order notifications'}
      </button>
    </section>
  )
}

export default EnableOrderNotifications

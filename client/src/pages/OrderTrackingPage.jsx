import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, MapPin, RefreshCw, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import http from '../api/http'

const PENDING_ORDER_STORAGE_KEY = 'dinecloud-pending-order-confirmation'
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

const readTrackingCredentials = () => {
  try {
    const storedValue = sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY)
    if (!storedValue) return { error: 'Order tracking details are not available in this browser session.' }

    const result = JSON.parse(storedValue)
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return { error: 'Saved order details are invalid. Return to the menu to continue.' }
    }
    if (typeof result.trackingToken !== 'string' || !result.trackingToken.trim()) {
      return { error: 'The tracking token is missing. This order cannot be looked up from this session.' }
    }
    if (typeof result.trackingId !== 'string' || !OBJECT_ID_PATTERN.test(result.trackingId)) {
      return { error: 'The saved tracking ID is invalid. Return to the menu to continue.' }
    }

    return { trackingId: result.trackingId.toLowerCase(), trackingToken: result.trackingToken }
  } catch {
    return { error: 'Saved order details could not be read. Return to the menu to continue.' }
  }
}

const formatDate = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(amount)

const normalizeOrder = (data) => {
  const order = data?.order
  if (
    !order ||
    typeof order !== 'object' ||
    Array.isArray(order) ||
    typeof order.status !== 'string' ||
    !order.status.trim() ||
    !Array.isArray(order.items) ||
    order.items.length === 0 ||
    !Number.isFinite(order.totalAmount) ||
    order.totalAmount < 0 ||
    typeof order.address !== 'string' ||
    typeof order.paymentMethod !== 'string'
  ) {
    return null
  }

  const items = order.items.map((item) => {
    if (
      !item ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return null
    }
    return { name: item.name, price: item.price, quantity: item.quantity }
  })

  if (items.some((item) => item === null)) return null
  return {
    trackingId: typeof data.trackingId === 'string' && data.trackingId.trim()
      ? data.trackingId
      : '',
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    totalAmount: order.totalAmount,
    address: order.address,
    paymentMethod: order.paymentMethod,
  }
}

const requestTrackedOrder = async (credentials, signal) => {
  const { data } = await http.get(`/orders/${encodeURIComponent(credentials.trackingId)}`, {
    headers: { Authorization: `Bearer ${credentials.trackingToken}` },
    signal,
  })
  const order = normalizeOrder(data)
  if (!order) {
    throw Object.assign(new Error('Invalid tracking response.'), { invalidTrackingResponse: true })
  }
  return order
}

const getTrackingErrorMessage = (error) => {
  if (error.invalidTrackingResponse) {
    return 'The tracking service returned incomplete order details. Please retry.'
  }
  const status = error.response?.status
  if (status === 400) return 'The saved tracking ID is invalid. Return to your confirmation page or menu.'
  if (status === 401) return 'This tracking session is invalid or has expired. Place a new order to receive a fresh tracking link.'
  if (status === 404) return 'We could not find this order. Check that you are using the browser session where it was placed.'
  if (status === 429) return 'Too many refresh attempts. Please wait a moment before trying again.'
  if (status >= 500) return 'The order tracking service is temporarily unavailable. Please try again.'
  return 'We could not reach the order tracking service. Check your connection and retry.'
}

function OrderTrackingPage() {
  const [credentials] = useState(readTrackingCredentials)
  const [order, setOrder] = useState(null)
  const [errorMessage, setErrorMessage] = useState(credentials.error || '')
  const [isLoading, setIsLoading] = useState(Boolean(credentials.trackingId && credentials.trackingToken))
  const requestLock = useRef(false)

  const refreshOrder = useCallback(async () => {
    if (
      requestLock.current ||
      !credentials.trackingId ||
      !credentials.trackingToken
    ) return

    requestLock.current = true
    setIsLoading(true)
    setErrorMessage('')
    try {
      setOrder(await requestTrackedOrder(credentials))
    } catch (error) {
      setErrorMessage(getTrackingErrorMessage(error))
    } finally {
      requestLock.current = false
      setIsLoading(false)
    }
  }, [credentials])

  useEffect(() => {
    if (!credentials.trackingId || !credentials.trackingToken) return undefined

    const controller = new AbortController()
    let active = true
    requestTrackedOrder(credentials, controller.signal)
      .then((trackedOrder) => {
        if (active) setOrder(trackedOrder)
      })
      .catch((error) => {
        if (active) setErrorMessage(getTrackingErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [credentials])

  return (
    <section aria-labelledby="tracking-title" className="order-tracking-page">
      <header className="tracking-page-header">
        <p className="checkout-kicker">ORDER UPDATES</p>
        <h2 id="tracking-title">Track your order</h2>
        <p className="tracking-intro">View the latest details and status for your order.</p>
      </header>

      {credentials.trackingId && (
        <div className="confirmation-reference-card tracking-reference">
          <span>Tracking / Order ID</span>
          <strong>{order?.trackingId || credentials.trackingId}</strong>
        </div>
      )}

      {errorMessage && (
        <div className="tracking-error" role="alert">
          <p>{errorMessage}</p>
          {credentials.trackingId && credentials.trackingToken && (
            <button
              className="tracking-retry-button"
              disabled={isLoading}
              onClick={refreshOrder}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={15} />
              Retry
            </button>
          )}
        </div>
      )}

      {isLoading && !order && (
        <p className="tracking-loading" role="status">Loading the latest order information…</p>
      )}

      {order && (
        <>
          <div className="tracking-status-grid">
            <div className="tracking-status-card">
              <span>Current status</span>
              <strong className="tracking-status-value">{order.status}</strong>
            </div>
            <div className="tracking-status-card">
              <span>Order placed</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
            <div className="tracking-status-card">
              <span>Last updated</span>
              <strong>{formatDate(order.updatedAt)}</strong>
            </div>
          </div>

          <section aria-label="Current order details" className="confirmation-card tracking-order-card">
            <div className="confirmation-section-heading">
              <Utensils aria-hidden="true" size={19} />
              <h3>Order details</h3>
            </div>
            <ul className="confirmation-items">
              {order.items.map((item, index) => (
                <li className="confirmation-item" key={`${item.name}-${index}`}>
                  <span className="confirmation-item-copy">
                    <strong>{item.name}</strong>
                    <small>Qty {item.quantity} · {formatPrice(item.price)} each</small>
                  </span>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            <div className="confirmation-total">
              <span>Total</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
          </section>

          <div className="confirmation-info-grid tracking-info-grid">
            <section className="confirmation-card">
              <div className="confirmation-section-heading">
                <MapPin aria-hidden="true" size={19} />
                <h3>Delivery address</h3>
              </div>
              <p className="confirmation-address">{order.address}</p>
            </section>
            <section className="confirmation-card">
              <div className="confirmation-section-heading">
                <CreditCard aria-hidden="true" size={19} />
                <h3>Payment method</h3>
              </div>
              <p className="confirmation-payment">{order.paymentMethod}</p>
            </section>
          </div>
        </>
      )}

      <div className="tracking-page-actions">
        <button
          className="tracking-refresh-button"
          disabled={!credentials.trackingId || !credentials.trackingToken || isLoading}
          onClick={refreshOrder}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          {isLoading ? 'Refreshing…' : 'Refresh order status'}
        </button>
        <Link className="confirmation-menu-button" to="/menu">
          Back to menu
        </Link>
      </div>
    </section>
  )
}

export default OrderTrackingPage

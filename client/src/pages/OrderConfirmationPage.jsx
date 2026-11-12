import { ArrowRight, CheckCircle2, CreditCard, MapPin, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'

const PENDING_ORDER_STORAGE_KEY = 'dinecloud-pending-order-confirmation'

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(amount)

const readConfirmation = () => {
  try {
    const storedValue = sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY)
    if (!storedValue) return null

    const result = JSON.parse(storedValue)
    if (
      !result ||
      typeof result !== 'object' ||
      Array.isArray(result) ||
      typeof result.trackingId !== 'string' ||
      !result.trackingId.trim()
    ) {
      return null
    }

    const order = result.order
    if (
      !order ||
      typeof order !== 'object' ||
      Array.isArray(order) ||
      !Array.isArray(order.items) ||
      !Number.isFinite(order.totalAmount) ||
      order.totalAmount < 0 ||
      typeof order.address !== 'string' ||
      !order.address.trim() ||
      typeof order.paymentMethod !== 'string' ||
      !order.paymentMethod.trim()
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
    if (items.length === 0 || items.some((item) => item === null)) return null

    const orderId = typeof order._id === 'string'
      ? order._id
      : typeof order.id === 'string'
        ? order.id
        : ''

    return {
      trackingId: result.trackingId,
      orderId,
      items,
      totalAmount: order.totalAmount,
      address: order.address,
      paymentMethod: order.paymentMethod,
    }
  } catch {
    return null
  }
}

function OrderConfirmationPage() {
  const confirmation = readConfirmation()

  if (!confirmation) {
    return (
      <section className="order-confirmation-page order-confirmation-missing">
        <div className="confirmation-success-icon is-muted">
          <Utensils aria-hidden="true" size={27} />
        </div>
        <p className="checkout-kicker">ORDER DETAILS UNAVAILABLE</p>
        <h2>We couldn’t load your confirmation</h2>
        <p className="confirmation-intro">
          This confirmation may have expired or is not available in this browser session. You can continue browsing the menu.
        </p>
        <div className="confirmation-actions">
          <Link className="confirmation-track-button" to="/track-order">
            Track this order <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Link className="confirmation-menu-button" to="/menu">
            Continue browsing the menu
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="confirmation-title" className="order-confirmation-page">
      <div className="confirmation-header">
        <div className="confirmation-success-icon">
          <CheckCircle2 aria-hidden="true" size={30} />
        </div>
        <p className="checkout-kicker">THANK YOU FOR YOUR ORDER</p>
        <h2 id="confirmation-title">Your order has been placed!</h2>
        <p className="confirmation-intro">We’ve received your order and are getting it ready.</p>
        <span className="confirmation-status"><span aria-hidden="true" /> Placed</span>
      </div>

      <div className="confirmation-details">
        <div className="confirmation-reference-card">
          <span>Tracking ID</span>
          <strong>{confirmation.trackingId}</strong>
          {confirmation.orderId && (
            <small>Order ID: {confirmation.orderId}</small>
          )}
        </div>

        <section aria-labelledby="confirmation-items-title" className="confirmation-card">
          <div className="confirmation-section-heading">
            <Utensils aria-hidden="true" size={19} />
            <h3 id="confirmation-items-title">Your order</h3>
          </div>
          <ul className="confirmation-items">
            {confirmation.items.map((item, index) => (
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
            <strong>{formatPrice(confirmation.totalAmount)}</strong>
          </div>
        </section>

        <div className="confirmation-info-grid">
          <section className="confirmation-card">
            <div className="confirmation-section-heading">
              <MapPin aria-hidden="true" size={19} />
              <h3>Delivery address</h3>
            </div>
            <p className="confirmation-address">{confirmation.address}</p>
          </section>
          <section className="confirmation-card">
            <div className="confirmation-section-heading">
              <CreditCard aria-hidden="true" size={19} />
              <h3>Payment method</h3>
            </div>
            <p className="confirmation-payment">{confirmation.paymentMethod}</p>
          </section>
        </div>
      </div>

      <Link className="confirmation-menu-button" to="/menu">
        Continue browsing the menu
      </Link>
    </section>
  )
}

export default OrderConfirmationPage

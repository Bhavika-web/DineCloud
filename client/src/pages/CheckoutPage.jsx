import { useState } from 'react'
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, CreditCard, MapPin, QrCode, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import useCart from '../context/useCart'

const paymentOptions = [
  { value: 'Cash', description: 'Pay when your order arrives', icon: Banknote },
  { value: 'UPI/QR', description: 'Choose UPI at the next step', icon: QrCode },
  { value: 'Card', description: 'Choose card at the next step', icon: CreditCard },
]

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

const validateForm = (form) => {
  const errors = {}
  if (!form.name.trim()) {
    errors.name = 'Please enter your full name.'
  }
  if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.'
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address, or leave this field empty.'
  }
  if (form.address.trim().length < 10) {
    errors.address = 'Please enter a delivery address with at least 10 characters.'
  }
  return errors
}

function CheckoutPage() {
  const { items, itemCount, subtotal, total } = useCart()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    paymentMethod: 'Cash',
  })
  const [errors, setErrors] = useState({})
  const [showNextStageMessage, setShowNextStageMessage] = useState(false)

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    setShowNextStageMessage(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const formErrors = validateForm(form)
    setErrors(formErrors)
    setShowNextStageMessage(Object.keys(formErrors).length === 0)
  }

  if (items.length === 0) {
    return (
      <section className="checkout-empty">
        <div className="checkout-empty-icon"><MapPin aria-hidden="true" size={27} /></div>
        <p className="checkout-kicker">A GOOD MEAL IS JUST A FEW CLICKS AWAY</p>
        <h2>Your cart is waiting for something delicious</h2>
        <p>Add a dish from our menu and come back here to finish your order.</p>
        <Link className="checkout-back-link" to="/menu">
          <ArrowLeft aria-hidden="true" size={16} /> Back to Menu
        </Link>
      </section>
    )
  }

  return (
    <div className="checkout-page">
      <div className="checkout-page-heading">
        <Link className="checkout-breadcrumb" to="/menu">
          <ArrowLeft aria-hidden="true" size={15} /> Back to Menu
        </Link>
        <p className="checkout-kicker">ALMOST THERE</p>
        <h2>Make it yours.</h2>
        <p className="checkout-intro">A few details and we’ll get your favorites ready.</p>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" noValidate onSubmit={handleSubmit}>
          <section aria-labelledby="customer-details-title" className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">01</span>
              <div>
                <h3 id="customer-details-title">Your details</h3>
                <p>Who should we prepare this order for?</p>
              </div>
            </div>
            <div className="checkout-fields">
              <label className="checkout-field" htmlFor="customer-name">
                <span>Full name <span className="required-mark">*</span></span>
                <input
                  autoComplete="name"
                  aria-describedby={errors.name ? 'customer-name-error' : undefined}
                  aria-invalid={Boolean(errors.name)}
                  id="customer-name"
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your full name"
                  value={form.name}
                />
                {errors.name && <small className="field-error" id="customer-name-error">{errors.name}</small>}
              </label>

              <label className="checkout-field" htmlFor="customer-phone">
                <span>Phone number <span className="required-mark">*</span></span>
                <div className={`phone-input${errors.phone ? ' has-error' : ''}`}>
                  <span className="phone-prefix">+91</span>
                  <input
                    autoComplete="tel-national"
                    aria-describedby={errors.phone ? 'customer-phone-error' : undefined}
                    aria-invalid={Boolean(errors.phone)}
                    id="customer-phone"
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    value={form.phone}
                  />
                </div>
                {errors.phone && <small className="field-error" id="customer-phone-error">{errors.phone}</small>}
              </label>

              <label className="checkout-field checkout-field-full" htmlFor="customer-email">
                <span>Email <span className="optional-label">Optional</span></span>
                <input
                  autoComplete="email"
                  aria-describedby={errors.email ? 'customer-email-error' : undefined}
                  aria-invalid={Boolean(errors.email)}
                  id="customer-email"
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                />
                {errors.email && <small className="field-error" id="customer-email-error">{errors.email}</small>}
              </label>
            </div>
          </section>

          <section aria-labelledby="delivery-address-title" className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">02</span>
              <div>
                <h3 id="delivery-address-title">Delivery address</h3>
                <p>Where should we bring your order?</p>
              </div>
            </div>
            <label className="checkout-field" htmlFor="delivery-address">
              <span>Full address <span className="required-mark">*</span></span>
              <textarea
                aria-describedby={errors.address ? 'delivery-address-error' : undefined}
                aria-invalid={Boolean(errors.address)}
                id="delivery-address"
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="House / flat, street, area, landmark and city"
                rows="4"
                value={form.address}
              />
              {errors.address && <small className="field-error" id="delivery-address-error">{errors.address}</small>}
            </label>
          </section>

          <section aria-labelledby="payment-method-title" className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">03</span>
              <div>
                <h3 id="payment-method-title">Payment preference</h3>
                <p>Select how you’d like to pay. No payment is collected now.</p>
              </div>
            </div>
            <div className="payment-options" role="group" aria-labelledby="payment-method-title">
              {paymentOptions.map(({ value, description, icon: Icon }) => (
                <button
                  aria-pressed={form.paymentMethod === value}
                  className={`payment-option${form.paymentMethod === value ? ' is-selected' : ''}`}
                  key={value}
                  onClick={() => updateField('paymentMethod', value)}
                  type="button"
                >
                  <span className="payment-option-icon"><Icon aria-hidden="true" size={19} /></span>
                  <span className="payment-option-copy">
                    <strong>{value}</strong>
                    <small>{description}</small>
                  </span>
                  <span aria-hidden="true" className="payment-radio" />
                </button>
              ))}
            </div>
          </section>

          <div className="checkout-submit-area">
            <button className="place-order-button" type="submit">
              Continue to Place Order <ArrowRight aria-hidden="true" size={17} />
            </button>
            <p className="checkout-secure-note"><ShieldCheck aria-hidden="true" size={14} /> Your details stay safe with us</p>
            {showNextStageMessage && (
              <p className="next-stage-message" role="status">
                <CheckCircle2 aria-hidden="true" size={17} />
                Details look good! Order placement will be enabled in the next stage.
              </p>
            )}
          </div>
        </form>

        <aside aria-label="Order summary" className="checkout-summary-card">
          <div className="checkout-summary-heading">
            <div>
              <p className="checkout-kicker">MADE FRESH FOR YOU</p>
              <h3>Order summary</h3>
            </div>
            <span className="checkout-summary-count">{itemCount} items</span>
          </div>

          <div className="checkout-summary-items">
            {items.map((item) => (
              <div className="checkout-summary-item" key={item.id}>
                <div className="checkout-summary-image">
                  {item.image ? (
                    <img alt="" loading="lazy" src={item.image} />
                  ) : (
                    <span aria-hidden="true">{item.emoji || '🍽️'}</span>
                  )}
                </div>
                <div className="checkout-summary-item-copy">
                  <strong>{item.name}</strong>
                  <span>Qty {item.quantity} · {formatPrice(item.price)} each</span>
                </div>
                <strong className="checkout-summary-line-total">{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="checkout-summary-totals">
            <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="checkout-summary-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          </div>
          <p className="checkout-summary-footnote">No delivery fee, taxes or discounts are applied at this stage.</p>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutPage

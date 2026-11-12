import { useState } from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import useCart from '../context/useCart'

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

function CartItem({ item, onDecrease, onIncrease, onRemove }) {
  const [imageFailed, setImageFailed] = useState(!item.image)

  return (
    <article className="cart-item">
      <div className="cart-item-image">
        {imageFailed ? (
          <span aria-label={`${item.name} image placeholder`} className="cart-item-placeholder" role="img">
            {item.emoji || '🍽️'}
          </span>
        ) : (
          <img
            alt={item.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={item.image}
          />
        )}
      </div>

      <div className="cart-item-details">
        <div className="cart-item-title">
          <h3>{item.name}</h3>
          <button
            aria-label={`Remove ${item.name} from cart`}
            className="remove-cart-item"
            onClick={() => onRemove(item.id)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
        <p className="cart-item-price">{formatPrice(item.price)} each</p>
        <div className="cart-item-bottom">
          <div aria-label={`${item.quantity} ${item.name}`} className="quantity-control">
            <button
              aria-label={`Decrease ${item.name} quantity`}
              onClick={() => onDecrease(item.id)}
              type="button"
            >
              <Minus aria-hidden="true" size={12} />
            </button>
            <span>{item.quantity}</span>
            <button
              aria-label={`Increase ${item.name} quantity`}
              onClick={() => onIncrease(item.id)}
              type="button"
            >
              <Plus aria-hidden="true" size={12} />
            </button>
          </div>
          <strong className="cart-line-total">{formatPrice(item.price * item.quantity)}</strong>
        </div>
      </div>
    </article>
  )
}

function CartPanel() {
  const {
    clearCart,
    decreaseQuantity,
    increaseQuantity,
    itemCount,
    items,
    removeFromCart,
    subtotal,
    total,
  } = useCart()

  return (
    <aside aria-label="Shopping cart" className="cart-panel">
      <div className="cart-heading">
        <div>
          <p className="panel-kicker">YOUR SELECTION</p>
          <h2>Your Cart</h2>
        </div>
        <span aria-label={`${itemCount} items in cart`} className="cart-count">{itemCount}</span>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="empty-cart-art" aria-hidden="true">
            <span className="empty-cart-circle" />
            <ShoppingBag className="empty-cart-icon" size={38} strokeWidth={1.35} />
            <span className="empty-cart-spark spark-one">✦</span>
            <span className="empty-cart-spark spark-two">✧</span>
          </div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven’t found your favorite meal yet.</p>
          <Link className="browse-link" to="/menu">
            Explore the menu <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      ) : (
        <div className="cart-items">
          <div className="cart-items-heading">
            <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            <button className="clear-cart-button" onClick={clearCart} type="button">Clear all</button>
          </div>
          {items.map((item) => (
            <CartItem
              item={item}
              key={item.id}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              onRemove={removeFromCart}
            />
          ))}
        </div>
      )}

      <div className="cart-summary">
        <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
        {items.length > 0 ? (
          <Link className="checkout-button is-enabled" to="/checkout">
            Go to Checkout <ArrowRight aria-hidden="true" size={17} />
          </Link>
        ) : (
          <button className="checkout-button" disabled type="button">
            Go to Checkout <ArrowRight aria-hidden="true" size={17} />
          </button>
        )}
        <p className="cart-footnote">Payment options available at checkout</p>
      </div>
    </aside>
  )
}

export default CartPanel

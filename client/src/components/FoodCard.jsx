import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import useCart from '../context/useCart'

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

function FoodCard({ food }) {
  const [imageFailed, setImageFailed] = useState(!food.image)
  const {
    addToCart,
    decreaseQuantity,
    increaseQuantity,
    items,
    removeFromCart,
  } = useCart()
  const cartItem = items.find((item) => item.id === food.id)

  return (
    <article className="food-card">
      <div className="food-image-wrap">
        <div
          aria-label={imageFailed ? `${food.name} image placeholder` : undefined}
          className={`food-image-placeholder placeholder-${food.category.toLowerCase()}`}
          role={imageFailed ? 'img' : undefined}
        >
          <span aria-hidden="true">{food.emoji || '🍽️'}</span>
        </div>
        {!imageFailed && (
          <img
            alt={`${food.name}: ${food.description}`}
            className="food-image"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={food.image}
          />
        )}
        <span className="food-tag">{food.category}</span>
      </div>

      <div className="food-card-content">
        <div className="food-title-row">
          <h3>{food.name}</h3>
        </div>
        <p className="food-description">{food.description}</p>
        <div className="food-card-bottom">
          <strong className="food-price">{formatPrice(food.price)}</strong>
          {cartItem ? (
            <div className="food-cart-controls">
              <div aria-label={`${cartItem.quantity} ${food.name} in cart`} className="quantity-control food-quantity-control">
                <button
                  aria-label={`Decrease ${food.name} quantity`}
                  disabled={cartItem.quantity <= 1 || cartItem.isLegacy || cartItem.isUnavailable}
                  onClick={() => decreaseQuantity(cartItem.id)}
                  type="button"
                >
                  <Minus aria-hidden="true" size={16} />
                </button>
                <span>{cartItem.quantity}</span>
                <button
                  aria-label={`Increase ${food.name} quantity`}
                  disabled={cartItem.quantity >= 10 || cartItem.isLegacy || cartItem.isUnavailable}
                  onClick={() => increaseQuantity(cartItem.id)}
                  title={cartItem.quantity >= 10 ? 'Maximum 10 per item' : undefined}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                </button>
              </div>
              <button
                aria-label={`Remove ${food.name} from cart`}
                className="food-remove-button"
                onClick={() => removeFromCart(cartItem.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
                <span className="food-remove-label">Remove</span>
              </button>
            </div>
          ) : (
            <button
              aria-label={`Add ${food.name} to cart`}
              className="add-button"
              onClick={() => addToCart(food)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
        {cartItem?.isLegacy && <small className="food-cart-notice">Saved demo item · remove to checkout</small>}
        {cartItem?.isUnavailable && <small className="food-cart-notice">Unavailable · remove to checkout</small>}
        {cartItem && !cartItem.isLegacy && !cartItem.isUnavailable && cartItem.quantity >= 10 && (
          <small className="quantity-limit-message">Maximum 10 per item</small>
        )}
      </div>
    </article>
  )
}

export default FoodCard

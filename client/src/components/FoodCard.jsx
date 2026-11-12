import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import useCart from '../context/useCart'

const formatPrice = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

function FoodCard({ food }) {
  const [imageFailed, setImageFailed] = useState(!food.image)
  const { addToCart, items } = useCart()
  const cartItem = items.find((item) => item.id === food.id)
  const quantity = cartItem?.quantity || 0

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
          <button
            aria-label={`Add ${food.name} to cart${quantity ? `, currently ${quantity} in cart` : ''}`}
            className={`add-button${quantity ? ' is-added' : ''}`}
            onClick={() => addToCart(food)}
            type="button"
          >
            {quantity ? <Check aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            <span>{quantity ? `Added · ${quantity}` : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default FoodCard

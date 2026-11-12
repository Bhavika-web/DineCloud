import { useState } from 'react'
import { Clock3, Plus, Star } from 'lucide-react'

function FoodCard({ food }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="food-card">
      <div className="food-image-wrap">
        <div
          aria-label={imageFailed ? `${food.name} image placeholder` : undefined}
          className={`food-image-placeholder placeholder-${food.category.toLowerCase()}`}
          role={imageFailed ? 'img' : undefined}
        >
          <span aria-hidden="true">{food.emoji}</span>
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
        {food.tag && <span className="food-tag">{food.tag}</span>}
        <span className="food-time"><Clock3 aria-hidden="true" size={13} /> {food.time}</span>
      </div>

      <div className="food-card-content">
        <div className="food-title-row">
          <h3>{food.name}</h3>
          <span className="food-rating"><Star aria-hidden="true" size={13} fill="currentColor" /> {food.rating}</span>
        </div>
        <p className="food-description">{food.description}</p>
        <div className="food-card-bottom">
          <strong className="food-price">₹{food.price}</strong>
          <button aria-label={`Add ${food.name} to cart`} className="add-button" type="button">
            <Plus aria-hidden="true" size={16} />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default FoodCard

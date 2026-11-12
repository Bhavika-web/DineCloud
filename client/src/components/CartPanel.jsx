import { ArrowRight, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

function CartPanel() {
  return (
    <aside aria-label="Shopping cart" className="cart-panel">
      <div className="cart-heading">
        <div>
          <p className="panel-kicker">YOUR SELECTION</p>
          <h2>Your Cart</h2>
        </div>
        <span className="cart-count">0</span>
      </div>

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

      <div className="cart-summary">
        <div><span>Subtotal</span><strong>₹0</strong></div>
        <div><span>Delivery</span><strong>—</strong></div>
        <div className="cart-total"><span>Total</span><strong>₹0</strong></div>
        <button className="checkout-button" disabled type="button">Go to Checkout <ArrowRight aria-hidden="true" size={17} /></button>
        <p className="cart-footnote">Payment options available at checkout</p>
      </div>
    </aside>
  )
}

export default CartPanel

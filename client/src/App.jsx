import { NavLink, Route, Routes } from 'react-router-dom'
import {
  CheckoutPage,
  HomePage,
  MenuPage,
  OrderConfirmationPage,
  OrderTrackingPage,
} from './pages'
import './App.css'

const navigationItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/checkout', label: 'Checkout' },
  { to: '/track-order', label: 'Track order' },
]

function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="DineCloud home">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DineCloud</span>
        </NavLink>

        <nav className="site-nav" aria-label="Main navigation">
          {navigationItems.map(({ to, label, end }) => (
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              end={end}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-main">
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<MenuPage />} path="/menu" />
          <Route element={<CheckoutPage />} path="/checkout" />
          <Route element={<OrderConfirmationPage />} path="/order-confirmation" />
          <Route element={<OrderTrackingPage />} path="/track-order" />
          <Route element={<HomePage />} path="*" />
        </Routes>
      </main>

      <footer className="site-footer">
        <span className="footer-brand">DineCloud</span>
        <span>Good food, thoughtfully delivered.</span>
      </footer>
    </div>
  )
}

export default SiteLayout

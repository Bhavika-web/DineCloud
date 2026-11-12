import { ClipboardList, House, MapPinned, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/order-confirmation', label: 'My Orders', icon: ClipboardList },
  { to: '/track-order', label: 'Track Order', icon: MapPinned },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink className="sidebar-brand" to="/" aria-label="DineCloud home">
        <span className="sidebar-brand-mark" aria-hidden="true">D</span>
        <span>DineCloud</span>
      </NavLink>

      <p className="sidebar-label">YOUR SPACE</p>
      <nav className="sidebar-nav" aria-label="Customer navigation">
        {navigationItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            end={end}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-note">
        <span className="sidebar-note-icon" aria-hidden="true">✦</span>
        <p>Made fresh, just for you.</p>
        <span>Good food starts here.</span>
      </div>

      <div className="sidebar-footer">© 2026 DineCloud</div>
    </aside>
  )
}

export default Sidebar

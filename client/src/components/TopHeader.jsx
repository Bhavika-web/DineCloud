import { Bell, Search, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageHeadings = {
  '/': { title: 'Good afternoon, Aarushi!', subtitle: 'What would you like to eat today?' },
  '/menu': { title: 'Explore the menu', subtitle: 'Find something delicious for your day.' },
  '/checkout': { title: 'Checkout', subtitle: 'Review your order details.' },
  '/order-confirmation': { title: 'My Orders', subtitle: 'Your recent order details.' },
  '/track-order': { title: 'Track your order', subtitle: 'See how your order is coming along.' },
}

function TopHeader({ onSearch, search }) {
  const { pathname } = useLocation()
  const heading = pageHeadings[pathname] || pageHeadings['/']
  const showSearch = pathname === '/' || pathname === '/menu'

  return (
    <header className="top-header">
      <div className="welcome-copy">
        <p className="welcome-kicker">WELCOME BACK</p>
        <h1>{heading.title}</h1>
        <p className="welcome-subtitle">{heading.subtitle}</p>
      </div>

      <div className="header-actions">
        {showSearch && (
          <label className="search-field">
            <Search aria-hidden="true" size={18} />
            <span className="visually-hidden">Search food</span>
            <input
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search your cravings..."
              type="search"
              value={search}
            />
            <kbd>⌘ K</kbd>
          </label>
        )}
        <button aria-label="Notifications" className="icon-button notification-button" type="button">
          <Bell aria-hidden="true" size={19} />
          <span className="notification-dot" />
        </button>
        <button aria-label="Customer profile" className="profile-button" type="button">
          <span className="profile-avatar"><UserRound aria-hidden="true" size={18} /></span>
          <span className="profile-copy">
            <strong>Aarushi</strong>
            <small>Food lover</small>
          </span>
        </button>
      </div>
    </header>
  )
}

export default TopHeader

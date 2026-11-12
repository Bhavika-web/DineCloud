import { Flame, Sparkles } from 'lucide-react'
import MenuCatalog from '../components/MenuCatalog'

function HomePage({ error, isLoading, menuItems, onRetry, search }) {
  return (
    <div className="home-content">
      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="banner-label"><Sparkles aria-hidden="true" size={14} /> YOUR TABLE, YOUR WAY</span>
          <h2>A little joy,<br />served fresh.</h2>
          <p>Thoughtful plates and familiar favorites, made for your kind of day.</p>
        </div>
        <div aria-hidden="true" className="banner-art">
          <span className="banner-art-sun" />
          <span className="banner-art-plate"><span>🍽️</span></span>
          <span className="banner-art-herb">✦</span>
        </div>
        <div className="banner-bottom">
          <span><Flame aria-hidden="true" size={15} /> Fresh from our kitchen</span>
          <span>Made with care, always</span>
        </div>
      </section>

      <MenuCatalog
        error={error}
        isLoading={isLoading}
        menuItems={menuItems}
        onRetry={onRetry}
        search={search}
        showViewMenu
      />
    </div>
  )
}

export default HomePage

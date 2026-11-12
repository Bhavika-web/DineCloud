import { useMemo, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import CategoryTabs from './CategoryTabs'
import FoodCard from './FoodCard'

function MenuCatalog({ error, isLoading, menuItems, onRetry, search, showViewMenu = false }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase()
    return menuItems.filter((food) => {
      const matchesCategory = activeCategory === 'All' || food.category === activeCategory
      const matchesSearch = !query || `${food.name} ${food.description} ${food.category}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, menuItems, search])

  return (
    <>
      <section aria-labelledby="category-title" className="category-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">A LITTLE SOMETHING FOR EVERY MOOD</p>
            <h2 id="category-title">Browse by category</h2>
          </div>
        </div>
        <CategoryTabs activeCategory={activeCategory} onSelect={setActiveCategory} />
      </section>

      <section aria-labelledby="menu-title" className="menu-section">
        <div className="section-heading menu-heading">
          <div>
            <p className="section-kicker">HANDPICKED FOR YOU</p>
            <h2 id="menu-title">{activeCategory === 'All' ? 'Popular right now' : activeCategory}</h2>
          </div>
          {!isLoading && !error && menuItems.length > 0 && (
            <span className="dish-count">{visibleFoods.length} {visibleFoods.length === 1 ? 'dish' : 'dishes'}</span>
          )}
        </div>

        {isLoading ? (
          <div aria-live="polite" className="menu-status" role="status">
            <LoaderCircle aria-hidden="true" className="menu-loading-icon" size={24} />
            <span>Bringing the menu to your table…</span>
          </div>
        ) : error ? (
          <div className="menu-status menu-error" role="alert">
            <h3>We couldn’t load the menu</h3>
            <p>{error}</p>
            <button className="menu-retry-button" onClick={onRetry} type="button">Try again</button>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="no-results">
            <span aria-hidden="true">🍽️</span>
            <h3>The menu is being prepared</h3>
            <p>Please check back soon for dishes from our kitchen.</p>
          </div>
        ) : visibleFoods.length > 0 ? (
          <div className="food-grid">
            {visibleFoods.map((food) => <FoodCard food={food} key={food.id} />)}
          </div>
        ) : (
          <div className="no-results">
            <span aria-hidden="true">🍽️</span>
            <h3>No dishes found</h3>
            <p>Try another search or choose a different category.</p>
          </div>
        )}

        {showViewMenu && !isLoading && !error && menuItems.length > 0 && (
          <Link className="view-menu-button" to="/menu">
            View full menu <ArrowRight aria-hidden="true" size={16} />
          </Link>
        )}
      </section>
    </>
  )
}

export default MenuCatalog

import { useMemo, useState } from 'react'
import { ArrowRight, Flame, Sparkles } from 'lucide-react'
import CategoryTabs from '../components/CategoryTabs'
import FoodCard from '../components/FoodCard'
import sampleFoods from '../data/sampleFoods'

function HomePage({ search }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sampleFoods.filter((food) => {
      const matchesCategory = activeCategory === 'All' || food.category === activeCategory
      const matchesSearch = !query || `${food.name} ${food.description} ${food.category}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, search])

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

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">A LITTLE SOMETHING FOR EVERY MOOD</p>
            <h2 id="category-title">Browse by category</h2>
          </div>
        </div>
        <CategoryTabs activeCategory={activeCategory} onSelect={setActiveCategory} />
      </section>

      <section className="menu-section" aria-labelledby="menu-title">
        <div className="section-heading menu-heading">
          <div>
            <p className="section-kicker">HANDPICKED FOR YOU</p>
            <h2 id="menu-title">{activeCategory === 'All' ? 'Popular right now' : activeCategory}</h2>
          </div>
          <span className="dish-count">{visibleFoods.length} dishes</span>
        </div>

        {visibleFoods.length > 0 ? (
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

        <button className="view-menu-button" type="button">
          View full menu <ArrowRight aria-hidden="true" size={16} />
        </button>
      </section>
    </div>
  )
}

export default HomePage

const categories = ['All', 'Burgers', 'Pizza', 'Pasta', 'Indian', 'Desserts', 'Beverages']

function CategoryTabs({ activeCategory, onSelect }) {
  return (
    <div aria-label="Food categories" className="category-list" role="group">
      {categories.map((category) => (
        <button
          aria-pressed={activeCategory === category}
          className={`category-button${activeCategory === category ? ' is-active' : ''}`}
          key={category}
          onClick={() => onSelect(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </div>
  )
}

export default CategoryTabs

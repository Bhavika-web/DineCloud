import MenuCatalog from '../components/MenuCatalog'

function MenuPage({ error, isLoading, menuItems, onRetry, search }) {
  return (
    <div className="menu-page">
      <section aria-labelledby="full-menu-title" className="menu-page-heading">
        <p className="section-kicker">DINECLOUD · CUSTOMER</p>
        <h2 id="full-menu-title">Our Menu</h2>
        <p>Explore the dishes prepared fresh for you.</p>
      </section>
      <MenuCatalog
        error={error}
        isLoading={isLoading}
        menuItems={menuItems}
        onRetry={onRetry}
        search={search}
      />
    </div>
  )
}

export default MenuPage

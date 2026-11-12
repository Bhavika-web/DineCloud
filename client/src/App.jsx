import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import getMenuItems from './api/menu'
import CartPanel from './components/CartPanel'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import { CheckoutPage, HomePage, MenuPage, OrderConfirmationPage, OrderTrackingPage } from './pages'
import './App.css'

function SiteLayout() {
  const [search, setSearch] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [menuRequestId, setMenuRequestId] = useState(0)

  useEffect(() => {
    let active = true

    const fetchMenu = async () => {
      try {
        const availableItems = await getMenuItems()
        if (active) setMenuItems(availableItems)
      } catch (error) {
        const message = error.isAxiosError
          ? error.response?.data?.message || 'Could not reach the menu service. Please check your connection and try again.'
          : error.message
        if (active) setMenuError(message || 'The menu could not be loaded. Please try again.')
      } finally {
        if (active) setIsLoadingMenu(false)
      }
    }

    fetchMenu()
    return () => {
      active = false
    }
  }, [menuRequestId])

  const retryMenuLoad = () => {
    setMenuError('')
    setIsLoadingMenu(true)
    setMenuRequestId((requestId) => requestId + 1)
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-workspace">
        <TopHeader onSearch={setSearch} search={search} />
        <main className="main-content">
          <Routes>
            <Route element={<div className="dashboard-grid"><HomePage error={menuError} isLoading={isLoadingMenu} menuItems={menuItems} onRetry={retryMenuLoad} search={search} /><CartPanel /></div>} path="/" />
            <Route element={<MenuPage error={menuError} isLoading={isLoadingMenu} menuItems={menuItems} onRetry={retryMenuLoad} search={search} />} path="/menu" />
            <Route element={<CheckoutPage />} path="/checkout" />
            <Route element={<OrderConfirmationPage />} path="/order-confirmation" />
            <Route element={<OrderTrackingPage />} path="/track-order" />
            <Route element={<div className="dashboard-grid"><HomePage error={menuError} isLoading={isLoadingMenu} menuItems={menuItems} onRetry={retryMenuLoad} search={search} /><CartPanel /></div>} path="*" />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default SiteLayout

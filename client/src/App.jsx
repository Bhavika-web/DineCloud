
import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import getMenuItems from './api/menu'
import CartPanel from './components/CartPanel'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import Inventory from './pages/admin/Inventory'

import {
  CheckoutPage,
  HomePage,
  MenuPage,
  OrderConfirmationPage,
  OrderTrackingPage
} from './pages'

import './App.css'

import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import OrderManagement from './pages/admin/OrderManagement'
import AdminLayout from './pages/admin/AdminLayout'


// Protect admin routes
function ProtectedAdminRoute({ children }) {
  const token = sessionStorage.getItem('adminToken')

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}


// Existing customer layout
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
          ? error.response?.data?.message ||
            'Could not reach the menu service. Please check your connection and try again.'
          : error.message

        if (active) {
          setMenuError(message || 'The menu could not be loaded. Please try again.')
        }
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
            <Route
              path="/"
              element={
                <div className="dashboard-grid">
                  <HomePage
                    error={menuError}
                    isLoading={isLoadingMenu}
                    menuItems={menuItems}
                    onRetry={retryMenuLoad}
                    search={search}
                  />
                  <CartPanel />
                </div>
              }
            />

            <Route
              path="/menu"
              element={
                <MenuPage
                  error={menuError}
                  isLoading={isLoadingMenu}
                  menuItems={menuItems}
                  onRetry={retryMenuLoad}
                  search={search}
                />
              }
            />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/track-order" element={<OrderTrackingPage />} />
            

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}


function App() {
  return (
    <Routes>

      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected Admin Application */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="inventory" element={<Inventory />} />
      </Route>

      {/* Customer Application */}
      <Route path="/*" element={<SiteLayout />} />

    </Routes>
  )
}

export default App

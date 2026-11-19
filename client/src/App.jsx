
import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import getMenuItems from './api/menu'
import {
  getMessagingServiceWorkerRegistration,
  subscribeToForegroundMessages,
} from './firebase/notificationService'
import CartPanel from './components/CartPanel'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import Inventory from './pages/admin/Inventory'
import Analytics from './pages/admin/Analytics'

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
  const [foregroundNotification, setForegroundNotification] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe

    const showForegroundNotification = async (payload) => {
      const data = payload.data || {}
      const title =
        payload.notification?.title || data.title || 'DineCloud order update'
      const body =
        payload.notification?.body ||
        data.body ||
        'Your order has a new status update.'

      if (active) setForegroundNotification(body)
      console.info('[FCM CLIENT] In-app notification displayed.', {
        orderId: data.orderId,
        status: data.status,
        title,
        body,
      })

      if (
        !('Notification' in window) ||
        !('serviceWorker' in navigator)
      ) {
        console.warn(
          '[FCM CLIENT] Browser notification skipped; Notification or Service Worker API is unavailable.',
        )
        return
      }

      try {
        const registration = await getMessagingServiceWorkerRegistration()
        const permission = Notification.permission
        console.info('[FCM CLIENT] Foreground display state.', {
          permission,
          visibilityState: document.visibilityState,
          workerScope: registration.scope,
          activeWorkerState: registration.active?.state || 'none',
        })

        if (document.visibilityState !== 'visible') {
          console.info(
            '[FCM CLIENT] Browser notification skipped for a hidden tab; a visible same-origin tab handles display.',
          )
          return
        }

        if (permission !== 'granted') {
          console.warn(
            '[FCM CLIENT] Browser notification skipped; permission is not granted.',
          )
          return
        }

        if (!registration.active) {
          throw new Error('No active Firebase messaging service worker is available.')
        }

        console.info('[FCM CLIENT] showNotification() attempted.', {
          orderId: data.orderId,
          status: data.status,
        })
        await registration.showNotification(title, {
          body,
          icon: '/favicon.svg',
          data,
          tag:
            data.eventId ||
            payload.messageId ||
            `${data.orderId || 'order'}:${data.status || 'update'}`,
        })
        console.info('[FCM CLIENT] Foreground browser notification displayed.', {
          orderId: data.orderId,
          status: data.status,
        })
      } catch (error) {
        console.error('[FCM CLIENT] Foreground notification display failed.', {
          name: error.name,
          code: error.code,
          message: error.message,
        })
      }
    }

    subscribeToForegroundMessages((payload) => {
      void showForegroundNotification(payload)
    })
      .then((stopListening) => {
        if (active) unsubscribe = stopListening
        else stopListening()
      })
      .catch((error) => {
        console.error('[FCM CLIENT] Foreground listener registration failed.', {
          name: error.name,
          code: error.code,
          message: error.message,
        })
      })

    console.info('[FCM CLIENT] Root foreground listener mounted.')

    return () => {
      active = false
      unsubscribe?.()
      console.info('[FCM CLIENT] Root foreground listener unmounted.')
    }
  }, [])

  return (
    <>
      {foregroundNotification && (
        <div aria-live="polite" className="foreground-notification" role="status">
          <span>{foregroundNotification}</span>
          <button
            aria-label="Dismiss order notification"
            onClick={() => setForegroundNotification('')}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}
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
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Customer Application */}
      <Route path="/*" element={<SiteLayout />} />

      </Routes>
    </>
  )
}

export default App

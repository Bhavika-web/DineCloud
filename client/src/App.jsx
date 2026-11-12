import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import CartPanel from './components/CartPanel'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import { CheckoutPage, HomePage, MenuPage, OrderConfirmationPage, OrderTrackingPage } from './pages'
import './App.css'

function SiteLayout() {
  const [search, setSearch] = useState('')

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-workspace">
        <TopHeader onSearch={setSearch} search={search} />
        <main className="main-content">
          <Routes>
            <Route element={<div className="dashboard-grid"><HomePage search={search} /><CartPanel /></div>} path="/" />
            <Route element={<MenuPage />} path="/menu" />
            <Route element={<CheckoutPage />} path="/checkout" />
            <Route element={<OrderConfirmationPage />} path="/order-confirmation" />
            <Route element={<OrderTrackingPage />} path="/track-order" />
            <Route element={<div className="dashboard-grid"><HomePage search={search} /><CartPanel /></div>} path="*" />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default SiteLayout

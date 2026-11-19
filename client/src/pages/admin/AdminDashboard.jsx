import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  Package,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from 'lucide-react'

import http from '../../api/http'
import '../../styles/admin.css'
import '../../styles/dashboard.css'

const EMPTY_DASHBOARD = {
  stats: {
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
  },
  recentOrders: [],
}

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

const formatOrderDate = (date) => date
  ? new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Date unavailable'

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inventoryError, setInventoryError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')
      setInventoryError('')

      const token = sessionStorage.getItem('adminToken')
      if (!token) {
        setError('Admin session expired. Please log in again.')
        setLoading(false)
        return
      }

      const config = { headers: { Authorization: `Bearer ${token}` } }
      const [dashboardResult, inventoryResult] = await Promise.allSettled([
        http.get('/admin/dashboard', config),
        http.get('/admin/inventory/low-stock', config),
      ])

      if (!active) return

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value.data)
      } else {
        const requestError = dashboardResult.reason
        console.error('Fetch dashboard error:', requestError)
        setError(
          requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load dashboard data.',
        )
      }

      if (inventoryResult.status === 'fulfilled') {
        setLowStockItems(inventoryResult.value.data.items || [])
      } else {
        const requestError = inventoryResult.reason
        console.error('Fetch low-stock items error:', requestError)
        setInventoryError(
          requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load inventory alerts.',
        )
      }

      setLoading(false)
    }

    loadDashboard()
    return () => { active = false }
  }, [refreshKey])

  const stats = dashboard.stats || EMPTY_DASHBOARD.stats

  return (
    <div className="admin-page dashboard-page">
      <div className="admin-page-heading dashboard-page-heading">
        <div>
          <span className="admin-page-eyebrow">RESTAURANT OPERATIONS</span>
          <h1>Dashboard</h1>
          <p>Today at a glance, plus the orders and stock that need attention.</p>
        </div>
        <button
          className="dashboard-refresh"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="dashboard-error" role="alert">{error}</div>}
      {inventoryError && <div className="dashboard-error" role="alert">{inventoryError}</div>}

      <section className="dashboard-stat-grid" aria-label="Today's summary">
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><ShoppingBag size={20} /></span>
          <div><p>Today's orders</p><strong>{loading ? '—' : stats.todayOrders || 0}</strong></div>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><Wallet size={20} /></span>
          <div>
            <p>Today's revenue</p>
            <strong>{loading ? '—' : formatCurrency(stats.todayRevenue)}</strong>
            <small>Delivered orders</small>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><Clock3 size={20} /></span>
          <div><p>Active orders today</p><strong>{loading ? '—' : stats.activeOrders || 0}</strong></div>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon alert"><AlertTriangle size={20} /></span>
          <div>
            <p>Low-stock alerts</p>
            <strong>{loading ? '—' : lowStockItems.length}</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-section dashboard-recent-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Latest activity from your restaurant.</p>
          </div>
          <Link className="dashboard-section-link" to="/admin/orders">
            Order Management <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="dashboard-empty">Loading recent orders...</div>
        ) : error ? (
          <div className="dashboard-empty">Recent orders are unavailable.</div>
        ) : dashboard.recentOrders?.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr><th>Order</th><th>Items</th><th>Amount</th><th>Status</th><th>Placed</th></tr>
              </thead>
              <tbody>
                {dashboard.recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="dashboard-order-id">#{order._id.slice(-8).toUpperCase()}</td>
                    <td>{order.items?.length || 0} items</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td><span className={`order-status ${(order.status || '').toLowerCase()}`}>{order.status}</span></td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">No orders have been placed yet.</div>
        )}
      </section>

      <div className="dashboard-lower-grid">
        <section className="dashboard-section dashboard-stock-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Low-stock inventory</h2>
              <p>Ingredients at or below their reorder threshold.</p>
            </div>
            <Link className="dashboard-section-link" to="/admin/inventory">
              Manage stock <ArrowRight size={15} />
            </Link>
          </div>
          {loading ? (
            <div className="dashboard-empty">Loading inventory alerts...</div>
          ) : inventoryError ? (
            <div className="dashboard-empty">{inventoryError}</div>
          ) : lowStockItems.length ? (
            <ul className="dashboard-stock-list">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item._id}>
                  <span className="dashboard-stock-icon"><Package size={17} /></span>
                  <span className="dashboard-stock-name">{item.name}<small>{item.category || 'General'}</small></span>
                  <strong>{item.currentStock} {item.unit}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dashboard-empty">No low-stock ingredients to report.</div>
          )}
        </section>

        <section className="dashboard-section dashboard-quick-section">
          <div className="dashboard-section-heading">
            <div><h2>Quick links</h2><p>Jump to a management workspace.</p></div>
          </div>
          <Link className="dashboard-quick-link" to="/admin/orders">
            <span><ShoppingBag size={18} /></span>Order Management<ArrowRight size={16} />
          </Link>
          <Link className="dashboard-quick-link" to="/admin/inventory">
            <span><Package size={18} /></span>Inventory Management<ArrowRight size={16} />
          </Link>
          <Link className="dashboard-quick-link" to="/admin/analytics">
            <span><BarChart3 size={18} /></span>Analytics<ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard

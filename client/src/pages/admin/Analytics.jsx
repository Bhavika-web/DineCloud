import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Clock3,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from 'lucide-react'

import http from '../../api/http'
import '../../styles/admin.css'
import '../../styles/analytics.css'

const getIndiaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const shiftDate = (date, offset) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

const getPresetRange = (days) => {
  const endDate = getIndiaDate()
  return { startDate: shiftDate(endDate, -(days - 1)), endDate }
}

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

const formatCompactCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value) || 0)

const formatDate = (date) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date(`${date}T12:00:00+05:30`))

const formatHour = (hour) => {
  const value = Number(hour)
  return `${String(value % 12 || 12).padStart(2, '0')}:00 ${value < 12 ? 'AM' : 'PM'}`
}

const STATUS_COLORS = ['#8f1d2c', '#d28a3e', '#506b8b', '#a7653f', '#4c7a57', '#9475a5']
const EMPTY_ANALYTICS = {
  summary: {},
  statusBreakdown: [],
  revenueTrend: [],
  popularItems: [],
  peakHours: [],
}

function RevenueChart({ data }) {
  const maxRevenue = Math.max(...data.map((day) => Number(day.revenue) || 0), 0)
  const chartPoints = data.map((day, index) => {
    const x = data.length <= 1 ? 418 : 56 + (index / (data.length - 1)) * 724
    const y = 200 - (maxRevenue ? (Number(day.revenue) / maxRevenue) * 155 : 0)
    return { x, y, day }
  })
  const line = chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')
  const labelIndexes = new Set(
    data.map((_, index) => Math.round(index * (Math.min(data.length, 6) - 1) / Math.max(Math.min(data.length, 6) - 1, 1))),
  )

  if (!data.length) return <div className="analytics-empty">No revenue data for this period.</div>

  return (
    <div className="analytics-revenue-chart">
      {maxRevenue === 0 && <span className="analytics-zero-note">No delivered revenue in this period</span>}
      <svg viewBox="0 0 800 220" preserveAspectRatio="none" role="img" aria-label="Daily delivered revenue chart">
        <line x1="56" y1="200" x2="780" y2="200" className="analytics-chart-axis" />
        <line x1="56" y1="122" x2="780" y2="122" className="analytics-chart-gridline" />
        <line x1="56" y1="45" x2="780" y2="45" className="analytics-chart-gridline" />
        <text x="0" y="204" className="analytics-chart-value">{formatCompactCurrency(0)}</text>
        <text x="0" y="126" className="analytics-chart-value">{formatCompactCurrency(maxRevenue / 2)}</text>
        <text x="0" y="49" className="analytics-chart-value">{formatCompactCurrency(maxRevenue)}</text>
        {chartPoints.length > 1 && <polyline points={`56,200 ${line} 780,200`} className="analytics-chart-area" />}
        {chartPoints.length > 1 && <polyline points={line} className="analytics-chart-line" />}
        {chartPoints.map(({ x, y, day }) => (
          <circle key={day.date} cx={x} cy={y} r="3.5" className="analytics-chart-point">
            <title>{`${formatDate(day.date)}: ${formatCurrency(day.revenue)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="analytics-chart-labels">
        {chartPoints.map(({ day }, index) => (
          <span key={day.date} className={labelIndexes.has(index) ? '' : 'analytics-chart-label-hidden'}>
            {formatDate(day.date)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Analytics() {
  const initialRange = getPresetRange(30)
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [preset, setPreset] = useState('30')
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const fetchAnalytics = async () => {
      setLoading(true)
      setError('')
      const token = sessionStorage.getItem('adminToken')

      if (!token) {
        setError('Admin session expired. Please log in again.')
        setLoading(false)
        return
      }

      try {
        const response = await http.get('/admin/analytics', {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) setAnalytics(response.data)
      } catch (requestError) {
        console.error('Fetch analytics error:', requestError)
        if (active) {
          setAnalytics(EMPTY_ANALYTICS)
          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            'Unable to load analytics.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => { active = false }
  }, [startDate, endDate, refreshKey])

  const statusTotal = useMemo(
    () => analytics.statusBreakdown.reduce((total, item) => total + Number(item.count || 0), 0),
    [analytics.statusBreakdown],
  )
  const statusGradient = useMemo(() => {
    if (!statusTotal) return '#eee7df 0% 100%'
    let cursor = 0
    return analytics.statusBreakdown.map((item, index) => {
      const start = cursor
      cursor += (Number(item.count || 0) / statusTotal) * 100
      return `${STATUS_COLORS[index % STATUS_COLORS.length]} ${start}% ${cursor}%`
    }).join(', ')
  }, [analytics.statusBreakdown, statusTotal])

  const peakHours = [...analytics.peakHours]
    .sort((a, b) => Number(b.orders) - Number(a.orders))
    .slice(0, 6)
  const peakMax = Math.max(...peakHours.map((item) => Number(item.orders) || 0), 1)
  const bestPerformers = [...analytics.popularItems]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 5)
  const summary = analytics.summary || {}

  const applyPreset = (days) => {
    const range = getPresetRange(days)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
    setPreset(String(days))
  }

  const updateDate = (field, value) => {
    if (!value) return
    if (field === 'startDate') setStartDate(value)
    else setEndDate(value)
    setPreset('custom')
  }

  const hasOrders = Number(summary.totalOrders || 0) > 0

  return (
    <div className="admin-page analytics-page">
      <div className="admin-page-heading analytics-page-heading">
        <div>
          <span className="admin-page-eyebrow">PERFORMANCE REPORTING</span>
          <h1>Analytics</h1>
          <p>Understand sales, order patterns and menu performance.</p>
        </div>
        <button
          className="analytics-refresh"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={16} />{loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <section className="analytics-filter-panel" aria-label="Date range filter">
        <div className="analytics-preset-buttons">
          {[['1', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days']].map(([days, label]) => (
            <button
              key={days}
              className={preset === days ? 'selected' : ''}
              onClick={() => applyPreset(Number(days))}
              type="button"
            >
              {label}
            </button>
          ))}
          <button
            className={preset === 'custom' ? 'selected' : ''}
            onClick={() => setPreset('custom')}
            type="button"
          >
            <CalendarDays size={15} />Custom range
          </button>
        </div>
        {(preset === 'custom') && (
          <div className="analytics-custom-dates">
            <label>From<input type="date" value={startDate} max={endDate} onChange={(event) => updateDate('startDate', event.target.value)} /></label>
            <label>To<input type="date" value={endDate} min={startDate} max={getIndiaDate()} onChange={(event) => updateDate('endDate', event.target.value)} /></label>
          </div>
        )}
      </section>

      {error && <div className="analytics-error" role="alert">{error}</div>}

      <section className="analytics-kpi-grid" aria-label="Sales summary">
        <article className="analytics-kpi-card">
          <span><Wallet size={19} /></span><div><p>Total revenue</p><strong>{loading ? '—' : formatCurrency(summary.deliveredRevenue)}</strong><small>Delivered orders</small></div>
        </article>
        <article className="analytics-kpi-card">
          <span><ShoppingBag size={19} /></span><div><p>Total orders</p><strong>{loading ? '—' : Number(summary.totalOrders || 0).toLocaleString('en-IN')}</strong><small>All statuses in range</small></div>
        </article>
        <article className="analytics-kpi-card">
          <span><BarChart3 size={19} /></span><div><p>Average order value</p><strong>{loading ? '—' : formatCurrency(summary.averageOrderValue)}</strong><small>Delivered orders</small></div>
        </article>
        <article className="analytics-kpi-card">
          <span><PackageCheck size={19} /></span><div><p>Completed orders</p><strong>{loading ? '—' : Number(summary.deliveredOrders || 0).toLocaleString('en-IN')}</strong><small>Delivered</small></div>
        </article>
      </section>

      {!loading && !error && !hasOrders && (
        <div className="analytics-empty-state">No orders were found for this date range. Try another range to see performance data.</div>
      )}

      <div className="analytics-main-grid">
        <section className="analytics-panel analytics-revenue-panel">
          <div className="analytics-panel-heading">
            <div><h2>Revenue overview</h2><p>Daily revenue from delivered orders</p></div>
            <strong>{formatCurrency(summary.deliveredRevenue)}</strong>
          </div>
          {loading ? <div className="analytics-empty">Loading revenue...</div> : <RevenueChart data={analytics.revenueTrend} />}
        </section>

        <section className="analytics-panel analytics-status-panel">
          <div className="analytics-panel-heading"><div><h2>Order status</h2><p>Orders by current status</p></div></div>
          {loading ? <div className="analytics-empty">Loading statuses...</div> : (
            <>
              <div
                className="analytics-donut"
                style={{ background: `conic-gradient(${statusGradient})` }}
                role="img"
                aria-label={`Order status breakdown for ${statusTotal} orders`}
              >
                <div><strong>{statusTotal.toLocaleString('en-IN')}</strong><span>orders</span></div>
              </div>
              {analytics.statusBreakdown.length ? (
                <ul className="analytics-status-legend">
                  {analytics.statusBreakdown.map((item, index) => (
                    <li key={item.status}>
                      <span style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      <span>{item.status}</span><strong>{item.count}</strong>
                      <small>{statusTotal ? `${Math.round((item.count / statusTotal) * 100)}%` : '0%'}</small>
                    </li>
                  ))}
                </ul>
              ) : <div className="analytics-empty">No order statuses to display.</div>}
            </>
          )}
        </section>
      </div>

      <div className="analytics-detail-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-heading"><div><h2>Top-selling items</h2><p>Ranked by quantity sold</p></div></div>
          {loading ? <div className="analytics-empty">Loading items...</div> : analytics.popularItems.length ? (
            <div className="analytics-ranking-list">
              {analytics.popularItems.map((item, index) => (
                <div className="analytics-ranking-row" key={item.menuItemId || item.itemName}>
                  <span className="analytics-rank">{index + 1}</span>
                  <strong>{item.itemName || 'Menu item'}</strong>
                  <span>{Number(item.quantitySold || 0).toLocaleString('en-IN')} sold</span>
                  <b>{formatCurrency(item.revenue)}</b>
                </div>
              ))}
            </div>
          ) : <div className="analytics-empty">No delivered item sales in this period.</div>}
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading"><div><h2>Peak ordering hours</h2><p>Order creation time, Indian Standard Time</p></div><Clock3 size={18} /></div>
          {loading ? <div className="analytics-empty">Loading order times...</div> : peakHours.length ? (
            <div className="analytics-hours-list">
              {peakHours.map((item) => (
                <div className="analytics-hour-row" key={item.hour}>
                  <span>{formatHour(item.hour)}</span>
                  <div><i style={{ width: `${(Number(item.orders) / peakMax) * 100}%` }} /></div>
                  <strong>{item.orders}</strong>
                </div>
              ))}
            </div>
          ) : <div className="analytics-empty">No order times in this period.</div>}
        </section>

        <section className="analytics-panel analytics-best-panel">
          <div className="analytics-panel-heading"><div><h2>Best-performing menu items</h2><p>Ranked by delivered sales revenue</p></div></div>
          {loading ? <div className="analytics-empty">Loading rankings...</div> : bestPerformers.length ? (
            <div className="analytics-ranking-list">
              {bestPerformers.map((item, index) => (
                <div className="analytics-ranking-row" key={item.menuItemId || item.itemName}>
                  <span className="analytics-rank">{index + 1}</span>
                  <strong>{item.itemName || 'Menu item'}</strong>
                  <span>{Number(item.quantitySold || 0).toLocaleString('en-IN')} sold</span>
                  <b>{formatCurrency(item.revenue)}</b>
                </div>
              ))}
            </div>
          ) : <div className="analytics-empty">No delivered menu sales in this period.</div>}
        </section>
      </div>

      <p className="analytics-period-note">Showing {formatDate(startDate)} – {formatDate(endDate)}. Revenue and item sales include delivered orders only; cancelled orders are excluded.</p>
    </div>
  )
}

export default Analytics

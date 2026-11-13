
import { useEffect, useState } from 'react'
import {
  Search,
  Eye,
  RefreshCw,
  X,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingBag,
} from 'lucide-react'

import http from '../../api/http'
import '../../styles/admin.css'

const STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered',
  'Cancelled',
]

const STATUS_CLASS = {
  Placed: 'placed',
  Confirmed: 'confirmed',
  Preparing: 'preparing',
  Ready: 'ready',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
}

function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')

      const token = sessionStorage.getItem('adminToken')

      if (!token) {
        throw new Error('Admin session expired. Please log in again.')
      }

      const response = await http.get('/admin/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setOrders(response.data.orders || [])
    } catch (err) {
      console.error('Fetch orders error:', err)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load orders.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const openOrder = (order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setMessage('')
  }

  const closeOrder = () => {
    if (updating) return

    setSelectedOrder(null)
    setMessage('')
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrder || updating) return

    if (['Delivered', 'Cancelled'].includes(selectedOrder.status)) {
      setMessage('This order has already been closed.')
      return
    }

    if (newStatus === selectedOrder.status) {
      setMessage('Please select a different status.')
      return
    }

    if (
      newStatus === 'Delivered' &&
      !window.confirm('Are you sure you want to mark this order as delivered?')
    ) {
      return
    }

    if (
      newStatus === 'Cancelled' &&
      !window.confirm('Are you sure you want to cancel this order?')
    ) {
      return
    }

    try {
      setUpdating(true)
      setMessage('')

      const token = sessionStorage.getItem('adminToken')

      const response = await http.patch(
        `/admin/orders/${selectedOrder._id}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const updatedOrder = response.data.order

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === updatedOrder._id
            ? updatedOrder
            : order
        )
      )

      setSelectedOrder(updatedOrder)
      setNewStatus(updatedOrder.status)
      setMessage(response.data.message || 'Order updated successfully.')
    } catch (err) {
      console.error('Update order error:', err)

      setMessage(
        err.response?.data?.message ||
        'Unable to update order status.'
      )
    } finally {
      setUpdating(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const query = search.toLowerCase()

    const matchesSearch =
      order._id?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.customer?.phone?.includes(query)

    const matchesStatus =
      filter === 'All' || order.status === filter

    return matchesSearch && matchesStatus
  })

  const formatDate = (date) => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const isClosed = selectedOrder &&
    ['Delivered', 'Cancelled'].includes(selectedOrder.status)

  return (
    <div className="admin-page order-management-page">

      {/* PAGE HEADING */}
      <div className="admin-page-heading order-page-heading">
        <div>
          <span className="admin-page-eyebrow">
            RESTAURANT OPERATIONS
          </span>

          <h1>Order Management</h1>

          <p>
            View customer orders and manage their progress.
          </p>
        </div>

        <button
          className="order-refresh-btn"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>

      {/* ORDER SUMMARY */}
      <div className="order-summary-grid">

        <div className="order-summary-card">
          <Package size={21} />
          <div>
            <span>Total Orders</span>
            <h3>{orders.length}</h3>
          </div>
        </div>

        <div className="order-summary-card">
          <Clock size={21} />
          <div>
            <span>Active Orders</span>
            <h3>
              {orders.filter(
                (o) => !['Delivered', 'Cancelled'].includes(o.status)
              ).length}
            </h3>
          </div>
        </div>

        <div className="order-summary-card">
          <CheckCircle size={21} />
          <div>
            <span>Delivered</span>
            <h3>
              {orders.filter((o) => o.status === 'Delivered').length}
            </h3>
          </div>
        </div>

        <div className="order-summary-card">
          <XCircle size={21} />
          <div>
            <span>Cancelled</span>
            <h3>
              {orders.filter((o) => o.status === 'Cancelled').length}
            </h3>
          </div>
        </div>

      </div>

      {/* SEARCH AND FILTER */}
      <div className="order-toolbar">

        <div className="order-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by order ID, customer or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="order-filter"
        >
          <option value="All">All Orders</option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

      </div>

      {/* ERROR */}
      {error && (
        <div className="order-error">
          {error}
        </div>
      )}

      {/* ORDERS TABLE */}
      <div className="order-table-container">

        {loading ? (
          <div className="order-empty">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="order-empty">
            <ShoppingBag size={35} />
            <h3>No orders found</h3>
            <p>Try changing your search or status filter.</p>
          </div>
        ) : (

          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Order Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>

                  <td className="order-id-cell">
                    #{order._id.slice(-8).toUpperCase()}
                  </td>

                  <td>
                    <strong>{order.customer?.name}</strong>
                    <small>{order.customer?.phone}</small>
                  </td>

                  <td>
                    {order.items?.length || 0} items
                  </td>

                  <td className="order-amount">
                    ₹{Number(order.totalAmount).toFixed(2)}
                  </td>

                  <td>{order.paymentMethod}</td>

                  <td>
                    <span className={`order-status ${STATUS_CLASS[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </td>

                  <td>{formatDate(order.createdAt)}</td>

                  <td>
                    <button
                      className="order-view-btn"
                      onClick={() => openOrder(order)}
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (

        <div
          className="order-modal-overlay"
          onClick={closeOrder}
        >
          <div
            className="order-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="order-modal-header">
              <div>
                <span>ORDER DETAILS</span>
                <h2>
                  #{selectedOrder._id.slice(-8).toUpperCase()}
                </h2>
                <p>{formatDate(selectedOrder.createdAt)}</p>
              </div>

              <button
                className="order-modal-close"
                onClick={closeOrder}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="order-modal-body">

              {/* CUSTOMER DETAILS */}
              <section className="order-detail-section">
                <h3>
                  <User size={18} />
                  Customer Information
                </h3>

                <div className="order-customer-grid">

                  <div>
                    <User size={16} />
                    <span>{selectedOrder.customer?.name}</span>
                  </div>

                  <div>
                    <Phone size={16} />
                    <span>{selectedOrder.customer?.phone}</span>
                  </div>

                  <div>
                    <Mail size={16} />
                    <span>
                      {selectedOrder.customer?.email || 'Not provided'}
                    </span>
                  </div>

                  <div>
                    <MapPin size={16} />
                    <span>{selectedOrder.address}</span>
                  </div>

                </div>
              </section>

              {/* ORDERED ITEMS */}
              <section className="order-detail-section">
                <h3>
                  <ShoppingBag size={18} />
                  Items Ordered
                </h3>

                <div className="order-items-list">

                  {selectedOrder.items?.map((item, index) => (
                    <div
                      className="order-item-row"
                      key={`${item.menuItemId}-${index}`}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          ₹{Number(item.price).toFixed(2)} × {item.quantity}
                        </span>
                      </div>

                      <strong>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </strong>
                    </div>
                  ))}

                </div>

                <div className="order-total-row">
                  <span>Total Amount</span>
                  <strong>
                    ₹{Number(selectedOrder.totalAmount).toFixed(2)}
                  </strong>
                </div>
              </section>

              {/* PAYMENT DETAILS */}
              <section className="order-detail-section">
                <h3>
                  <CreditCard size={18} />
                  Payment Information
                </h3>

                <div className="order-payment-info">
                  <span>Payment Method</span>
                  <strong>{selectedOrder.paymentMethod}</strong>
                </div>
              </section>

              {/* STATUS MANAGEMENT */}
              <section className="order-detail-section order-status-management">

                <h3>
                  <Package size={18} />
                  Order Status
                </h3>

                <div className="order-current-status">
                  <span>Current Status</span>

                  <span className={`order-status ${STATUS_CLASS[selectedOrder.status] || ''}`}>
                    {selectedOrder.status}
                  </span>
                </div>

                {isClosed ? (

                  <div className="order-closed-message">
                    <CheckCircle size={18} />
                    This order is closed. No further status changes are allowed.
                  </div>

                ) : (

                  <>
                    <label htmlFor="order-status-select">
                      Update Order Status
                    </label>

                    <select
                      id="order-status-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      disabled={updating}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      className="order-update-btn"
                      onClick={handleStatusUpdate}
                      disabled={updating || newStatus === selectedOrder.status}
                    >
                      {updating ? 'Updating...' : 'Update Order Status'}
                    </button>
                  </>

                )}

                {message && (
                  <p className="order-update-message">
                    {message}
                  </p>
                )}

              </section>

            </div>

          </div>
        </div>

      )}

    </div>
  )
}

export default OrderManagement

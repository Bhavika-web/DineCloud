
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  Plus,
  Package,
  AlertTriangle,
  XCircle,
  Layers,
  Pencil,
  RotateCcw,
  History,
  X,
  Boxes,
  Clock,
} from 'lucide-react'

import http from '../../api/http'
import '../../styles/admin.css'
import '../../styles/inventory.css'

const UNITS = ['g', 'ml', 'piece']

function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [savingItem, setSavingItem] = useState(false)

  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockingItem, setRestockingItem] = useState(null)
  const [restocking, setRestocking] = useState(false)

  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyItem, setHistoryItem] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')

  const [itemForm, setItemForm] = useState({
    name: '',
    category: '',
    unit: 'piece',
    lowStockThreshold: '0',
  })

  const [restockForm, setRestockForm] = useState({
    quantity: '',
    note: '',
  })

  const getAuthConfig = () => {
    const token = sessionStorage.getItem('adminToken')

    if (!token) {
      throw new Error('Admin session expired. Please log in again.')
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await http.get(
        '/admin/inventory',
        getAuthConfig()
      )

      setItems(response.data.items || [])
    } catch (err) {
      console.error('Fetch inventory error:', err)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load inventory.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const categories = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) => item.category || 'General')
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b))
  }, [items])

  const lowStockItems = items.filter(
    (item) => Number(item.currentStock) <= Number(item.lowStockThreshold)
  )

  const outOfStockItems = items.filter(
    (item) => Number(item.currentStock) === 0
  )

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)

    const matchesCategory =
      categoryFilter === 'All' ||
      (item.category || 'General') === categoryFilter

    const currentStock = Number(item.currentStock)
    const threshold = Number(item.lowStockThreshold)

    let matchesStock = true

    if (stockFilter === 'Low Stock') {
      matchesStock = currentStock <= threshold
    } else if (stockFilter === 'In Stock') {
      matchesStock = currentStock > threshold
    } else if (stockFilter === 'Out of Stock') {
      matchesStock = currentStock === 0
    }

    return matchesSearch && matchesCategory && matchesStock
  })

  const getStockStatus = (item) => {
    const stock = Number(item.currentStock)
    const threshold = Number(item.lowStockThreshold)

    if (stock === 0) {
      return { label: 'Out of Stock', className: 'out' }
    }

    if (stock <= threshold) {
      return { label: 'Low Stock', className: 'low' }
    }

    return { label: 'In Stock', className: 'available' }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const openAddModal = () => {
    setEditingItem(null)
    setItemForm({
      name: '',
      category: '',
      unit: 'piece',
      lowStockThreshold: '0',
    })
    setError('')
    setSuccess('')
    setShowItemModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name || '',
      category: item.category || 'General',
      unit: item.unit || 'piece',
      lowStockThreshold: String(item.lowStockThreshold ?? 0),
    })
    setError('')
    setSuccess('')
    setShowItemModal(true)
  }

  const closeItemModal = () => {
    if (savingItem) return
    setShowItemModal(false)
    setEditingItem(null)
  }

  const handleItemFormChange = (event) => {
    const { name, value } = event.target

    setItemForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSaveItem = async (event) => {
    event.preventDefault()

    if (savingItem) return

    const name = itemForm.name.trim()
    const category = itemForm.category.trim()
    const threshold = Number(itemForm.lowStockThreshold)

    if (!name) {
      setError('Please enter an inventory item name.')
      return
    }

    if (
      itemForm.lowStockThreshold === '' ||
      !Number.isFinite(threshold) ||
      threshold < 0
    ) {
      setError('Enter a valid non-negative low-stock threshold.')
      return
    }

    const payload = {
      name,
      category: category || 'General',
      lowStockThreshold: threshold,
    }

    if (!editingItem) {
      payload.unit = itemForm.unit
    }

    try {
      setSavingItem(true)
      setError('')
      setSuccess('')

      const config = getAuthConfig()

      let response

      if (editingItem) {
        response = await http.patch(
          `/admin/inventory/${editingItem._id}`,
          payload,
          config
        )
      } else {
        response = await http.post(
          '/admin/inventory',
          payload,
          config
        )
      }

      setShowItemModal(false)
      setEditingItem(null)
      setSuccess(
        response.data.message ||
        (editingItem
          ? 'Inventory item updated successfully.'
          : 'Inventory item added successfully.')
      )

      await fetchInventory()
    } catch (err) {
      console.error('Save inventory item error:', err)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to save inventory item.'
      )
    } finally {
      setSavingItem(false)
    }
  }

  const openRestockModal = (item) => {
    setRestockingItem(item)
    setRestockForm({
      quantity: '',
      note: '',
    })
    setError('')
    setSuccess('')
    setShowRestockModal(true)
  }

  const closeRestockModal = () => {
    if (restocking) return
    setShowRestockModal(false)
    setRestockingItem(null)
  }

  const handleRestock = async (event) => {
    event.preventDefault()

    if (!restockingItem || restocking) return

    const quantity = Number(restockForm.quantity)
    const note = restockForm.note.trim()

    if (
      restockForm.quantity === '' ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError('Enter a valid quantity greater than zero.')
      return
    }

    if (note.length > 500) {
      setError('The note cannot exceed 500 characters.')
      return
    }

    try {
      setRestocking(true)
      setError('')
      setSuccess('')

      const response = await http.post(
        `/admin/inventory/${restockingItem._id}/restock`,
        { quantity, note },
        getAuthConfig()
      )

      setShowRestockModal(false)
      setRestockingItem(null)
      setSuccess(
        response.data.message || 'Stock updated successfully.'
      )

      await fetchInventory()
    } catch (err) {
      console.error('Restock inventory error:', err)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to restock inventory.'
      )
    } finally {
      setRestocking(false)
    }
  }

  const openHistoryModal = async (item) => {
    setHistoryItem(item)
    setLogs([])
    setLogsError('')
    setShowHistoryModal(true)

    try {
      setLogsLoading(true)

      const response = await http.get(
        `/admin/inventory/${item._id}/logs?page=1&limit=20`,
        getAuthConfig()
      )

      setLogs(response.data.logs || [])
    } catch (err) {
      console.error('Fetch inventory history error:', err)

      setLogsError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load stock history.'
      )
    } finally {
      setLogsLoading(false)
    }
  }

  const closeHistoryModal = () => {
    if (logsLoading) return
    setShowHistoryModal(false)
    setHistoryItem(null)
    setLogs([])
  }

  return (
    <div className="admin-page inventory-page">

      {/* PAGE HEADING */}
      <div className="admin-page-heading inventory-page-heading">
        <div>
          <span className="admin-page-eyebrow">
            RESTAURANT OPERATIONS
          </span>

          <h1>Inventory Management</h1>

          <p>
            Track ingredient stock, monitor low-stock items and manage restocking.
          </p>
        </div>

        <div className="inventory-heading-actions">
          <button
            className="inventory-refresh-btn"
            onClick={fetchInventory}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            className="inventory-add-btn"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Item
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="inventory-alert inventory-alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="inventory-alert inventory-alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} aria-label="Dismiss message">
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="inventory-summary-grid">

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon total">
            <Boxes size={21} />
          </div>
          <div>
            <span>Total Items</span>
            <h3>{items.length}</h3>
            <p>Tracked inventory items</p>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon low">
            <AlertTriangle size={21} />
          </div>
          <div>
            <span>Low Stock</span>
            <h3>{lowStockItems.length}</h3>
            <p>At or below threshold</p>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon out">
            <XCircle size={21} />
          </div>
          <div>
            <span>Out of Stock</span>
            <h3>{outOfStockItems.length}</h3>
            <p>Items with zero stock</p>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon categories">
            <Layers size={21} />
          </div>
          <div>
            <span>Categories</span>
            <h3>{categories.length}</h3>
            <p>Inventory categories</p>
          </div>
        </div>

      </div>

      {/* INVENTORY TABLE */}
      <section className="inventory-section">

        <div className="inventory-section-heading">
          <div>
            <h2>Inventory Items</h2>
            <p>Manage your restaurant's ingredients and supplies.</p>
          </div>

          <span className="inventory-result-count">
            {filteredItems.length} of {items.length} items
          </span>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="inventory-toolbar">

          <div className="inventory-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search inventory items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            aria-label="Filter by stock status"
          >
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

        </div>

        <div className="inventory-table-container">

          {loading ? (
            <div className="inventory-empty">
              <RefreshCw size={25} className="inventory-loading-icon" />
              <p>Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="inventory-empty">
              <Package size={36} />
              <h3>No inventory items found</h3>
              <p>
                {items.length === 0
                  ? 'Add your first inventory item to get started.'
                  : 'Try changing your search or filters.'}
              </p>
              {items.length === 0 && (
                <button
                  className="inventory-add-btn"
                  onClick={openAddModal}
                >
                  <Plus size={16} />
                  Add First Item
                </button>
              )}
            </div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Low Stock At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const status = getStockStatus(item)

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="inventory-item-name">
                          <div className="inventory-item-icon">
                            <Package size={18} />
                          </div>
                          <strong>{item.name}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="inventory-category">
                          {item.category || 'General'}
                        </span>
                      </td>

                      <td>
                        <strong className="inventory-stock-value">
                          {Number(item.currentStock).toLocaleString('en-IN')}
                        </strong>
                        <span className="inventory-unit">
                          {' '}{item.unit}
                        </span>
                      </td>

                      <td>
                        {Number(item.lowStockThreshold).toLocaleString('en-IN')}
                        <span className="inventory-unit">
                          {' '}{item.unit}
                        </span>
                      </td>

                      <td>
                        <span className={`inventory-status ${status.className}`}>
                          {status.label}
                        </span>
                      </td>

                      <td>
                        <div className="inventory-row-actions">
                          <button
                            className="inventory-action-btn restock"
                            onClick={() => openRestockModal(item)}
                            title="Restock item"
                          >
                            <RotateCcw size={15} />
                            <span>Restock</span>
                          </button>

                          <button
                            className="inventory-icon-btn"
                            onClick={() => openEditModal(item)}
                            title="Edit item"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="inventory-icon-btn"
                            onClick={() => openHistoryModal(item)}
                            title="Stock history"
                            aria-label={`View history for ${item.name}`}
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

        </div>
      </section>

      {/* ADD / EDIT ITEM MODAL */}
      {showItemModal && (
        <div
          className="inventory-modal-overlay"
          onClick={closeItemModal}
        >
          <div
            className="inventory-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <span>INVENTORY DETAILS</span>
                <h2>{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
                <p>
                  {editingItem
                    ? 'Update the item information and stock threshold.'
                    : 'Add an ingredient or supply to your inventory.'}
                </p>
              </div>

              <button
                className="inventory-modal-close"
                onClick={closeItemModal}
                disabled={savingItem}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="inventory-form">

              <label>
                Item Name
                <input
                  name="name"
                  value={itemForm.name}
                  onChange={handleItemFormChange}
                  placeholder="e.g. Basmati Rice"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Category
                <input
                  name="category"
                  value={itemForm.category}
                  onChange={handleItemFormChange}
                  placeholder="e.g. Grains, Dairy, Vegetables"
                  maxLength={100}
                />
              </label>

              <div className="inventory-form-grid">
                <label>
                  Unit
                  <select
                    name="unit"
                    value={itemForm.unit}
                    onChange={handleItemFormChange}
                    disabled={Boolean(editingItem)}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit === 'g'
                          ? 'Grams (g)'
                          : unit === 'ml'
                            ? 'Millilitres (ml)'
                            : 'Pieces'}
                      </option>
                    ))}
                  </select>
                  {editingItem && (
                    <small>Unit cannot be changed after creation.</small>
                  )}
                </label>

                <label>
                  Low Stock Threshold
                  <input
                    type="number"
                    name="lowStockThreshold"
                    value={itemForm.lowStockThreshold}
                    onChange={handleItemFormChange}
                    min="0"
                    step="any"
                    required
                  />
                </label>
              </div>

              {!editingItem && (
                <div className="inventory-form-note">
                  <AlertTriangle size={16} />
                  New items start with zero stock. Use Restock after creating the item.
                </div>
              )}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={closeItemModal}
                  disabled={savingItem}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-submit-btn"
                  disabled={savingItem}
                >
                  {savingItem
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Add Item'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && restockingItem && (
        <div
          className="inventory-modal-overlay"
          onClick={closeRestockModal}
        >
          <div
            className="inventory-modal inventory-restock-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <span>STOCK UPDATE</span>
                <h2>Restock Item</h2>
                <p>{restockingItem.name}</p>
              </div>

              <button
                className="inventory-modal-close"
                onClick={closeRestockModal}
                disabled={restocking}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <div className="inventory-current-stock">
              <span>Current Stock</span>
              <strong>
                {Number(restockingItem.currentStock).toLocaleString('en-IN')} {restockingItem.unit}
              </strong>
            </div>

            <form onSubmit={handleRestock} className="inventory-form">

              <label>
                Quantity to Add ({restockingItem.unit})
                <input
                  type="number"
                  value={restockForm.quantity}
                  onChange={(event) =>
                    setRestockForm((previous) => ({
                      ...previous,
                      quantity: event.target.value,
                    }))
                  }
                  min="0"
                  step="any"
                  placeholder="Enter quantity"
                  required
                />
              </label>

              <label>
                Note (Optional)
                <textarea
                  value={restockForm.note}
                  onChange={(event) =>
                    setRestockForm((previous) => ({
                      ...previous,
                      note: event.target.value,
                    }))
                  }
                  maxLength={500}
                  rows={3}
                  placeholder="e.g. Weekly supplier delivery"
                />
              </label>

              {restockForm.quantity !== '' &&
                Number(restockForm.quantity) > 0 && (
                  <div className="inventory-restock-preview">
                    <span>Estimated Stock After Restocking</span>
                    <strong>
                      {(
                        Number(restockingItem.currentStock) +
                        Number(restockForm.quantity)
                      ).toLocaleString('en-IN')} {restockingItem.unit}
                    </strong>
                  </div>
                )}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={closeRestockModal}
                  disabled={restocking}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-submit-btn"
                  disabled={restocking}
                >
                  {restocking ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* STOCK HISTORY MODAL */}
      {showHistoryModal && historyItem && (
        <div
          className="inventory-modal-overlay"
          onClick={closeHistoryModal}
        >
          <div
            className="inventory-modal inventory-history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <span>INVENTORY ACTIVITY</span>
                <h2>Stock History</h2>
                <p>{historyItem.name}</p>
              </div>

              <button
                className="inventory-modal-close"
                onClick={closeHistoryModal}
                disabled={logsLoading}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <div className="inventory-history-current">
              <span>Current Stock</span>
              <strong>
                {Number(historyItem.currentStock).toLocaleString('en-IN')} {historyItem.unit}
              </strong>
            </div>

            <div className="inventory-history-list">
              {logsLoading ? (
                <div className="inventory-empty">
                  <RefreshCw size={23} className="inventory-loading-icon" />
                  <p>Loading stock history...</p>
                </div>
              ) : logsError ? (
                <div className="inventory-history-error">
                  {logsError}
                </div>
              ) : logs.length === 0 ? (
                <div className="inventory-empty">
                  <History size={30} />
                  <h3>No stock history yet</h3>
                  <p>Restocking activity will appear here.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div className="inventory-log-row" key={log._id}>
                    <div className="inventory-log-icon">
                      <RotateCcw size={17} />
                    </div>

                    <div className="inventory-log-details">
                      <strong>
                        {log.action === 'restock'
                          ? 'Stock Restocked'
                          : log.action || 'Stock Activity'}
                      </strong>
                      <span>{log.note || 'No note provided'}</span>
                      <small>
                        <Clock size={13} />
                        {formatDate(log.createdAt)}
                      </small>
                    </div>

                    <strong className="inventory-log-quantity">
                      +{Number(log.quantity).toLocaleString('en-IN')} {log.unit || historyItem.unit}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div className="inventory-modal-actions">
              <button
                className="inventory-cancel-btn"
                onClick={closeHistoryModal}
                disabled={logsLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Inventory

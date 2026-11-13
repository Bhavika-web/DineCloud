
const express = require('express')
const adminAuth = require('../middleware/adminAuth')

// Dashboard controller
const {
  getDashboardStats,
} = require('../controllers/adminDashboardController')

// Analytics controller
const {
  getAnalytics,
} = require('../controllers/adminAnalyticsController')

// Order controller
const {
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/adminOrderController')

// Inventory controller
const {
  getAllInventory,
  createInventoryItem,
  updateInventoryItem,
  restockInventory,
  getInventoryLogs,
  getLowStockItems,
} = require('../controllers/inventoryController')

const router = express.Router()

// ========================================
// ADMIN AUTHENTICATION
// All routes below require admin access
// ========================================

router.use(adminAuth)

// ========================================
// DASHBOARD ROUTES
// ========================================

router.get('/dashboard', getDashboardStats)

// ========================================
// ANALYTICS ROUTES
// ========================================

router.get('/analytics', getAnalytics)

// ========================================
// ORDER MANAGEMENT ROUTES
// ========================================

router.get('/orders', getAllOrders)

router.patch('/orders/:id/status', updateOrderStatus)

// ========================================
// INVENTORY MANAGEMENT ROUTES
// ========================================

router.get('/inventory', getAllInventory)

// Get low-stock ingredients
router.get('/inventory/low-stock', getLowStockItems)

// Add a new inventory ingredient
router.post('/inventory', createInventoryItem)

// Update ingredient details
router.patch('/inventory/:id', updateInventoryItem)

// Restock an ingredient
router.post('/inventory/:id/restock', restockInventory)

// Get ingredient stock movement history
router.get('/inventory/:id/logs', getInventoryLogs)

module.exports = router

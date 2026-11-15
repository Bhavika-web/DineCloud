const express = require('express')
const orderRateLimiter = require('../middleware/orderRateLimiter')
const {
  placeOrder,
  trackOrder,
  registerOrderNotifications,
} = require('../controllers/orderController')

const router = express.Router()

router.post('/', orderRateLimiter, placeOrder)
router.post('/:id/notifications', registerOrderNotifications)
router.get('/:id', trackOrder)

module.exports = router

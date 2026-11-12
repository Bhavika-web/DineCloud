const express = require('express')
const orderRateLimiter = require('../middleware/orderRateLimiter')
const { placeOrder, trackOrder } = require('../controllers/orderController')

const router = express.Router()

router.post('/', orderRateLimiter, placeOrder)
router.get('/:id', trackOrder)

module.exports = router

const express = require('express')
const { placeOrder, trackOrder } = require('../controllers/orderController')

const router = express.Router()

router.post('/', placeOrder)
router.get('/:id', trackOrder)

module.exports = router

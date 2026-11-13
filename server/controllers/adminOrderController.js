
const mongoose = require('mongoose')
const Order = require('../models/Order')

const {
  restoreIngredientsForOrder,
} = require('../services/inventoryService')

const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered',
  'Cancelled',
]

// ========================================
// GET ALL ORDERS
// ========================================

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    })
  } catch (error) {
    return next(error)
  }
}


// ========================================
// UPDATE ORDER STATUS
// ========================================

const updateOrderStatus = async (req, res, next) => {
  const { id } = req.params
  const { status } = req.body

  // Validate order ID.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.',
    })
  }

  // Validate requested status.
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order status.',
    })
  }

  // ========================================
  // CANCELLATION WITH INVENTORY RESTORATION
  // ========================================

  if (status === 'Cancelled') {
    const session = await mongoose.startSession()

    try {
      let cancelledOrder

      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session)

        if (!order) {
          throw Object.assign(
            new Error('Order not found.'),
            { status: 404 },
          )
        }

        // Prevent modifying final orders.
        if (
          ['Delivered', 'Cancelled'].includes(order.status)
        ) {
          throw Object.assign(
            new Error(
              `This order has already been ${order.status.toLowerCase()}. Its status cannot be changed.`,
            ),
            { status: 400 },
          )
        }

        // Inventory must have been deducted first.
        if (order.inventoryStatus !== 'deducted') {
          throw Object.assign(
            new Error(
              'Inventory cannot be restored because it has not been deducted for this order. Manual review is required.',
            ),
            { status: 409 },
          )
        }

        // Restore previously deducted ingredients.
        await restoreIngredientsForOrder({
          orderId: order._id,
          session,
        })

        // Update both order and inventory status.
        order.inventoryStatus = 'restored'
        order.status = 'Cancelled'

        await order.save({ session })

        cancelledOrder = order
      })

      return res.status(200).json({
        success: true,
        message:
          'Order cancelled and inventory restored successfully.',
        order: cancelledOrder,
      })
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        })
      }

      return next(error)
    } finally {
      await session.endSession()
    }
  }

  // ========================================
  // NORMAL STATUS UPDATE
  // ========================================

  try {
    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
    }

    // Delivered and Cancelled are final statuses.
    if (['Delivered', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message:
          `This order has already been ${order.status.toLowerCase()}. Its status cannot be changed.`,
      })
    }

    order.status = status

    await order.save()

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getAllOrders,
  updateOrderStatus,
}


const mongoose = require('mongoose')
const Order = require('../models/Order')

const {
  restoreIngredientsForOrder,
} = require('../services/inventoryService')
const {
  sendOrderStatusNotification,
} = require('../services/fcmNotificationService')

const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered',
  'Cancelled',
]

const notifyOrderStatusChange = async (order) => {
  if (!['Preparing', 'Ready', 'Cancelled'].includes(order.status)) return

  try {
    const result = await sendOrderStatusNotification(order)
    if (result.failedCount > 0) {
      console.warn('Some order status notifications could not be sent.', {
        orderId: String(order._id),
        status: order.status,
        failedCount: result.failedCount,
        removedCount: result.removedCount,
      })
    }
  } catch (error) {
    console.error('Order status notification failed.', {
      orderId: String(order._id),
      status: order.status,
      name: error.name,
      code: error.code,
    })
  }
}

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
      let previousStatus

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
        previousStatus = order.status
        order.inventoryStatus = 'restored'
        order.status = 'Cancelled'

        await order.save({ session })

        cancelledOrder = order
      })

      console.info('[FCM] Admin changed order status.', {
        orderId: String(cancelledOrder._id),
        from: previousStatus,
        to: 'Cancelled',
      })
      await notifyOrderStatusChange(cancelledOrder)

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

    if (order.status === status) {
      return res.status(200).json({
        success: true,
        message: `Order status is already ${status}.`,
        order,
      })
    }

    const previousStatus = order.status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, status: previousStatus },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true },
    )

    if (!updatedOrder) {
      const currentOrder = await Order.findById(id)
      if (!currentOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        })
      }

      if (currentOrder.status === status) {
        return res.status(200).json({
          success: true,
          message: `Order status is already ${status}.`,
          order: currentOrder,
        })
      }

      return res.status(409).json({
        success: false,
        message: 'The order status changed concurrently. Refresh and retry.',
      })
    }

    if (previousStatus !== updatedOrder.status) {
      console.info('[FCM] Admin changed order status.', {
        orderId: String(updatedOrder._id),
        from: previousStatus,
        to: updatedOrder.status,
      })
      await notifyOrderStatusChange(updatedOrder)
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${updatedOrder.status}.`,
      order: updatedOrder,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getAllOrders,
  updateOrderStatus,
}

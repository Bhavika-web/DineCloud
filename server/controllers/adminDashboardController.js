
const Order = require('../models/Order')

// =====================================
// GET ADMIN DASHBOARD STATISTICS
// =====================================

const getDashboardStats = async (req, res, next) => {
  try {

    // 1. Total orders
    const totalOrders = await Order.countDocuments()

    // 2. Orders currently being processed
    const pendingOrders = await Order.countDocuments({
      status: {
        $in: ['Placed', 'Confirmed', 'Preparing', 'Ready'],
      },
    })

    // 3. Successfully delivered orders
    const completedOrders = await Order.countDocuments({
      status: 'Delivered',
    })

    // 4. Total value of non-cancelled orders
    const revenueResult = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ])

    const totalOrderValue = revenueResult[0]?.total || 0

    // 5. Fetch latest five orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'customer items totalAmount status paymentMethod createdAt'
      )
      .lean()

    // 6. Send response
    return res.status(200).json({
      success: true,

      stats: {
        totalOrders,
        totalOrderValue,
        pendingOrders,
        completedOrders,
      },

      recentOrders,
    })

  } catch (error) {
    next(error)
  }
}

module.exports = {
  getDashboardStats,
}


const Order = require('../models/Order')

const TIMEZONE = 'Asia/Kolkata'
const ACTIVE_STATUSES = ['Placed', 'Confirmed', 'Preparing', 'Ready']

const getIndiaMidnight = (date) => {
  const dateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000)
}

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

    // Today's operational figures use the same India-local calendar day as analytics.
    const todayStart = getIndiaMidnight(new Date())
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const todayResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lt: tomorrowStart },
        },
      },
      {
        $group: {
          _id: null,
          todayOrders: { $sum: 1 },
          activeOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0],
            },
          },
          todayRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Delivered'] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
    ])
    const todayStats = todayResult[0] || {
      todayOrders: 0,
      activeOrders: 0,
      todayRevenue: 0,
    }

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
        ...todayStats,
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

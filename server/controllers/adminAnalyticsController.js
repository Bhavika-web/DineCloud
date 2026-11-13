
const Order = require('../models/Order')

const TIMEZONE = 'Asia/Kolkata'

const ACTIVE_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Ready',
]

// Convert a date into YYYY-MM-DD in Indian Standard Time.
const getIndiaDateString = (date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Add or subtract calendar days from YYYY-MM-DD.
const addDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(Date.UTC(year, month - 1, day + days))

  return date.toISOString().slice(0, 10)
}

// Convert Indian calendar midnight into a UTC Date.
const getIndiaMidnight = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(
    Date.UTC(year, month - 1, day) - (330 * 60 * 1000)
  )
}

const isValidDate = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false
  }

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const getAnalytics = async (req, res) => {
  try {
    // 1. Get date range from query parameters.
    const today = getIndiaDateString(new Date())

    const startDate = req.query.startDate || addDays(today, -29)
    const endDate = req.query.endDate || today

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      })
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      })
    }

    if (endDate > today) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be in the future.',
      })
    }

    // End date is exclusive so the entire selected day is included.
    const start = getIndiaMidnight(startDate)
    const end = getIndiaMidnight(addDays(endDate, 1))

    const dateFilter = {
      createdAt: {
        $gte: start,
        $lt: end,
      },
    }

    // 2. Summary statistics.
    const summaryPipeline = [
      { $match: dateFilter },

      {
        $group: {
          _id: null,

          totalOrders: {
            $sum: 1,
          },

          deliveredOrders: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Delivered'] },
                1,
                0,
              ],
            },
          },

          cancelledOrders: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Cancelled'] },
                1,
                0,
              ],
            },
          },

          activeOrders: {
            $sum: {
              $cond: [
                { $in: ['$status', ACTIVE_STATUSES] },
                1,
                0,
              ],
            },
          },

          deliveredRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Delivered'] },
                '$totalAmount',
                0,
              ],
            },
          },

          averageOrderValue: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'Delivered'] },
                '$totalAmount',
                null,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          totalOrders: 1,
          deliveredOrders: 1,
          cancelledOrders: 1,
          activeOrders: 1,
          deliveredRevenue: 1,
          averageOrderValue: {
            $round: [
              { $ifNull: ['$averageOrderValue', 0] },
              2,
            ],
          },
        },
      },
    ]

    // 3. Order status breakdown.
    const statusPipeline = [
      { $match: dateFilter },

      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 } },

      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
    ]

    // 4. Daily revenue trends.
    const revenuePipeline = [
      {
        $match: {
          ...dateFilter,
          status: 'Delivered',
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: TIMEZONE,
            },
          },

          revenue: {
            $sum: '$totalAmount',
          },

          orders: {
            $sum: 1,
          },
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          orders: 1,
        },
      },
    ]

    // 5. Best-selling menu items.
    const popularItemsPipeline = [
      {
        $match: {
          ...dateFilter,
          status: 'Delivered',
        },
      },

      { $unwind: '$items' },

      {
        $group: {
          _id: '$items.menuItemId',

          itemName: {
            $first: '$items.name',
          },

          quantitySold: {
            $sum: '$items.quantity',
          },

          revenue: {
            $sum: {
              $multiply: [
                '$items.price',
                '$items.quantity',
              ],
            },
          },
        },
      },

      { $sort: { quantitySold: -1 } },

      { $limit: 10 },

      {
        $project: {
          _id: 0,
          menuItemId: '$_id',
          itemName: 1,
          quantitySold: 1,
          revenue: 1,
        },
      },
    ]

    // 6. Peak ordering hours.
    const peakHoursPipeline = [
      {
        $match: {
          ...dateFilter,
          status: 'Delivered',
        },
      },

      {
        $group: {
          _id: {
            $hour: {
              date: '$createdAt',
              timezone: TIMEZONE,
            },
          },

          orders: {
            $sum: 1,
          },
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id: 0,
          hour: '$_id',
          orders: 1,
        },
      },
    ]

    // 7. Execute aggregations concurrently.
    const [
      summaryResult,
      statusBreakdown,
      revenueTrend,
      popularItems,
      peakHours,
    ] = await Promise.all([
      Order.aggregate(summaryPipeline),
      Order.aggregate(statusPipeline),
      Order.aggregate(revenuePipeline),
      Order.aggregate(popularItemsPipeline),
      Order.aggregate(peakHoursPipeline),
    ])

    const summary = summaryResult[0] || {
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      activeOrders: 0,
      deliveredRevenue: 0,
      averageOrderValue: 0,
    }

    return res.status(200).json({
      success: true,

      dateRange: {
        startDate,
        endDate,
      },

      summary,
      statusBreakdown,
      revenueTrend,
      popularItems,
      peakHours,
    })
  } catch (error) {
    console.error('Analytics Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data.',
    })
  }
}

module.exports = {
  getAnalytics,
}


const jwt = require('jsonwebtoken')
const User = require('../models/User')

const adminAuth = async (req, res, next) => {
  try {
    const authorization = req.get('Authorization')

    // Expect: Authorization: Bearer <token>
    const match = authorization?.match(/^Bearer\s+(\S+)$/i)

    if (!match) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication is not configured.',
      })
    }

    // Verify token signature and expiry
    const payload = jwt.verify(
      match[1],
      process.env.JWT_SECRET
    )

    if (
      !payload ||
      typeof payload !== 'object' ||
      !payload.sub ||
      payload.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Admin access required.',
      })
    }

    // Verify that the admin account still exists
    const user = await User.findById(payload.sub)
      .select('_id role')

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access denied.',
      })
    }

    // Make authenticated user information available
    // to the next controller
    req.user = {
      id: String(user._id),
      role: user.role,
    }

    next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired authentication token.',
      })
    }

    next(error)
  }
}

module.exports = adminAuth

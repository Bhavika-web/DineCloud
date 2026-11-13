
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// =====================================
// ADMIN LOGIN
// =====================================

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body || {}

    // Basic input validation
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find admin account
    const user = await User.findOne({
      email: normalizedEmail,
    })

    // Generic error prevents revealing whether an email exists
    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    // Compare entered password with stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication is not configured.',
      })
    }

    // Generate admin JWT
    const token = jwt.sign(
      {
        sub: String(user._id),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      }
    )

    return res.status(200).json({
      message: 'Login successful.',
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

// =====================================
// GET LOGGED-IN ADMIN PROFILE
// =====================================

const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id)
      .select('-password')

    if (!admin || admin.role !== 'admin') {
      return res.status(401).json({
        message: 'Admin account not found or access denied.',
      })
    }

    return res.status(200).json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  adminLogin,
  getAdminProfile,
}


require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const connectDB = require('../config/db')
const User = require('../models/User')

const seedAdmin = async () => {
  try {
    const name = process.env.ADMIN_NAME?.trim()
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD

    // Check environment variables
    if (!name || !email || !password) {
      throw new Error(
        'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be configured.'
      )
    }

    if (password.length < 12) {
      throw new Error(
        'Admin password must contain at least 12 characters.'
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please provide a valid admin email address.')
    }

    // Connect to MongoDB
    await connectDB()

    // Do not accidentally overwrite an existing account
    const existingAdmin = await User.findOne({ email })

    if (existingAdmin) {
      throw new Error(
        'An account with this email already exists. No account was changed.'
      )
    }

    // Hash password before storing it
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create initial admin
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    })

    console.log('Admin account created successfully.')
    console.log('Admin ID:', String(admin._id))
    console.log('Admin email:', admin.email)

  } catch (error) {
    console.error('Admin seed failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

seedAdmin()

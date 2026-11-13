
const express = require('express')

const {
  adminLogin,
  getAdminProfile,
} = require('../controllers/authController')

const adminAuth = require('../middleware/adminAuth')

const router = express.Router()

// Public route: admin login
router.post('/login', adminLogin)

// Protected route: logged-in admin profile
router.get('/me', adminAuth, getAdminProfile)

module.exports = router

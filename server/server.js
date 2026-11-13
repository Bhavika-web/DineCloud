const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const connectDB = require('./config/db')
const menuRoutes = require('./routes/menuRoutes')
const orderRoutes = require('./routes/orderRoutes')
const Order = require('./models/Order')
const IdempotencyRecord = require('./models/IdempotencyRecord')
const authRoutes = require('./routes/authRoutes')
const adminRoutes = require('./routes/adminRoutes')

dotenv.config()

const app = express()

app.set('trust proxy', 1)

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || ''
  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  for (const origin of origins) {
    let parsedOrigin
    try {
      parsedOrigin = new URL(origin)
    } catch {
      throw new Error('CLIENT_URLS must contain valid frontend origins.')
    }

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin ||
      parsedOrigin.username ||
      parsedOrigin.password
    ) {
      throw new Error('CLIENT_URLS must contain exact http(s) origins without paths or credentials.')
    }
  }

  return new Set(origins)
}

const validateEnvironment = () => {
  if (!process.env.MONGO_URI?.trim()) {
    throw new Error('MONGO_URI is required. Set it in the server environment.')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET must be set to a secret at least 32 characters long.')
  }

  return parseAllowedOrigins()
}

const allowedOrigins = new Set()

app.use(express.json())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true)
    }

    const error = new Error('Origin not allowed by CORS.')
    error.status = 403
    return callback(error)
  },
}))

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    server: 'ok',
    database: databaseConnected ? 'connected' : 'disconnected',
  })
})

app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  if (error.name === 'ValidationError' || error.name === 'CastError' || error.status === 400) {
    return res.status(400).json({ message: 'Invalid request data.' })
  }
  if (error.status === 403) {
    return res.status(403).json({ message: 'Origin not allowed.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with the provided value already exists.' })
  }

  console.error('Request failed.', { name: error.name, code: error.code })
  return res.status(500).json({ message: 'An internal server error occurred.' })
})

const startServer = async () => {
  try {
    const configuredOrigins = validateEnvironment()
    configuredOrigins.forEach((origin) => allowedOrigins.add(origin))
    await connectDB()
    await Promise.all([Order.init(), IdempotencyRecord.init()])

    const port = process.env.PORT || 5000
    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`)
    })
    server.on('error', (error) => {
      console.error(`Server failed to listen: ${error.message}`)
      process.exitCode = 1
    })
  } catch (error) {
    const safeStartupMessages = [
      'MONGO_URI is required. Set it in the server environment.',
      'JWT_SECRET must be set to a secret at least 32 characters long.',
      'CLIENT_URLS must contain valid frontend origins.',
      'CLIENT_URLS must contain exact http(s) origins without paths or credentials.',
    ]
    const safeMessage = safeStartupMessages.includes(error.message)
      ? error.message
      : 'Database connection or index initialization failed.'
    console.error(`Server startup failed: ${safeMessage}`)
    process.exitCode = 1
  }
}

startServer()

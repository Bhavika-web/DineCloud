const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const connectDB = require('./config/db')
const menuRoutes = require('./routes/menuRoutes')
const orderRoutes = require('./routes/orderRoutes')

dotenv.config()

const app = express()

app.use(express.json())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  if (error.name === 'ValidationError' || error.name === 'CastError' || error.status === 400) {
    return res.status(400).json({ message: 'Invalid request data.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with the provided value already exists.' })
  }

  console.error(`Request failed: ${error.message}`)
  return res.status(500).json({ message: 'An internal server error occurred.' })
})

const startServer = async () => {
  try {
    await connectDB()

    const port = process.env.PORT || 5000
    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`)
    })
    server.on('error', (error) => {
      console.error(`Server failed to listen: ${error.message}`)
      process.exitCode = 1
    })
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`)
    process.exitCode = 1
  }
}

startServer()

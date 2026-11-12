const mongoose = require('mongoose')

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    const error = new Error('MONGO_URI is not set. Add it to the server environment.')
    console.error('MongoDB connection failed: MONGO_URI is not configured.')
    throw error
  }

  try {
    const connection = await mongoose.connect(mongoUri)
    console.log(`MongoDB connected: ${connection.connection.host}`)
    return connection
  } catch (error) {
    console.error('MongoDB connection failed.', { name: error.name, code: error.code })
    throw error
  }
}

module.exports = connectDB

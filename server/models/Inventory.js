const mongoose = require('mongoose')

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: 'General',
    },

    unit: {
      type: String,
      required: true,
      enum: ['g', 'ml', 'piece'],
    },

    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
)

module.exports =
  mongoose.models.Inventory ||
  mongoose.model('Inventory', inventorySchema)
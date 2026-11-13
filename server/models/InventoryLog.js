const mongoose = require('mongoose')

const inventoryLogSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    action: {
      type: String,
      required: true,
      enum: ['deduction', 'restoration', 'restock'],
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    unit: {
      type: String,
      required: true,
      enum: ['g', 'ml', 'piece'],
    },

    // Unique identifier for an inventory operation
    operationKey: {
      type: String,
      required: true,
      unique: true,
    },

    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
)

// Kept the compound index for performance, but removed the duplicate unique index declaration on operationKey
inventoryLogSchema.index({ orderId: 1, createdAt: -1 })

module.exports =
  mongoose.models.InventoryLog ||
  mongoose.model('InventoryLog', inventoryLogSchema)
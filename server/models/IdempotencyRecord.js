const mongoose = require('mongoose')

const idempotencyRecordSchema = new mongoose.Schema(
  {
    keyHash: {
      type: String,
      required: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    operationId: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    status: {
      type: String,
      enum: ['processing', 'completed'],
      required: true,
      default: 'processing',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
)

idempotencyRecordSchema.index({ keyHash: 1 }, { unique: true })
idempotencyRecordSchema.index({ operationId: 1 }, { unique: true })
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.models.IdempotencyRecord ||
  mongoose.model('IdempotencyRecord', idempotencyRecordSchema)

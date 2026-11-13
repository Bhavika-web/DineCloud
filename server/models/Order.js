
const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  { _id: false },
)

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number.',
      },
    },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: customerSchema,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must contain at least one item.',
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'Placed',
        'Confirmed',
        'Preparing',
        'Ready',
        'Delivered',
        'Cancelled',
      ],
      default: 'Placed',
      trim: true,
    },

    // Tracks whether inventory was deducted or restored.
    inventoryStatus: {
      type: String,
      enum: ['not_deducted', 'deducted', 'restored'],
      default: 'not_deducted',
    },

    idempotencyOperationId: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (document, result) => {
        delete result.idempotencyOperationId
        return result
      },
    },
  },
)

orderSchema.index(
  { idempotencyOperationId: 1 },
  { unique: true, sparse: true },
)

module.exports =
  mongoose.models.Order || mongoose.model('Order', orderSchema)

const mongoose = require('mongoose')

const notificationSubscriptionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4096,
    },
  },
  { timestamps: true },
)

notificationSubscriptionSchema.index(
  { orderId: 1, token: 1 },
  { unique: true },
)

module.exports =
  mongoose.models.NotificationSubscription ||
  mongoose.model('NotificationSubscription', notificationSubscriptionSchema)

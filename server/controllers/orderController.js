
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

const MenuItem = require('../models/MenuItem')
const Order = require('../models/Order')
const IdempotencyRecord = require('../models/IdempotencyRecord')

const { deductIngredientsForOrder } = require('../services/inventoryService')

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_ADDRESS_LENGTH = 500
const MAX_ORDER_ITEMS = 20
const MAX_ITEM_QUANTITY = 10

const PAYMENT_METHODS = new Set(['Cash', 'UPI/QR', 'Card'])

const requestFields = new Set([
  'customer',
  'items',
  'address',
  'paymentMethod',
])

// ========================================
// VALIDATE ORDER INPUT
// ========================================

const validateOrderInput = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' }
  }

  const unsupportedField = Object.keys(body).find(
    (field) => !requestFields.has(field),
  )

  if (unsupportedField) {
    return { error: `Unsupported order field: ${unsupportedField}.` }
  }

  const { customer, items, address, paymentMethod } = body

  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    return { error: 'customer must include a name and phone.' }
  }

  const unsupportedCustomerField = Object.keys(customer).find(
    (field) => !['name', 'phone', 'email'].includes(field),
  )

  if (unsupportedCustomerField) {
    return {
      error: `Unsupported customer field: ${unsupportedCustomerField}.`,
    }
  }

  if (
    typeof customer.name !== 'string' ||
    customer.name.trim().length === 0
  ) {
    return { error: 'customer.name must be a non-empty string.' }
  }

  const name = customer.name.trim()

  if (name.length > MAX_NAME_LENGTH) {
    return {
      error: `customer.name must not exceed ${MAX_NAME_LENGTH} characters.`,
    }
  }

  if (
    typeof customer.phone !== 'string' ||
    !/^[6-9]\d{9}$/.test(customer.phone)
  ) {
    return {
      error: 'customer.phone must be a valid 10-digit Indian mobile number.',
    }
  }

  const normalizedCustomer = {
    name,
    phone: customer.phone,
  }

  if (customer.email !== undefined && customer.email !== null) {
    if (typeof customer.email !== 'string') {
      return { error: 'customer.email must be a valid email address.' }
    }

    const email = customer.email.trim()

    if (email) {
      if (
        email.length > MAX_EMAIL_LENGTH ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return {
          error:
            'customer.email must be a valid email address of at most 254 characters.',
        }
      }

      normalizedCustomer.email = email.toLowerCase()
    }
  }

  if (
    typeof address !== 'string' ||
    address.trim().length === 0 ||
    address.trim().length > MAX_ADDRESS_LENGTH
  ) {
    return {
      error: `address must be non-empty and no longer than ${MAX_ADDRESS_LENGTH} characters.`,
    }
  }

  if (
    typeof paymentMethod !== 'string' ||
    !PAYMENT_METHODS.has(paymentMethod)
  ) {
    return {
      error: 'paymentMethod must be Cash, UPI/QR, or Card.',
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Order must contain at least one item.' }
  }

  if (items.length > MAX_ORDER_ITEMS) {
    return {
      error: `An order may contain at most ${MAX_ORDER_ITEMS} distinct items.`,
    }
  }

  const normalizedItems = []
  const menuItemIds = new Set()

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `items[${index}] must be an object.` }
    }

    const unsupportedItemField = Object.keys(item).find(
      (field) => !['menuItemId', 'quantity'].includes(field),
    )

    if (unsupportedItemField) {
      return {
        error: `Unsupported field in items[${index}]: ${unsupportedItemField}.`,
      }
    }

    if (
      typeof item.menuItemId !== 'string' ||
      !/^[a-f\d]{24}$/i.test(item.menuItemId) ||
      !mongoose.isValidObjectId(item.menuItemId)
    ) {
      return {
        error: `items[${index}].menuItemId must be a valid menu item ID.`,
      }
    }

    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > MAX_ITEM_QUANTITY
    ) {
      return {
        error: `items[${index}].quantity must be an integer from 1 to ${MAX_ITEM_QUANTITY}.`,
      }
    }

    const menuItemId = item.menuItemId.toLowerCase()

    if (menuItemIds.has(menuItemId)) {
      return {
        error: 'Each menu item may only appear once in the order.',
      }
    }

    menuItemIds.add(menuItemId)

    normalizedItems.push({
      menuItemId,
      quantity: item.quantity,
    })
  }

  return {
    data: {
      customer: normalizedCustomer,
      items: normalizedItems,
      address: address.trim(),
      paymentMethod,
    },
  }
}


// ========================================
// IDEMPOTENCY
// ========================================

const createIdempotencyConflict = (message) =>
  Object.assign(new Error(message), { status: 409 })

const claimIdempotencyRecord = async (keyHash, requestHash) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date()

    let record = await IdempotencyRecord.findOne({ keyHash })

    if (!record) {
      try {
        record = await IdempotencyRecord.create({
          keyHash,
          requestHash,
          operationId: crypto.randomUUID(),
          status: 'processing',
          expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
        })

        return record
      } catch (error) {
        if (error.code !== 11000) throw error
        continue
      }
    }

    if (record.expiresAt <= now) {
      const replacement = await IdempotencyRecord.findOneAndUpdate(
        {
          _id: record._id,
          expiresAt: { $lte: now },
        },
        {
          $set: {
            requestHash,
            operationId: crypto.randomUUID(),
            orderId: null,
            status: 'processing',
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )

      if (replacement) return replacement

      continue
    }

    if (record.requestHash !== requestHash) {
      throw createIdempotencyConflict(
        'Idempotency-Key has already been used for a different order.',
      )
    }

    return record
  }

  throw createIdempotencyConflict(
    'This order request is being processed. Retry with the same Idempotency-Key.',
  )
}


// ========================================
// CREATE OR FIND ORDER
// ========================================

const createOrFindOrder = async (data, operationId) => {
  const session = await mongoose.startSession()

  let result

  try {
    await session.withTransaction(async () => {
      // Check whether this operation already created an order.
      const existingOrder = await Order.findOne({
        idempotencyOperationId: operationId,
      }).session(session)

      if (existingOrder) {
        result = {
          order: existingOrder,
          created: false,
        }

        return
      }

      // Fetch requested menu items from the database.
      const menuItemIds = data.items.map(
        (item) => new mongoose.Types.ObjectId(item.menuItemId),
      )

      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        available: true,
      }).session(session)

      const menuItemsById = new Map(
        menuItems.map((item) => [String(item._id), item]),
      )

      if (menuItemsById.size !== data.items.length) {
        throw Object.assign(
          new Error(
            'One or more menu items do not exist or are unavailable.',
          ),
          { status: 400 },
        )
      }

      // Build order items using trusted database prices.
      const orderItems = data.items.map(({ menuItemId, quantity }) => {
        const menuItem = menuItemsById.get(menuItemId)

        return {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
        }
      })

      const totalAmount = orderItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      )

      if (!Number.isFinite(totalAmount)) {
        throw Object.assign(
          new Error('Order total is invalid.'),
          { status: 400 },
        )
      }

      // Create the order.
      const order = new Order({
        customer: data.customer,
        items: orderItems,
        totalAmount,
        address: data.address,
        paymentMethod: data.paymentMethod,
        status: 'Placed',
        inventoryStatus: 'not_deducted',
        idempotencyOperationId: operationId,
      })

      await order.save({ session })

      // Deduct ingredients using the order's recipes.
      // This function must use the same transaction session.
      await deductIngredientsForOrder({
        menuItems,
        orderItems,
        orderId: order._id,
        operationId,
        session,
      })

      // Mark inventory as deducted only after successful deduction.
      order.inventoryStatus = 'deducted'

      await order.save({ session })

      result = {
        order,
        created: true,
      }
    })

    if (!result) {
      throw new Error('Order transaction did not complete.')
    }

    return result
  } catch (error) {
    // Recover if a simultaneous request already created this order.
    if (error.code === 11000) {
      const duplicateOrder = await Order.findOne({
        idempotencyOperationId: operationId,
      })

      if (duplicateOrder) {
        return {
          order: duplicateOrder,
          created: false,
        }
      }
    }

    throw error
  } finally {
    await session.endSession()
  }
}


// ========================================
// ORDER RESPONSE
// ========================================

const createOrderResponse = (order) => ({
  order,
  trackingId: String(order._id),

  trackingToken: jwt.sign(
    {
      orderId: String(order._id),
      purpose: 'order-tracking',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    },
  ),
})


// ========================================
// PLACE ORDER
// ========================================

const placeOrder = async (req, res, next) => {
  const idempotencyKey = req.get('Idempotency-Key')

  if (
    typeof idempotencyKey !== 'string' ||
    !/^[A-Za-z0-9._~-]{8,128}$/.test(idempotencyKey)
  ) {
    return res.status(400).json({
      message:
        'Idempotency-Key is required and must be 8-128 URL-safe characters.',
    })
  }

  const validation = validateOrderInput(req.body)

  if (validation.error) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: 'Order tracking is not configured.',
    })
  }

  const data = validation.data

  const keyHash = crypto
    .createHash('sha256')
    .update(idempotencyKey)
    .digest('hex')

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')

  try {
    const record = await claimIdempotencyRecord(keyHash, requestHash)

    // Return the existing order if the operation is completed.
    if (record.status === 'completed') {
      const order = await Order.findById(record.orderId)

      if (!order) {
        return res.status(500).json({
          message: 'An internal server error occurred.',
        })
      }

      return res.status(200).json(createOrderResponse(order))
    }

    const { order, created } = await createOrFindOrder(
      data,
      record.operationId,
    )

    // Mark the idempotency record completed.
    await IdempotencyRecord.updateOne(
      {
        _id: record._id,
        keyHash,
        requestHash,
        operationId: record.operationId,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          orderId: order._id,
          status: 'completed',
        },
      },
    )

    return res
      .status(created ? 201 : 200)
      .json(createOrderResponse(order))
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      return res.status(error.status).json({
        message: error.message,
      })
    }

    return next(error)
  }
}


// ========================================
// TRACK ORDER
// ========================================

const trackOrder = async (req, res, next) => {
  const { id: requestedId } = req.params

  if (
    !/^[a-f\d]{24}$/i.test(requestedId) ||
    !mongoose.Types.ObjectId.isValid(requestedId)
  ) {
    return res.status(400).json({
      message: 'Invalid order ID.',
    })
  }

  const id = requestedId.toLowerCase()

  const authorization = req.get('Authorization')
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    return res.status(401).json({
      message: 'A valid order tracking token is required.',
    })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: 'Order tracking is not configured.',
    })
  }

  let payload

  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired order tracking token.',
    })
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.purpose !== 'order-tracking' ||
    payload.orderId !== id
  ) {
    return res.status(401).json({
      message: 'Invalid or expired order tracking token.',
    })
  }

  try {
    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.',
      })
    }

    return res.json({
      trackingId: String(order._id),
      order,
    })
  } catch (error) {
    return next(error)
  }
}


// ========================================
// EXPORT CONTROLLERS
// ========================================

module.exports = {
  placeOrder,
  trackOrder,
}

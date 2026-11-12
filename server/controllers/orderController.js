const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const MenuItem = require('../models/MenuItem')
const Order = require('../models/Order')

const idempotencyEntries = new Map()
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_IDEMPOTENCY_ENTRIES = 1000
const requestFields = new Set(['customer', 'items', 'address', 'paymentMethod'])

const validateOrderInput = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' }
  }

  const unsupportedField = Object.keys(body).find((field) => !requestFields.has(field))
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
    return { error: `Unsupported customer field: ${unsupportedCustomerField}.` }
  }

  const normalizedCustomer = {}
  for (const field of ['name', 'phone']) {
    if (typeof customer[field] !== 'string' || customer[field].trim().length === 0) {
      return { error: `customer.${field} must be a non-empty string.` }
    }
    normalizedCustomer[field] = customer[field].trim()
  }
  if (customer.email !== undefined) {
    if (
      typeof customer.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
    ) {
      return { error: 'customer.email must be a valid email address.' }
    }
    normalizedCustomer.email = customer.email.trim().toLowerCase()
  }

  if (typeof address !== 'string' || address.trim().length === 0) {
    return { error: 'address must be a non-empty string.' }
  }
  if (typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
    return { error: 'paymentMethod must be a non-empty string.' }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Order must contain at least one item.' }
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
      return { error: `Unsupported field in items[${index}]: ${unsupportedItemField}.` }
    }
    if (typeof item.menuItemId !== 'string' || !/^[a-f\d]{24}$/i.test(item.menuItemId)) {
      return { error: `items[${index}].menuItemId must be a valid menu item ID.` }
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      return { error: `items[${index}].quantity must be a positive integer.` }
    }

    const menuItemId = item.menuItemId.toLowerCase()
    if (menuItemIds.has(menuItemId)) {
      return { error: 'Each menu item may only appear once in the order.' }
    }
    menuItemIds.add(menuItemId)
    normalizedItems.push({ menuItemId, quantity: item.quantity })
  }

  return {
    data: {
      customer: normalizedCustomer,
      items: normalizedItems,
      address: address.trim(),
      paymentMethod: paymentMethod.trim(),
    },
  }
}

const pruneIdempotencyEntries = (now) => {
  for (const [key, entry] of idempotencyEntries) {
    if (!entry.pending && entry.expiresAt <= now) {
      idempotencyEntries.delete(key)
    }
  }

  while (idempotencyEntries.size >= MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = idempotencyEntries.keys().next().value
    const oldestEntry = idempotencyEntries.get(oldestKey)
    if (oldestEntry.pending) {
      break
    }
    idempotencyEntries.delete(oldestKey)
  }
}

const createOrder = async (data) => {
  const menuItemIds = data.items.map((item) => new mongoose.Types.ObjectId(item.menuItemId))
  const menuItems = await MenuItem.find({
    _id: { $in: menuItemIds },
    available: true,
  })
  const menuItemsById = new Map(menuItems.map((item) => [String(item._id), item]))

  if (menuItemsById.size !== data.items.length) {
    throw Object.assign(new Error('One or more menu items do not exist or are unavailable.'), {
      status: 400,
    })
  }

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

  const order = await Order.create({
    customer: data.customer,
    items: orderItems,
    totalAmount,
    address: data.address,
    paymentMethod: data.paymentMethod,
    status: 'Placed',
  })
  const trackingToken = jwt.sign(
    { orderId: String(order._id), purpose: 'order-tracking' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  )

  return { order, trackingId: String(order._id), trackingToken }
}

const placeOrder = async (req, res, next) => {
  const validation = validateOrderInput(req.body)
  if (validation.error) {
    return res.status(400).json({ message: validation.error })
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Order tracking is not configured.' })
  }

  const idempotencyKey = req.get('Idempotency-Key')
  if (
    idempotencyKey !== undefined &&
    (idempotencyKey.length === 0 || idempotencyKey.length > 128 || /[\r\n]/.test(idempotencyKey))
  ) {
    return res.status(400).json({ message: 'Idempotency-Key must be 1-128 characters.' })
  }

  const data = validation.data
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')

  try {
    if (idempotencyKey) {
      pruneIdempotencyEntries(Date.now())
      const existing = idempotencyEntries.get(idempotencyKey)
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return res.status(409).json({
            message: 'Idempotency-Key has already been used for a different order.',
          })
        }
        const result = await existing.promise
        return res.status(200).json(result)
      }

      const entry = {
        fingerprint,
        pending: true,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      }
      entry.promise = createOrder(data)
      idempotencyEntries.set(idempotencyKey, entry)
      try {
        const result = await entry.promise
        entry.pending = false
        return res.status(201).json(result)
      } catch (error) {
        idempotencyEntries.delete(idempotencyKey)
        throw error
      }
    }

    const result = await createOrder(data)
    return res.status(201).json(result)
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message })
    }
    return next(error)
  }
}

const trackOrder = async (req, res, next) => {
  const { id: requestedId } = req.params
  if (!/^[a-f\d]{24}$/i.test(requestedId) || !mongoose.Types.ObjectId.isValid(requestedId)) {
    return res.status(400).json({ message: 'Invalid order ID.' })
  }
  const id = requestedId.toLowerCase()

  const authorization = req.get('Authorization')
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i)
  if (!match) {
    return res.status(401).json({ message: 'A valid order tracking token is required.' })
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Order tracking is not configured.' })
  }

  let payload
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Invalid or expired order tracking token.' })
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.purpose !== 'order-tracking' ||
    payload.orderId !== id
  ) {
    return res.status(401).json({ message: 'Invalid or expired order tracking token.' })
  }

  try {
    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' })
    }
    return res.json({ trackingId: String(order._id), order })
  } catch (error) {
    return next(error)
  }
}

module.exports = { placeOrder, trackOrder }

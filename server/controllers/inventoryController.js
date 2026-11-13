
const mongoose = require('mongoose')
const crypto = require('node:crypto')

const Inventory = require('../models/Inventory')
const InventoryLog = require('../models/InventoryLog')

const VALID_UNITS = ['g', 'ml', 'piece']

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

// ========================================
// GET ALL INVENTORY
// ========================================

const getAllInventory = async (req, res, next) => {
  try {
    const items = await Inventory.find()
      .sort({ category: 1, name: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    })
  } catch (error) {
    return next(error)
  }
}

// ========================================
// CREATE INVENTORY ITEM
// ========================================

const createInventoryItem = async (req, res, next) => {
  try {
    const { name, category, unit, lowStockThreshold } = req.body

    const allowedFields = [
      'name',
      'category',
      'unit',
      'lowStockThreshold',
    ]

    const unsupportedField = Object.keys(req.body).find(
      (field) => !allowedFields.includes(field),
    )

    if (unsupportedField) {
      return res.status(400).json({
        success: false,
        message: `Unsupported field: ${unsupportedField}.`,
      })
    }

    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required.',
      })
    }

    if (
      typeof unit !== 'string' ||
      !VALID_UNITS.includes(unit)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Unit must be g, ml, or piece.',
      })
    }

    if (
      category !== undefined &&
      (typeof category !== 'string' || !category.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Category must be a non-empty string.',
      })
    }

    if (
      lowStockThreshold !== undefined &&
      (
        typeof lowStockThreshold !== 'number' ||
        !Number.isFinite(lowStockThreshold) ||
        lowStockThreshold < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Low-stock threshold must be a non-negative number.',
      })
    }

    const item = await Inventory.create({
      name: name.trim(),
      category: category?.trim() || 'General',
      unit,
      currentStock: 0,
      lowStockThreshold: lowStockThreshold ?? 0,
    })

    return res.status(201).json({
      success: true,
      message: 'Inventory item created successfully.',
      item,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An ingredient with this name already exists.',
      })
    }

    return next(error)
  }
}

// ========================================
// UPDATE INVENTORY ITEM DETAILS
// ========================================

const updateInventoryItem = async (req, res, next) => {
  const { id } = req.params

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid inventory item ID.',
    })
  }

  try {
    const allowedFields = [
      'name',
      'category',
      'lowStockThreshold',
    ]

    const updates = {}

    for (const field of Object.keys(req.body)) {
      if (!allowedFields.includes(field)) {
        return res.status(400).json({
          success: false,
          message: `Field ${field} cannot be updated through this endpoint.`,
        })
      }

      updates[field] = req.body[field]
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update.',
      })
    }

    if (
      updates.name !== undefined &&
      (
        typeof updates.name !== 'string' ||
        !updates.name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name cannot be empty.',
      })
    }

    if (updates.name !== undefined) {
      updates.name = updates.name.trim()
    }

    if (
      updates.category !== undefined &&
      (
        typeof updates.category !== 'string' ||
        !updates.category.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be empty.',
      })
    }

    if (updates.category !== undefined) {
      updates.category = updates.category.trim()
    }

    if (
      updates.lowStockThreshold !== undefined &&
      (
        typeof updates.lowStockThreshold !== 'number' ||
        !Number.isFinite(updates.lowStockThreshold) ||
        updates.lowStockThreshold < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Low-stock threshold must be non-negative.',
      })
    }

    const item = await Inventory.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully.',
      item,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An ingredient with this name already exists.',
      })
    }

    return next(error)
  }
}

// ========================================
// RESTOCK INVENTORY
// ========================================

const restockInventory = async (req, res, next) => {
  const { id } = req.params
  const { quantity, note } = req.body

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid inventory item ID.',
    })
  }

  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Restock quantity must be a positive number.',
    })
  }

  if (
    note !== undefined &&
    (typeof note !== 'string' || note.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Note must be a string of at most 500 characters.',
    })
  }

  const session = await mongoose.startSession()

  try {
    let updatedItem

    await session.withTransaction(async () => {
      updatedItem = await Inventory.findByIdAndUpdate(
        id,
        {
          $inc: { currentStock: quantity },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      )

      if (!updatedItem) {
        throw Object.assign(
          new Error('Inventory item not found.'),
          { status: 404 },
        )
      }

      await InventoryLog.create(
        [{
          inventoryItem: updatedItem._id,
          action: 'restock',
          quantity,
          unit: updatedItem.unit,
          operationKey: `manual-restock:${crypto.randomUUID()}`,
          note: note?.trim() || 'Manual inventory restock',
        }],
        { session },
      )
    })

    return res.status(200).json({
      success: true,
      message: 'Inventory restocked successfully.',
      item: updatedItem,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    return next(error)
  } finally {
    await session.endSession()
  }
}

// ========================================
// GET INVENTORY LOGS
// ========================================

const getInventoryLogs = async (req, res, next) => {
  const { id } = req.params

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid inventory item ID.',
    })
  }

  try {
    const item = await Inventory.findById(id).lean()

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      })
    }

    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Page must be positive and limit must be between 1 and 100.',
      })
    }

    const filter = { inventoryItem: id }

    const [logs, total] = await Promise.all([
      InventoryLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      InventoryLog.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      item,
      count: logs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs,
    })
  } catch (error) {
    return next(error)
  }
}

// ========================================
// GET LOW STOCK ITEMS
// ========================================

const getLowStockItems = async (req, res, next) => {
  try {
    const items = await Inventory.find({
      $expr: {
        $lte: ['$currentStock', '$lowStockThreshold'],
      },
    })
      .sort({ currentStock: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getAllInventory,
  createInventoryItem,
  updateInventoryItem,
  restockInventory,
  getInventoryLogs,
  getLowStockItems,
}

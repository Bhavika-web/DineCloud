
const mongoose = require('mongoose')
const Inventory = require('../models/Inventory')
const InventoryLog = require('../models/InventoryLog')

// ========================================
// DEDUCT INGREDIENTS FOR AN ORDER
// Must run inside a MongoDB transaction.
// ========================================

const deductIngredientsForOrder = async ({
  menuItems,
  orderItems,
  orderId,
  operationId,
  session,
}) => {
  if (!session) {
    throw new Error('MongoDB transaction session is required.')
  }

  const menuItemsById = new Map(
    menuItems.map((item) => [String(item._id), item]),
  )

  const requiredIngredients = new Map()

  // Calculate total ingredient requirements.
  for (const orderItem of orderItems) {
    const menuItem = menuItemsById.get(
      String(orderItem.menuItemId),
    )

    if (!menuItem || !Array.isArray(menuItem.recipe) ||
        menuItem.recipe.length === 0) {
      throw Object.assign(
        new Error(
          `Recipe is missing for ${orderItem.name}. Configure its ingredients before accepting orders.`,
        ),
        { status: 409 },
      )
    }

    for (const ingredient of menuItem.recipe) {
      if (
        !ingredient.inventoryItem ||
        !mongoose.Types.ObjectId.isValid(
          ingredient.inventoryItem,
        )
      ) {
        throw Object.assign(
          new Error(
            `Invalid inventory reference in recipe for ${orderItem.name}.`,
          ),
          { status: 409 },
        )
      }

      const inventoryId = String(ingredient.inventoryItem)
      const requiredQuantity =
        ingredient.quantity * orderItem.quantity

      if (
        !Number.isFinite(requiredQuantity) ||
        requiredQuantity <= 0
      ) {
        throw Object.assign(
          new Error(
            `Invalid recipe quantity for ${orderItem.name}.`,
          ),
          { status: 409 },
        )
      }

      const existing = requiredIngredients.get(inventoryId)

      if (existing) {
        existing.quantity += requiredQuantity
      } else {
        requiredIngredients.set(inventoryId, {
          inventoryId,
          quantity: requiredQuantity,
        })
      }
    }
  }

  // Prevent accidental duplicate deduction for the same order.
  const existingDeduction = await InventoryLog.findOne({
    orderId,
    action: 'deduction',
  }).session(session)

  if (existingDeduction) {
    throw Object.assign(
      new Error(
        'Inventory has already been deducted for this order.',
      ),
      { status: 409 },
    )
  }

  const logs = []

  // Atomically deduct each ingredient.
  for (const ingredient of requiredIngredients.values()) {
    if (
      !Number.isFinite(ingredient.quantity) ||
      ingredient.quantity <= 0
    ) {
      throw Object.assign(
        new Error('Invalid total ingredient quantity.'),
        { status: 409 },
      )
    }

    const inventoryItem = await Inventory.findOneAndUpdate(
      {
        _id: ingredient.inventoryId,
        currentStock: { $gte: ingredient.quantity },
      },
      {
        $inc: {
          currentStock: -ingredient.quantity,
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    )

    if (!inventoryItem) {
      const existingItem = await Inventory.findById(
        ingredient.inventoryId,
      ).session(session)

      if (!existingItem) {
        throw Object.assign(
          new Error(
            'An ingredient referenced in a recipe does not exist in inventory.',
          ),
          { status: 409 },
        )
      }

      throw Object.assign(
        new Error(
          `Insufficient stock for ${existingItem.name}. Available: ${existingItem.currentStock} ${existingItem.unit}, Required: ${ingredient.quantity} ${existingItem.unit}.`,
        ),
        { status: 409 },
      )
    }

    logs.push({
      inventoryItem: inventoryItem._id,
      orderId,
      action: 'deduction',
      quantity: ingredient.quantity,
      unit: inventoryItem.unit,
      operationKey: `order:${operationId}:deduction:${ingredient.inventoryId}`,
      note: `Ingredient consumed for order ${orderId}`,
    })
  }

  if (logs.length > 0) {
    await InventoryLog.create(logs, { session })
  }
}


// ========================================
// RESTORE INGREDIENTS ON CANCELLATION
// Must run inside the cancellation transaction.
// ========================================

const restoreIngredientsForOrder = async ({
  orderId,
  session,
}) => {
  if (!session) {
    throw new Error('MongoDB transaction session is required.')
  }

  const deductions = await InventoryLog.find({
    orderId,
    action: 'deduction',
  }).session(session)

  if (deductions.length === 0) {
    throw Object.assign(
      new Error(
        'No inventory deduction records were found for this order. Manual review is required.',
      ),
      { status: 409 },
    )
  }

  // Prevent duplicate restoration.
  const existingRestoration = await InventoryLog.findOne({
    orderId,
    action: 'restoration',
  }).session(session)

  if (existingRestoration) {
    throw Object.assign(
      new Error(
        'Inventory has already been restored for this order.',
      ),
      { status: 409 },
    )
  }

  const restorationLogs = []

  for (const deduction of deductions) {
    const inventoryItem = await Inventory.findByIdAndUpdate(
      deduction.inventoryItem,
      {
        $inc: {
          currentStock: deduction.quantity,
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    )

    if (!inventoryItem) {
      throw Object.assign(
        new Error(
          'An ingredient could not be found while restoring stock.',
        ),
        { status: 409 },
      )
    }

    restorationLogs.push({
      inventoryItem: deduction.inventoryItem,
      orderId,
      action: 'restoration',
      quantity: deduction.quantity,
      unit: deduction.unit,
      operationKey: `order:${orderId}:restoration:${String(deduction.inventoryItem)}`,
      note: `Stock restored after cancellation of order ${orderId}`,
    })
  }

  if (restorationLogs.length > 0) {
    await InventoryLog.create(restorationLogs, { session })
  }
}

module.exports = {
  deductIngredientsForOrder,
  restoreIngredientsForOrder,
}

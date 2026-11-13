
const Inventory = require('../models/Inventory')
const InventoryLog = require('../models/InventoryLog')

// Deduct all ingredients required for an order.
// Must be called inside a MongoDB transaction.
const deductIngredientsForOrder = async ({
  menuItems,
  orderItems,
  orderId,
  operationId,
  session,
}) => {
  const menuItemsById = new Map(
    menuItems.map((item) => [String(item._id), item]),
  )

  // Aggregate ingredient quantities across all ordered menu items.
  const requiredIngredients = new Map()

  for (const orderItem of orderItems) {
    const menuItem = menuItemsById.get(String(orderItem.menuItemId))

    if (!menuItem || !menuItem.recipe || menuItem.recipe.length === 0) {
      throw Object.assign(
        new Error(
          `Recipe is missing for ${orderItem.name}. Configure its ingredients before accepting orders.`,
        ),
        { status: 409 },
      )
    }

    for (const ingredient of menuItem.recipe) {
      const inventoryId = String(ingredient.inventoryItem)
      const requiredQuantity = ingredient.quantity * orderItem.quantity

      if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
        throw Object.assign(
          new Error(`Invalid recipe quantity for ${orderItem.name}.`),
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

  const logs = []

  // Deduct each ingredient only if sufficient stock exists.
  for (const ingredient of requiredIngredients.values()) {
    if (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) {
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
        $inc: { currentStock: -ingredient.quantity },
      },
      {
        new: true,
        session,
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


// Restore ingredients when an order is cancelled.
// Must be called inside the same transaction as the order cancellation.
const restoreIngredientsForOrder = async ({ orderId, session }) => {
  const deductions = await InventoryLog.find({
    orderId,
    action: 'deduction',
  }).session(session)

  // Never silently cancel an order when its inventory history is missing.
  if (deductions.length === 0) {
    throw Object.assign(
      new Error(
        'No inventory deduction records were found for this order. Manual review is required before cancellation.',
      ),
      { status: 409 },
    )
  }

  // Prevent restoring the same order more than once.
  const existingRestoration = await InventoryLog.findOne({
    orderId,
    action: 'restoration',
  }).session(session)

  if (existingRestoration) {
    throw Object.assign(
      new Error('Inventory has already been restored for this order.'),
      { status: 409 },
    )
  }

  const restorationLogs = []

  for (const deduction of deductions) {
    const inventoryItem = await Inventory.findByIdAndUpdate(
      deduction.inventoryItem,
      {
        $inc: { currentStock: deduction.quantity },
      },
      {
        new: true,
        session,
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

  await InventoryLog.create(restorationLogs, { session })
}


module.exports = {
  deductIngredientsForOrder,
  restoreIngredientsForOrder,
}

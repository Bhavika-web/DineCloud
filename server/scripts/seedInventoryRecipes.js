
require('dotenv').config()

const mongoose = require('mongoose')
const Inventory = require('../models/Inventory')
const MenuItem = require('../models/MenuItem')

const ingredients = [
  // Burgers
  { name: 'Burger Bun', category: 'Bakery', unit: 'piece', lowStockThreshold: 10 },
  { name: 'Burger Patty', category: 'Meat', unit: 'piece', lowStockThreshold: 10 },
  { name: 'Veg Patty', category: 'Vegetables', unit: 'piece', lowStockThreshold: 10 },
  { name: 'Cheddar Cheese', category: 'Dairy', unit: 'g', lowStockThreshold: 500 },
  { name: 'Lettuce', category: 'Vegetables', unit: 'g', lowStockThreshold: 200 },
  { name: 'Tomato', category: 'Vegetables', unit: 'g', lowStockThreshold: 500 },
  { name: 'Onion', category: 'Vegetables', unit: 'g', lowStockThreshold: 500 },
  { name: 'House Sauce', category: 'Sauces', unit: 'ml', lowStockThreshold: 200 },
  { name: 'Herb Mayo', category: 'Sauces', unit: 'ml', lowStockThreshold: 200 },

  // Pizzas
  { name: 'Pizza Dough', category: 'Bakery', unit: 'piece', lowStockThreshold: 10 },
  { name: 'Mozzarella', category: 'Dairy', unit: 'g', lowStockThreshold: 500 },
  { name: 'Basil', category: 'Vegetables', unit: 'g', lowStockThreshold: 50 },
  { name: 'Pizza Sauce', category: 'Sauces', unit: 'ml', lowStockThreshold: 500 },
  { name: 'Bell Peppers', category: 'Vegetables', unit: 'g', lowStockThreshold: 300 },
  { name: 'Olives', category: 'Vegetables', unit: 'g', lowStockThreshold: 100 },

  // Pasta
  { name: 'Penne Pasta', category: 'Grains', unit: 'g', lowStockThreshold: 500 },
  { name: 'Cream', category: 'Dairy', unit: 'ml', lowStockThreshold: 500 },
  { name: 'Mushrooms', category: 'Vegetables', unit: 'g', lowStockThreshold: 300 },
  { name: 'Parmesan', category: 'Dairy', unit: 'g', lowStockThreshold: 200 },
  { name: 'Garlic', category: 'Vegetables', unit: 'g', lowStockThreshold: 100 },
  { name: 'Tomato Puree', category: 'Sauces', unit: 'ml', lowStockThreshold: 500 },
  { name: 'Mixed Herbs', category: 'Spices', unit: 'g', lowStockThreshold: 50 },

  // Main course
  { name: 'Chicken', category: 'Meat', unit: 'g', lowStockThreshold: 500 },
  { name: 'Paneer', category: 'Dairy', unit: 'g', lowStockThreshold: 500 },
  { name: 'Butter', category: 'Dairy', unit: 'g', lowStockThreshold: 300 },
  { name: 'Ginger Garlic Paste', category: 'Spices', unit: 'g', lowStockThreshold: 200 },
  { name: 'Cooking Cream', category: 'Dairy', unit: 'ml', lowStockThreshold: 500 },
  { name: 'Naan', category: 'Bakery', unit: 'piece', lowStockThreshold: 10 },

  // Desserts
  { name: 'Tart Shell', category: 'Bakery', unit: 'piece', lowStockThreshold: 10 },
  { name: 'Pistachio Cream', category: 'Dessert', unit: 'g', lowStockThreshold: 200 },
  { name: 'Chocolate', category: 'Dessert', unit: 'g', lowStockThreshold: 500 },
  { name: 'Cocoa Powder', category: 'Dessert', unit: 'g', lowStockThreshold: 200 },

  // Drinks
  { name: 'Espresso', category: 'Beverages', unit: 'ml', lowStockThreshold: 200 },
  { name: 'Milk', category: 'Dairy', unit: 'ml', lowStockThreshold: 1000 },
  { name: 'Cardamom', category: 'Spices', unit: 'g', lowStockThreshold: 50 },
  { name: 'Mango Pulp', category: 'Beverages', unit: 'ml', lowStockThreshold: 500 },
  { name: 'Mint', category: 'Vegetables', unit: 'g', lowStockThreshold: 100 },
  { name: 'Lime', category: 'Vegetables', unit: 'piece', lowStockThreshold: 10 },
]

// Quantities are for ONE serving of each menu item.
// Verify these against your actual kitchen recipes before using live stock.
const recipes = {
  'Smoky House Burger': [
    ['Burger Bun', 1],
    ['Burger Patty', 1],
    ['Cheddar Cheese', 30],
    ['Lettuce', 15],
    ['Tomato', 20],
    ['Onion', 20],
    ['House Sauce', 20],
  ],

  'Crispy Garden Burger': [
    ['Burger Bun', 1],
    ['Veg Patty', 1],
    ['Lettuce', 20],
    ['Tomato', 25],
    ['Herb Mayo', 25],
  ],

  'Garden Margherita Pizza': [
    ['Pizza Dough', 1],
    ['Mozzarella', 100],
    ['Basil', 5],
    ['Pizza Sauce', 60],
  ],

  'Roasted Veggie Pizza': [
    ['Pizza Dough', 1],
    ['Mozzarella', 100],
    ['Bell Peppers', 40],
    ['Olives', 20],
    ['Onion', 30],
    ['Pizza Sauce', 60],
  ],

  'Truffle Cream Pasta': [
    ['Penne Pasta', 120],
    ['Cream', 80],
    ['Mushrooms', 50],
    ['Parmesan', 20],
    ['Garlic', 5],
  ],

  'Roasted Tomato Penne': [
    ['Penne Pasta', 120],
    ['Tomato Puree', 100],
    ['Garlic', 5],
    ['Mixed Herbs', 3],
    ['Parmesan', 20],
  ],

  'Old Delhi Butter Chicken': [
    ['Chicken', 180],
    ['Tomato Puree', 100],
    ['Butter', 25],
    ['Ginger Garlic Paste', 15],
    ['Cooking Cream', 40],
    ['Naan', 1],
  ],

  'Paneer Tikka Masala': [
    ['Paneer', 180],
    ['Tomato Puree', 100],
    ['Butter', 20],
    ['Ginger Garlic Paste', 15],
    ['Cooking Cream', 40],
  ],

  'Pistachio Rose Tart': [
    ['Tart Shell', 1],
    ['Pistachio Cream', 70],
  ],

  'Belgian Chocolate Brownie': [
    ['Chocolate', 80],
    ['Butter', 30],
    ['Cocoa Powder', 10],
  ],

  'Iced Cardamom Latte': [
    ['Espresso', 40],
    ['Milk', 180],
    ['Cardamom', 1],
  ],

  'Mango Mint Cooler': [
    ['Mango Pulp', 100],
    ['Mint', 5],
    ['Lime', 1],
  ],
}

const seedInventoryRecipes = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error(
        'MONGO_URI or MONGODB_URI is missing from your .env file.',
      )
    }

    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB.')

    // Create ingredients without resetting existing stock.
    const inventoryMap = new Map()

    for (const ingredient of ingredients) {
      const inventoryItem = await Inventory.findOneAndUpdate(
        { name: ingredient.name },
        {
          $setOnInsert: {
            ...ingredient,
            currentStock: 0,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )

      inventoryMap.set(ingredient.name, inventoryItem._id)
    }

    console.log(`Processed ${inventoryMap.size} inventory ingredients.`)

    // Attach recipes to existing menu items.
    for (const [menuItemName, recipeIngredients] of Object.entries(recipes)) {
      const menuItem = await MenuItem.findOne({
        name: menuItemName,
      })

      if (!menuItem) {
        throw new Error(
          `Menu item not found in database: ${menuItemName}`,
        )
      }

      const recipe = recipeIngredients.map(([name, quantity]) => {
        const inventoryItemId = inventoryMap.get(name)

        if (!inventoryItemId) {
          throw new Error(
            `Inventory ingredient not found: ${name}`,
          )
        }

        return {
          inventoryItem: inventoryItemId,
          quantity,
        }
      })

      menuItem.recipe = recipe
      await menuItem.save()

      console.log(`Recipe configured: ${menuItemName}`)
    }

    console.log('Inventory and recipes seeded successfully.')
  } catch (error) {
    console.error('Seeding failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

seedInventoryRecipes()

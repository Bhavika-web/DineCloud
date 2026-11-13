
const mongoose = require('mongoose')

// Ingredients required to prepare one serving of a menu item
const recipeIngredientSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
  },
  { _id: false },
)

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    available: {
      type: Boolean,
      default: true,
    },

    // Ingredients required for one serving
    recipe: {
      type: [recipeIngredientSchema],
      default: [],
    },
  },
  { timestamps: true },
)

module.exports =
  mongoose.models.MenuItem ||
  mongoose.model('MenuItem', menuItemSchema)

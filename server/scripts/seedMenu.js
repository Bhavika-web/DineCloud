const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const connectDB = require('../config/db')
const MenuItem = require('../models/MenuItem')
const mongoose = require('mongoose')

const menuItems = [
  {
    name: 'Smoky House Burger',
    description: 'Grilled patty, smoked cheddar, caramelized onions and house sauce.',
    price: 349,
    category: 'Burgers',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480214/Burger.jpg',
    available: true,
  },
  {
    name: 'Crispy Garden Burger',
    description: 'Crisp vegetable patty with lettuce, tomato and tangy herb mayo.',
    price: 279,
    category: 'Burgers',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480214/Burger.jpg',
    available: true,
  },
  {
    name: 'Garden Margherita Pizza',
    description: 'Stone-baked crust topped with mozzarella, basil and tomato sauce.',
    price: 399,
    category: 'Pizza',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480214/Pizza.jpg',
    available: true,
  },
  {
    name: 'Roasted Veggie Pizza',
    description: 'Roasted peppers, olives, onions and mozzarella on a crisp crust.',
    price: 469,
    category: 'Pizza',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480214/Pizza.jpg',
    available: true,
  },
  {
    name: 'Truffle Cream Pasta',
    description: 'Penne tossed in a silky cream sauce with mushrooms and parmesan.',
    price: 429,
    category: 'Pasta',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794479492/pasta.jpg',
    available: true,
  },
  {
    name: 'Roasted Tomato Penne',
    description: 'Penne with slow-roasted tomato, garlic, herbs and parmesan.',
    price: 369,
    category: 'Pasta',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794479492/pasta.jpg',
    available: true,
  },
  {
    name: 'Old Delhi Butter Chicken',
    description: 'Tender chicken in a rich tomato and butter gravy, served with naan.',
    price: 489,
    category: 'Indian',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480039/Indian.jpg',
    available: true,
  },
  {
    name: 'Paneer Tikka Masala',
    description: 'Chargrilled paneer in a gently spiced creamy masala sauce.',
    price: 399,
    category: 'Indian',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480039/Indian.jpg',
    available: true,
  },
  {
    name: 'Pistachio Rose Tart',
    description: 'Buttery tart filled with pistachio cream and fragrant rose.',
    price: 249,
    category: 'Desserts',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480040/Dessert.jpg',
    available: true,
  },
  {
    name: 'Belgian Chocolate Brownie',
    description: 'Warm, fudgy chocolate brownie finished with a cocoa dusting.',
    price: 199,
    category: 'Desserts',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480040/Dessert.jpg',
    available: true,
  },
  {
    name: 'Iced Cardamom Latte',
    description: 'Chilled espresso and milk with a delicate hint of green cardamom.',
    price: 189,
    category: 'Beverages',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480039/Beverages.jpg',
    available: true,
  },
  {
    name: 'Mango Mint Cooler',
    description: 'A refreshing mango cooler blended with lime and fresh mint.',
    price: 169,
    category: 'Beverages',
    image: 'https://res.cloudinary.com/hshcn4ew/image/upload/v1794480039/Beverages.jpg',
    available: true,
  },
]

const seedMenu = async () => {
  await connectDB()

  let insertedCount = 0
  let existingCount = 0

  for (const item of menuItems) {
    const result = await MenuItem.updateOne(
      { name: item.name, category: item.category },
      { $setOnInsert: item },
      { upsert: true, runValidators: true },
    )

    if (result.upsertedCount > 0) {
      insertedCount += 1
      console.log(`Added menu item: ${item.name}`)
    } else {
      existingCount += 1
      console.log(`Kept existing menu item: ${item.name}`)
    }
  }

  console.log(`Menu seed complete: ${insertedCount} added, ${existingCount} already existed.`)
}

seedMenu()
  .catch((error) => {
    console.error(`Menu seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })

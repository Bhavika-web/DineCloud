const MenuItem = require('../models/MenuItem')

const getMenuItems = async (req, res, next) => {
  try {
    const items = await MenuItem.find({ available: true })
    res.json(items)
  } catch (error) {
    next(error)
  }
}

const getMenuItemById = async (req, res, next) => {
  const { id } = req.params
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ message: 'Invalid menu item ID.' })
  }

  try {
    const item = await MenuItem.findOne({ _id: id, available: true })
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found.' })
    }
    return res.json(item)
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getMenuItems,
  getMenuItemById,
}

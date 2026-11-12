const express = require('express')
const { getMenuItemById, getMenuItems } = require('../controllers/menuController')

const router = express.Router()

router.get('/', getMenuItems)
router.get('/:id', getMenuItemById)

module.exports = router

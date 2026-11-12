import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { refreshMenuItems } from '../api/menu'
import CartContext from './cartStore'

const STORAGE_KEY = 'dinecloud-customer-cart'
const MAX_ITEM_QUANTITY = 10
const isMongoObjectId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)

const isMongoMenuItem = (item) => (
  isMongoObjectId(item?.id) &&
  isMongoObjectId(item?._id) &&
  item.id.toLowerCase() === item._id.toLowerCase()
)

const isValidStoredItem = (item) => (
  item &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.name === 'string' &&
  typeof item.description === 'string' &&
  typeof item.category === 'string' &&
  typeof item.price === 'number' &&
  Number.isFinite(item.price) &&
  item.price >= 0 &&
  Number.isSafeInteger(item.quantity) &&
  item.quantity > 0
)

const reconcileCart = (items, menuItems) => {
  const menuById = new Map(
    menuItems
      .filter((item) => isMongoMenuItem(item) && Number.isFinite(item.price) && item.price >= 0)
      .map((item) => [item.id.toLowerCase(), item]),
  )
  const priceChangedItems = []
  const reconciledItems = items.map((item) => {
    if (item.isLegacy || !isMongoMenuItem(item)) return item

    const latestItem = menuById.get(item.id.toLowerCase())
    if (!latestItem) {
      return { ...item, isUnavailable: true }
    }

    const priceChanged = item.price !== latestItem.price
    if (priceChanged) priceChangedItems.push(latestItem.name)

    return {
      ...item,
      ...latestItem,
      id: item.id,
      _id: item._id,
      quantity: item.quantity,
      image: typeof latestItem.image === 'string' ? latestItem.image : '',
      emoji: typeof latestItem.emoji === 'string' ? latestItem.emoji : '🍽️',
      isLegacy: false,
      isUnavailable: false,
      priceChanged: item.priceChanged || priceChanged,
      previousPrice: priceChanged ? item.price : item.previousPrice,
    }
  })

  return {
    items: reconciledItems,
    priceChangedItems,
    hasUnavailableItems: reconciledItems.some((item) => item.isUnavailable),
    hasLegacyItems: reconciledItems.some((item) => item.isLegacy),
  }
}

const restoreCart = () => {
  try {
    const storedCart = localStorage.getItem(STORAGE_KEY)
    if (!storedCart) return []

    const parsedCart = JSON.parse(storedCart)
    if (!Array.isArray(parsedCart)) return []

    const validItems = parsedCart.filter(isValidStoredItem)
    const uniqueItems = new Map()
    validItems.forEach((item) => {
      const currentItem = uniqueItems.get(item.id)
      if (currentItem) {
        currentItem.quantity = Math.min(MAX_ITEM_QUANTITY, currentItem.quantity + item.quantity)
      } else {
        uniqueItems.set(item.id, {
          ...item,
          quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity),
          image: typeof item.image === 'string' ? item.image : '',
          emoji: typeof item.emoji === 'string' ? item.emoji : '🍽️',
          isLegacy: !isMongoMenuItem(item),
        })
      }
    })
    return [...uniqueItems.values()]
  } catch {
    return []
  }
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'add': {
      const existingItem = state.find((item) => item.id === action.food.id)
      if (existingItem) {
        if (existingItem.isLegacy && isMongoMenuItem(action.food)) {
          return state.map((item) => (
            item.id === action.food.id
              ? {
                  ...action.food,
                  quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + 1),
                  image: typeof action.food.image === 'string' ? action.food.image : '',
                  emoji: typeof action.food.emoji === 'string' ? action.food.emoji : '🍽️',
                  isLegacy: false,
                }
              : item
          ))
        }
        if (existingItem.quantity >= MAX_ITEM_QUANTITY) return state
        return state.map((item) => (
          item.id === action.food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      }
      return [...state, {
        ...action.food,
        quantity: Math.min(action.food.quantity || 1, MAX_ITEM_QUANTITY),
        isLegacy: !isMongoMenuItem(action.food),
      }]
    }
    case 'remove':
      return state.filter((item) => item.id !== action.foodId)
    case 'increase':
      return state.map((item) => (
        item.id === action.foodId && item.quantity < MAX_ITEM_QUANTITY
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    case 'decrease':
      return state
        .map((item) => (
          item.id === action.foodId ? { ...item, quantity: item.quantity - 1 } : item
        ))
        .filter((item) => item.quantity > 0)
    case 'clear':
      return []
    case 'reconcile':
      return reconcileCart(state, action.menuItems).items
    default:
      return state
  }
}

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, restoreCart)
  const currentItems = useRef(items)
  const lastValidation = useRef(null)
  const validationRequest = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Cart remains usable for the current page when browser storage is unavailable.
    }
  }, [items])

  const validateCartAgainstLatestMenu = useCallback(({ reuseRecent = false } = {}) => {
    if (
      reuseRecent &&
      lastValidation.current &&
      Date.now() - lastValidation.current.validatedAt < 2000
    ) {
      return Promise.resolve(lastValidation.current.result)
    }
    if (validationRequest.current) return validationRequest.current

    validationRequest.current = refreshMenuItems()
      .then((menuItems) => {
        const result = reconcileCart(currentItems.current, menuItems)
        currentItems.current = result.items
        dispatch({ type: 'reconcile', menuItems })
        lastValidation.current = { result, validatedAt: Date.now() }
        return result
      })
      .finally(() => {
        validationRequest.current = null
      })

    return validationRequest.current
  }, [])

  const value = useMemo(() => {
    const invalidateValidation = () => {
      lastValidation.current = null
    }
    const dispatchCart = (action) => {
      currentItems.current = cartReducer(currentItems.current, action)
      dispatch(action)
    }
    const itemCount = items.reduce((count, item) => count + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      items,
      itemCount,
      subtotal,
      total: subtotal,
      addToCart: (food) => {
        invalidateValidation()
        dispatchCart({ type: 'add', food })
      },
      removeFromCart: (foodId) => {
        invalidateValidation()
        dispatchCart({ type: 'remove', foodId })
      },
      increaseQuantity: (foodId) => {
        invalidateValidation()
        dispatchCart({ type: 'increase', foodId })
      },
      decreaseQuantity: (foodId) => {
        invalidateValidation()
        dispatchCart({ type: 'decrease', foodId })
      },
      clearCart: () => {
        invalidateValidation()
        dispatchCart({ type: 'clear' })
      },
      validateCartAgainstLatestMenu,
    }
  }, [items, validateCartAgainstLatestMenu])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartProvider }

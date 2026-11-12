import { useEffect, useMemo, useReducer } from 'react'
import CartContext from './cartStore'

const STORAGE_KEY = 'dinecloud-customer-cart'

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
        currentItem.quantity += item.quantity
      } else {
        uniqueItems.set(item.id, {
          ...item,
          quantity: item.quantity,
          image: typeof item.image === 'string' ? item.image : '',
          emoji: typeof item.emoji === 'string' ? item.emoji : '🍽️',
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
        return state.map((item) => (
          item.id === action.food.id ? { ...item, quantity: item.quantity + 1 } : item
        ))
      }
      return [...state, { ...action.food, quantity: 1 }]
    }
    case 'remove':
      return state.filter((item) => item.id !== action.foodId)
    case 'increase':
      return state.map((item) => (
        item.id === action.foodId ? { ...item, quantity: item.quantity + 1 } : item
      ))
    case 'decrease':
      return state
        .map((item) => (
          item.id === action.foodId ? { ...item, quantity: item.quantity - 1 } : item
        ))
        .filter((item) => item.quantity > 0)
    case 'clear':
      return []
    default:
      return state
  }
}

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, restoreCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Cart remains usable for the current page when browser storage is unavailable.
    }
  }, [items])

  const value = useMemo(() => {
    const itemCount = items.reduce((count, item) => count + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      items,
      itemCount,
      subtotal,
      total: subtotal,
      addToCart: (food) => dispatch({ type: 'add', food }),
      removeFromCart: (foodId) => dispatch({ type: 'remove', foodId }),
      increaseQuantity: (foodId) => dispatch({ type: 'increase', foodId }),
      decreaseQuantity: (foodId) => dispatch({ type: 'decrease', foodId }),
      clearCart: () => dispatch({ type: 'clear' }),
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartProvider }

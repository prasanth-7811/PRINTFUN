import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { CartItem } from '../types'
import { cartService } from '../services/cart'
import { useAuth } from './AuthContext'

interface CartContextType {
  items: CartItem[]
  count: number
  total: number
  addItem: (data: Parameters<typeof cartService.addToCart>[0]) => Promise<void>
  removeItem: (id: number) => Promise<void>
  updateItem: (id: number, data: Partial<CartItem>) => Promise<void>
  clearCart: () => Promise<void>
  refresh: () => Promise<void>
  loading: boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!isAuthenticated) return
    try {
      const data = await cartService.getCart()
      setItems(data)
    } catch {}
  }

  useEffect(() => { refresh() }, [isAuthenticated])

  const addItem = async (data: Parameters<typeof cartService.addToCart>[0]) => {
    setLoading(true)
    try {
      await cartService.addToCart(data)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (id: number) => {
    await cartService.removeFromCart(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateItem = async (id: number, data: Partial<CartItem>) => {
    const updated = await cartService.updateCartItem(id, data)
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
  }

  const clearCart = async () => {
    await cartService.clearCart()
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + i.total, 0)

  return (
    <CartContext.Provider value={{ items, count: items.length, total, addItem, removeItem, updateItem, clearCart, refresh, loading }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

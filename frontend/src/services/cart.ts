import api from './api'
import type { CartItem } from '../types'

export const cartService = {
  async getCart() {
    const res = await api.get('/cart')
    return res.data as CartItem[]
  },

  async addToCart(data: {
    product_id: number
    variant_id?: number
    colour: string
    colour_hex: string
    sizes: Record<string, number>
    front_design?: string
    back_design?: string
    front_dimensions?: { width: number; height: number }
    back_dimensions?: { width: number; height: number }
  }) {
    const res = await api.post('/cart', data)
    return res.data as CartItem
  },

  async updateCartItem(id: number, data: Partial<CartItem>) {
    const res = await api.put(`/cart/${id}`, data)
    return res.data as CartItem
  },

  async removeFromCart(id: number) {
    await api.delete(`/cart/${id}`)
  },

  async clearCart() {
    await api.delete('/cart')
  },
}

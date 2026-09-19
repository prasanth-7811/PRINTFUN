import api from './api'
import type { Product, PaginatedResponse } from '../types'

export const productService = {
  async getProducts(params?: Record<string, string | number>) {
    const res = await api.get('/products', { params })
    return res.data as PaginatedResponse<Product>
  },

  async getProduct(id: number | string) {
    const res = await api.get(`/products/${id}`)
    return res.data as Product
  },

  async getFeatured() {
    const res = await api.get('/products/featured')
    return res.data as Product[]
  },

  // Admin
  async createProduct(data: FormData) {
    const res = await api.post('/admin/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async updateProduct(id: number, data: FormData) {
    const res = await api.put(`/admin/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async deleteProduct(id: number) {
    await api.delete(`/admin/products/${id}`)
  },
}

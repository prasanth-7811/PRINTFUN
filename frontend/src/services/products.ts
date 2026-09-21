import api from './api'
import type { Product, ProductVariant, PaginatedResponse, Audience } from '../types'

export interface ProductFilters {
  search?: string
  type?: string
  audience?: Audience | ''
  colour?: string
  gsm?: string
  min_price?: number
  max_price?: number
  sort?: string
  include_inactive?: boolean
}

export const productService = {
  async getProducts(params?: ProductFilters) {
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

  async getFilters() {
    const res = await api.get('/products/filters')
    return res.data as {
      types: string[]
      gsm: number[]
      colours: { name: string; hex: string }[]
      audiences: Audience[]
    }
  },

  // --- Admin -------------------------------------------------------------
  async createProduct(data: Partial<Product>) {
    const res = await api.post('/products', data)
    return res.data as Product
  },

  async updateProduct(id: number, data: Partial<Product>) {
    const res = await api.put(`/products/${id}`, data)
    return res.data as Product
  },

  async uploadImages(id: number, files: File[]) {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))
    const res = await api.post(`/products/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { images: string[] }
  },

  async deleteProduct(id: number) {
    await api.delete(`/products/${id}`)
  },

  async createVariant(productId: number, data: Partial<ProductVariant>) {
    const res = await api.post(`/products/${productId}/variants`, data)
    return res.data as ProductVariant
  },

  async updateVariant(variantId: number, data: Partial<ProductVariant>) {
    const res = await api.put(`/products/variants/${variantId}`, data)
    return res.data as ProductVariant
  },

  async deleteVariant(variantId: number) {
    await api.delete(`/products/variants/${variantId}`)
  },
}

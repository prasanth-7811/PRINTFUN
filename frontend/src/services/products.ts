import api from './api'
import type { Product, ProductVariant, PaginatedResponse, Audience } from '../types'

/**
 * The SPA rewrite serves index.html for any unmatched route, so a request to
 * a missing /api/* comes back as a 200 with an HTML body. Coerce those to an
 * empty result instead of letting a string reach .map().
 */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

function asPaginated<T>(value: unknown): PaginatedResponse<T> {
  if (value && typeof value === 'object' && Array.isArray((value as any).items)) {
    return value as PaginatedResponse<T>
  }
  return { items: [], total: 0, page: 1, per_page: 0, pages: 0 }
}

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
    return asPaginated<Product>(res.data)
  },

  async getProduct(id: number | string) {
    const res = await api.get(`/products/${id}`)
    return res.data as Product
  },

  async getFeatured() {
    const res = await api.get('/products/featured')
    return asArray<Product>(res.data)
  },

  async getFilters() {
    const res = await api.get('/products/filters')
    const d = (res.data && typeof res.data === 'object') ? res.data : {}
    return {
      types: asArray<string>(d.types),
      gsm: asArray<number>(d.gsm),
      colours: asArray<{ name: string; hex: string }>(d.colours),
      audiences: asArray<Audience>(d.audiences),
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

import api from './api'
import type { Order, Address } from '../types'

export const orderService = {
  async createOrder(data: {
    address: Address
    coupon_code?: string
    payment_method: string
    special_instructions?: string
  }) {
    const res = await api.post('/orders', data)
    return res.data as Order
  },

  async getOrders() {
    const res = await api.get('/orders')
    return res.data as Order[]
  },

  async getOrder(id: number | string) {
    const res = await api.get(`/orders/${id}`)
    return res.data as Order
  },

  async cancelOrder(id: number, reason: string) {
    const res = await api.post(`/orders/${id}/cancel`, { reason })
    return res.data
  },

  async requestReturn(id: number, data: { reason: string; item_id?: number }) {
    const res = await api.post(`/orders/${id}/return`, data)
    return res.data
  },

  async requestRefund(id: number, data: { reason: string; item_id?: number }) {
    const res = await api.post(`/orders/${id}/refund`, data)
    return res.data
  },

  async resubmitDesign(id: number, data: { front_design?: string; back_design?: string }) {
    const res = await api.post(`/orders/${id}/resubmit-design`, data)
    return res.data
  },

  async getAdminOrders(params?: { status?: string; page?: number }) {
    const res = await api.get('/orders/admin/all', { params })
    return res.data as { items: Order[]; total: number; page: number; pages: number }
  },

  async getAdminOrder(id: number | string) {
    const res = await api.get(`/orders/admin/${id}`)
    return res.data as Order
  },

  async updateOrderStatus(id: number | string, data: { status: string; note?: string; tracking_id?: string; courier?: string; estimated_delivery?: string }) {
    const res = await api.put(`/orders/admin/${id}/status`, data)
    return res.data as Order
  },

  async deleteAdminOrder(id: number | string) {
    const res = await api.delete(`/orders/admin/${id}`)
    return res.data as { message: string }
  },
}

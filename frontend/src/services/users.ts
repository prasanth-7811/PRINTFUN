import api from './api'
import type { User } from '../types'

export interface UserFilters {
  role?: string
  is_active?: boolean
}

export interface CreateUserPayload {
  name: string
  email: string
  phone?: string
  password: string
  role: string
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  phone?: string
  role?: string
  is_active?: boolean
  email_verified?: boolean
}

export const userService = {
  async getUsers(params?: UserFilters) {
    const res = await api.get('/users', { params })
    return res.data as (User & { is_active: boolean; orders?: number; total_spent?: number; last_order?: string })[]
  },

  async getUser(id: number) {
    const res = await api.get(`/users/${id}`)
    return res.data as User
  },

  async createUser(data: CreateUserPayload) {
    const res = await api.post('/users', data)
    return res.data as User
  },

  async updateUser(id: number, data: UpdateUserPayload) {
    const res = await api.put(`/users/${id}`, data)
    return res.data as User
  },

  async deleteUser(id: number) {
    await api.delete(`/users/${id}`)
  },
}

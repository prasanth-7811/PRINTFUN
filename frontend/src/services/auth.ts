import api from './api'
import type { User } from '../types'

export const authService = {
  async register(data: { name: string; email: string; password: string; phone?: string }) {
    const res = await api.post('/auth/register', data)
    return res.data
  },

  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    return res.data as { token: string; user: User }
  },

  async adminLogin(email: string, password: string) {
    const res = await api.post('/auth/admin-login', { email, password })
    return res.data as { token: string; user: User }
  },

  async logout() {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async getProfile() {
    const res = await api.get('/auth/me')
    return res.data as User
  },

  async updateProfile(data: Partial<User>) {
    const res = await api.put('/auth/me', data)
    return res.data as User
  },

  async changePassword(current: string, newPass: string) {
    const res = await api.put('/auth/change-password', { current_password: current, new_password: newPass })
    return res.data
  },
}

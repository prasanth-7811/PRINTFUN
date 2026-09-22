import api from './api'
import type { User } from '../types'

export interface OtpResponse {
  message: string
  delivery?: string
  /** Present only when DEV_RETURN_TOKEN is on; the code itself. */
  otp?: string
  cooldown_seconds?: number
  retry_after?: number
}

export interface OtpVerifyResponse {
  message: string
  user: User
  token: string
}

export const phoneService = {
  async sendOtp(data: { email?: string; phone?: string; purpose?: string }) {
    const res = await api.post('/phone/send-otp', data)
    return res.data as OtpResponse
  },

  async verifyOtp(data: { email?: string; phone?: string; otp: string; purpose?: string }) {
    const res = await api.post('/phone/verify-otp', data)
    return res.data as OtpVerifyResponse
  },

  async status() {
    const res = await api.get('/phone/status')
    return res.data as { id: number; name: string; email: string; phone: string; phone_verified: boolean }
  },
}

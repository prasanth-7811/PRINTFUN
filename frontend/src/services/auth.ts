import api from './api'
import type { User } from '../types'

export interface AuthResponse {
  token: string
  user: User
}

export interface FieldErrors {
  [key: string]: string
}

export interface AuthErrorResponse {
  message: string
  errors?: FieldErrors
  verification_required?: boolean
  email?: string
  expired?: boolean
  retry_after?: number
}

export const authService = {
  async register(data: {
    name: string
    email: string
    phone?: string
    password: string
    confirm_password?: string
    accept_terms?: boolean
  }) {
    const res = await api.post('/auth/register', data)
    return res.data as {
      message: string
      verification_required: boolean
      email: string
      verification_link?: string | null
      mail_error?: string
      // legacy: only present if email_verified=True path is ever restored
      user?: User
      token?: string
    }
  },

  async verifyEmail(token: string) {
    const res = await api.post('/auth/verify-email', { token })
    return res.data as { message: string; user: User; token: string }
  },

  async sendEmailOtp(email: string) {
    const res = await api.post('/auth/send-email-otp', { email })
    return res.data as {
      message: string
      otp?: string
      cooldown_seconds?: number
      verified_provider?: string
    }
  },

  async verifyEmailOtp(email: string, otp: string) {
    const res = await api.post('/auth/verify-email-otp', { email, otp })
    return res.data as {
      message: string
      verified_via_supabase: boolean
      user: User
      token: string
    }
  },

  async resendVerification(email: string) {
    const res = await api.post('/auth/resend-verification', { email })
    return res.data as {
      message: string
      email_sent: boolean
      retry_after?: number
      verification_link?: string | null
    }
  },

  async login(identifier: string, password: string, remember_me = false) {
    const res = await api.post('/auth/login', { identifier, email: identifier, password, remember_me })
    return res.data as AuthResponse
  },

  async sendLoginOtp(identifier: string) {
    const res = await api.post('/auth/send-login-otp', { identifier })
    return res.data as {
      message: string
      channel: 'email'
      destination_hint?: string
      cooldown_seconds?: number
      otp?: string
      verified_provider?: string
    }
  },

  async verifyLoginOtp(identifier: string, otp: string) {
    const res = await api.post('/auth/verify-login-otp', { identifier, otp })
    return res.data as AuthResponse & { verified_via_supabase?: boolean }
  },

  async adminLogin(email: string, password: string) {
    const res = await api.post('/auth/admin-login', { email, password })
    return res.data as AuthResponse
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Stateless logout — the token is discarded client-side regardless.
    }
  },

  async logoutEverywhere() {
    await api.post('/auth/logout-everywhere')
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
    const res = await api.put('/auth/change-password', {
      current_password: current,
      new_password: newPass,
      confirm_password: newPass,
    })
    return res.data as { message: string; token: string }
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data as { message: string; reset_link?: string | null }
  },

  async checkResetToken(token: string) {
    const res = await api.post('/auth/check-reset-token', { token })
    return res.data as { valid: boolean }
  },

  async resetPassword(token: string, newPass: string) {
    const res = await api.post('/auth/reset-password', {
      token,
      new_password: newPass,
      confirm_password: newPass,
    })
    return res.data as { message: string }
  },
}

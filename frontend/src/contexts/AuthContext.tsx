import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'
import { authService } from '../services/auth'
import { cartService } from '../services/cart'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  adminLogin: (email: string, password: string) => Promise<void>
  register: (data: {
    name: string
    email: string
    phone?: string
    password: string
    confirm_password?: string
    accept_terms?: boolean
  }) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  isAdmin: boolean
  isAuthenticated: boolean
  isVerified: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

/** Parse the persisted user, tolerating corrupted or non-JSON values. */
function readUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) as User : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Malformed or hostile storage must never white-screen the app.
    return readUser()
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(false)

  const persist = (newToken: string | null, newUser: User | null) => {
    setToken(newToken)
    setUser(newUser)
    if (newToken) localStorage.setItem(TOKEN_KEY, newToken)
    else localStorage.removeItem(TOKEN_KEY)
    if (newUser) localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    else localStorage.removeItem(USER_KEY)
  }

  useEffect(() => {
    // Re-validate the stored token against the server on boot so a stale or
    // revoked session is dropped rather than trusted.
    if (!token) return
    authService
      .getProfile()
      .then((fresh) => persist(token, fresh))
      .catch(() => persist(null, null))
    // cart refresh runs on mount anyway via CartProvider; nothing to do here
  }, [])

  const register = async (data: Parameters<typeof authService.register>[0]) => {
    setLoading(true)
    try {
      // The account is created unverified — no session is returned here.
      await authService.register(data)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, remember = false) => {
    setLoading(true)
    try {
      const res = await authService.login(email, password, remember)
      persist(res.token, res.user)
      // Pull the authenticated user's server-side cart without dropping it.
      await cartService.getCart().catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  const adminLogin = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await authService.adminLogin(email, password)
      persist(res.token, res.user)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    const updated = await authService.updateProfile(data)
    persist(token, updated)
  }

  const logout = () => {
    authService.logout().catch(() => {})
    persist(null, null)
  }

  const refresh = async () => {
    if (!token) return
    try {
      const fresh = await authService.getProfile()
      persist(token, fresh)
    } catch {
      persist(null, null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        adminLogin,
        register,
        logout,
        refresh,
        updateProfile,
        // Server-side role gating is authoritative; this is for UI only.
        isAdmin: ['admin', 'manager', 'production', 'shipping'].includes(user?.role || ''),
        isAuthenticated: !!token && !!user,
        isVerified: !!user?.email_verified,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

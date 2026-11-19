import axios from 'axios'
import { API_BASE } from '../config/brand'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// The SPA rewrite answers any unmatched route with index.html, so a request to
// a route with no backend behind it comes back as a 200 carrying HTML. Treat
// that as an error instead of letting a string masquerade as data and reach
// .map() further down the line.
api.interceptors.response.use(
  (res) => {
    const type = String(res.headers['content-type'] || '')
    const bodyIsString = typeof res.data === 'string'
    if (bodyIsString || !type.includes('application/json')) {
      return Promise.reject(
        new axios.AxiosError(
          `Expected JSON from ${res.config.url} but received ${type || 'an HTML fallback'}`,
          'ERR_BAD_RESPONSE',
          res.config,
          res,
        ),
      )
    }
    return res
  },
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isAuthEndpoint = url.includes('/auth/')
      const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
      const isOnAuthPage = pathname === '/login' || pathname === '/admin/login' || pathname === '/register'

      // Only redirect on 401 if a previously stored token expired while accessing a protected non-auth route
      if (!isAuthEndpoint && !isOnAuthPage && localStorage.getItem('token')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
      }
    }
    return Promise.reject(err)
  },
)

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api

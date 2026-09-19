import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BRAND } from '../config/brand'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate(redirect)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-black text-3xl tracking-tighter text-black">{BRAND.name}</Link>
          <p className="text-zinc-500 text-sm mt-2">Welcome back</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm">
          <h1 className="text-2xl font-black text-zinc-900 mb-6">Sign In</h1>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="••••••••" />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-zinc-500 hover:text-black">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</> : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-black font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { BRAND } from '../../config/brand'

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { adminLogin, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanId = identifier.trim()
    if (!cleanId) {
      setError('Please enter your admin email or mobile number.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    try {
      await adminLogin(cleanId, password)
      navigate('/admin')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid administrator credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block font-black text-3xl text-white tracking-tighter hover:opacity-80 transition-opacity">
            {BRAND.name}
          </Link>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-zinc-400 text-sm">
            <ShieldCheck size={16} className="text-purple-400" />
            <span>Admin Management Portal</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-6">Staff Sign In</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
                Admin Email or Mobile
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="admin@printheaven.co.in"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <Link to="/login" className="inline-flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft size={12} />
              Customer Login
            </Link>
            <span className="text-zinc-600">Admin: printheavenstudio@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}

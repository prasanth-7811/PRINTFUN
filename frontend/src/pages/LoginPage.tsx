import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout, FormField, PasswordField, SubmitButton } from '../components/auth/AuthFields'
import type { AuthErrorResponse } from '../services/auth'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')

  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    try {
      await login(identifier.trim(), password, remember)
      navigate(redirect + (redirect === '/' ? '?loggedin=1' : ''))
    } catch (err: any) {
      const body = err?.response?.data as AuthErrorResponse | undefined
      if (body?.verification_required) {
        navigate(`/verify-email?email=${encodeURIComponent(body.email || identifier)}`)
        return
      }
      setError(body?.message || 'Incorrect email or password.')
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your PRINTHEAVEN account"
      footer={
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-black font-semibold hover:underline">
              Create one
            </Link>
          </p>
          <div className="text-xs text-zinc-400">
            Staff or Store Admin?{' '}
            <Link to="/admin/login" className="text-zinc-600 hover:text-black hover:underline font-medium">
              Admin Portal →
            </Link>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="identifier"
          label="Email Address"
          type="email"
          value={identifier}
          onChange={setIdentifier}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <div>
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-zinc-300 text-black focus:ring-black"
              />
              <span className="text-sm text-zinc-600">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-xs text-zinc-500 hover:text-black">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton loading={loading}>Sign In</SubmitButton>
      </form>
    </AuthLayout>
  )
}

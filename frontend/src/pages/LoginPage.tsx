import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout, FormField, PasswordField, SubmitButton, useCountdown } from '../components/auth/AuthFields'
import { authService } from '../services/auth'
import type { AuthErrorResponse } from '../services/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendArmed, setResendArmed] = useState(false)
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const countdown = useCountdown(30, resendArmed)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    try {
      await login(email, password, remember)
      navigate(redirect)
    } catch (err: any) {
      const body = err?.response?.data as AuthErrorResponse | undefined
      if (body?.verification_required) {
        // Unverified account — offer to resend the link instead of a dead end.
        setNeedsVerification(true)
        setEmail(body.email || email)
      } else {
        setError(body?.message || 'Incorrect email or password.')
      }
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await authService.resendVerification(email)
      setResendArmed(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not resend. Please try again.')
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your TEEZO account"
      footer={
        <p className="text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-black font-semibold hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {needsVerification ? (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-900 mb-1">Verify your email to continue</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              We sent a verification link to <strong>{email}</strong>. Please check your inbox
              (and spam folder) and confirm your address to activate your account.
            </p>
          </div>
          <button
            onClick={handleResend}
            disabled={countdown > 0}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
          </button>
          <Link
            to={`/verify-email?email=${encodeURIComponent(email)}`}
            className="block text-center text-sm text-zinc-500 hover:text-black"
          >
            I have a code / link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
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
      )}
    </AuthLayout>
  )
}

import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, ShieldCheck, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/auth'
import { AuthLayout, FormField, PasswordField, SubmitButton, useCountdown } from '../components/auth/AuthFields'
import type { AuthErrorResponse } from '../services/auth'

const OTP_LENGTH = 6

export default function LoginPage() {
  const [tab, setTab] = useState<'password' | 'otp'>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // OTP state
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [resendCount, setResendCount] = useState(0)
  const countdown = useCountdown(60, otpSent, resendCount)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const { login, loginWithOtp, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')
    if (!identifier.trim()) {
      setError('Please enter your email address or mobile number.')
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
      setError(body?.message || 'Incorrect email/mobile number or password.')
    }
  }

  const handleSendOtp = async () => {
    setError('')
    setInfoMessage('')
    setDevOtp(null)
    const cleanId = identifier.trim()
    if (!cleanId) {
      setError('Please enter your email address or mobile number first.')
      return
    }

    setSendingOtp(true)
    try {
      const res = await authService.sendLoginOtp(cleanId)
      setOtpSent(true)
      setInfoMessage(res.message || 'Verification code sent!')
      if (res.otp) {
        setDevOtp(res.otp)
      }
      setResendCount((c) => c + 1)
      setTimeout(() => inputs.current[0]?.focus(), 150)
    } catch (err: any) {
      const body = err?.response?.data
      if (body?.not_found) {
        setError('No account found with this email or mobile number. Please register first.')
      } else {
        setError(body?.message || 'Could not send verification code. Please try again.')
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleOtpDigitChange = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!clean) {
      const next = [...digits]
      next[i] = ''
      setDigits(next)
      return
    }

    if (clean.length > 1) {
      const next = Array(OTP_LENGTH).fill('')
      for (let j = 0; j < OTP_LENGTH; j += 1) next[j] = clean[j] ?? ''
      setDigits(next)
      inputs.current[Math.min(clean.length, OTP_LENGTH) - 1]?.focus()
      return
    }

    const next = [...digits]
    next[i] = clean
    setDigits(next)
    if (i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const code = digits.join('')
      if (code.length === OTP_LENGTH) handleVerifyOtp()
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      inputs.current[i + 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const code = digits.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setError('')
    try {
      await loginWithOtp(identifier.trim(), code)
      navigate(redirect + (redirect === '/' ? '?loggedin=1' : ''))
    } catch (err: any) {
      const body = err?.response?.data
      setError(body?.message || 'Invalid or expired verification code.')
      if (body?.mismatch) {
        setDigits(Array(OTP_LENGTH).fill(''))
        inputs.current[0]?.focus()
      }
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
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button
          type="button"
          onClick={() => {
            setTab('password')
            setError('')
            setInfoMessage('')
          }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'password'
              ? 'border-black text-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('otp')
            setError('')
            setInfoMessage('')
          }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'otp'
              ? 'border-black text-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <span>Email OTP</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          {infoMessage}
        </div>
      )}

      {devOtp && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
          <MessageSquare size={16} className="shrink-0" />
          <span>
            Dev verification code: <strong className="tracking-widest font-mono font-bold">{devOtp}</strong>
          </span>
        </div>
      )}

      {tab === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
      ) : (
        <div className="space-y-4">
          <FormField
            id="otp-identifier"
            label="Email Address"
            type="email"
            value={identifier}
            onChange={(v) => {
              setIdentifier(v)
              if (otpSent) setOtpSent(false)
            }}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          {!otpSent ? (
            <button
              type="button"
              disabled={sendingOtp || !identifier.trim()}
              onClick={handleSendOtp}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sendingOtp ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-2">
                  Enter 6-Digit Code
                </label>
                <div className="flex gap-2 justify-between">
                  {digits.map((d, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputs.current[idx] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={loading || digits.join('').length !== OTP_LENGTH}
                onClick={handleVerifyOtp}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Verify & Sign In
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
                <div className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Verified with Supabase
                </div>
                {countdown > 0 ? (
                  <span>Resend code in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="font-semibold text-black hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import { authService } from '../services/auth'
import {
  AuthLayout,
  SubmitButton,
  useCountdown,
} from '../components/auth/AuthFields'
import type { AuthErrorResponse } from '../services/auth'

type State =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'error'; message: string; expired?: boolean }
  | { kind: 'sent'; message: string; otp?: string }

const OTP_LENGTH = 6

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''
  const next = searchParams.get('next') || ''

  const [state, setState] = useState<State>({ kind: 'idle' })
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [manualToken, setManualToken] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendArmed, setResendArmed] = useState(false)
  const countdown = useCountdown(30, resendArmed)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')

  // Verify via link/token
  const verify = async (raw: string) => {
    setState({ kind: 'verifying' })
    try {
      const res = await authService.verifyEmail(raw)
      setState({ kind: 'success' })
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setTimeout(() => navigate(next ? `/${next.replace(/^\//, '')}` : '/verify-phone'), 2200)
    } catch (err: any) {
      const body = err?.response?.data as AuthErrorResponse | undefined
      setState({
        kind: 'error',
        message: body?.message || 'This verification link is invalid.',
        expired: body?.expired,
      })
    }
  }

  // Verify via 6-digit OTP code directly in Supabase
  const verifyCode = async (otpValue: string) => {
    if (!email) {
      setState({ kind: 'error', message: 'Email is required to verify OTP.' })
      return
    }
    setVerifyingOtp(true)
    setState({ kind: 'idle' })
    try {
      const res = await authService.verifyEmailOtp(email, otpValue)
      setState({ kind: 'success' })
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setTimeout(() => navigate(next ? `/${next.replace(/^\//, '')}` : '/verify-phone'), 2200)
    } catch (err: any) {
      setState({
        kind: 'error',
        message: err?.response?.data?.message || 'Invalid or expired OTP code.',
      })
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Arriving with ?token=… from the email is the primary path.
  useEffect(() => {
    if (token) verify(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!clean) {
      const next = [...digits]
      next[i] = ''
      setDigits(next)
      return
    }
    // Pasting the whole code into the first box fills the rest
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

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (code.length === OTP_LENGTH) verifyCode(code)
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      inputs.current[i + 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (!email) return
    setState({ kind: 'idle' })
    try {
      const res = await authService.sendEmailOtp(email)
      setResendArmed(true)
      setState({
        kind: 'sent',
        message: res.message || 'A new verification code has been sent to your inbox.',
        otp: res.otp,
      })
    } catch (err: any) {
      setState({
        kind: 'error',
        message: err?.response?.data?.message || 'Could not resend. Please try again.',
      })
    }
  }

  if (state.kind === 'verifying') {
    return (
      <AuthLayout title="Verifying...">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Confirming your email address with Supabase...</p>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'success') {
    return (
      <AuthLayout title="Email Verified">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-1.5">EMAIL VERIFIED SUCCESSFULLY</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified with Supabase
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your email is now verified in Supabase.<br />
            {next
              ? 'Taking you to phone verification next…'
              : 'You can now log in and start designing.'}
          </p>
          <button
            onClick={() => navigate(next ? `/${next.replace(/^\//, '')}` : '/verify-phone')}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            CONTINUE
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={email ? `Enter the code or click the link sent to ${email}` : 'Check your inbox for a verification code'}
    >
      {state.kind === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}
      {state.kind === 'sent' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          {state.message}
          {state.otp && (
            <span className="block mt-1 font-bold text-zinc-900 tracking-wider">
              Dev OTP: {state.otp}
            </span>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* 6-Digit OTP Entry */}
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <KeyRound size={13} /> 6-Digit Verification Code
          </label>
          <div className="flex justify-between gap-2 mb-3" role="group" aria-label="Verification code">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                maxLength={OTP_LENGTH}
                className={`w-12 h-14 text-center text-lg font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-black ${
                  state.kind === 'error' ? 'border-red-300 bg-red-50/40' : 'border-zinc-200'
                }`}
              />
            ))}
          </div>

          <SubmitButton
            loading={verifyingOtp}
            disabled={code.length < OTP_LENGTH || !email}
            onClick={() => verifyCode(code)}
          >
            Verify with Supabase
          </SubmitButton>
        </div>

        <button
          onClick={handleResend}
          disabled={countdown > 0 || !email}
          className="w-full border-2 border-black text-black py-3 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Verification Code'}
        </button>

        {/* Fallback to token link */}
        <div className="border-t border-zinc-100 pt-3">
          <label className="text-xs font-medium text-zinc-500 mb-1.5 block">
            Or paste your verification link
          </label>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste the link or token from your email"
            className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => manualToken.trim() && verify(extractToken(manualToken.trim()))}
            disabled={!manualToken.trim()}
            className="mt-2 w-full bg-zinc-100 text-zinc-800 py-2 rounded-xl font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            Verify via Link
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500 pt-2">
          <Link to="/login" className="text-black font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

/** Accept a full link or a bare token. */
function extractToken(input: string): string {
  const match = input.match(/[?&]token=([^&#]+)/)
  return match ? decodeURIComponent(match[1]) : input
}

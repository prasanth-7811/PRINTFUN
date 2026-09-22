import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Phone, MessageSquare, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { phoneService } from '../services/phone'
import { useAuth } from '../contexts/AuthContext'
import {
  AuthLayout,
  SubmitButton,
  useCountdown,
} from '../components/auth/AuthFields'
import type { OtpResponse } from '../services/phone'

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string; devCode?: string }
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'error'; message: string; attemptsRemaining?: number }

const OTP_LENGTH = 6

export default function VerifyPhonePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, refresh } = useAuth()

  // ?email= is the usual hand-off from registration; a signed-in user's own
  // number is used as the destination.
  const email = searchParams.get('email') || user?.email || ''
  const phone = user?.phone || searchParams.get('phone') || ''

  const [state, setState] = useState<State>({ kind: 'idle' })
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const [sendCount, setSendCount] = useState(0)
  const countdown = useCountdown(60, state.kind === 'sent', sendCount)

  const code = digits.join('')

  const sendCode = async () => {
    setState({ kind: 'sending' })
    try {
      const res = await phoneService.sendOtp({ email, phone, purpose: 'verify_phone' })
      // DEV_RETURN_TOKEN surfaces the code in the API response locally so the
      // flow can be exercised without a live SMS provider.
      const dev = (res as OtpResponse).otp
      setState({
        kind: 'sent',
        message: res.message,
        devCode: dev || undefined,
      })
      setSendCount((n) => n + 1)
    } catch (err: any) {
      const body = err?.response?.data
      setState({ kind: 'error', message: body?.message || 'Could not send the code.' })
    }
  }

  // Fire the first code automatically on arrival.
  useEffect(() => {
    sendCode()
    inputs.current[0]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!clean) {
      const next = [...digits]
      next[i] = ''
      setDigits(next)
      return
    }
    // Pasting the whole code into the first box fills the rest.
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
      if (code.length === OTP_LENGTH) verify(code)
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      inputs.current[i + 1]?.focus()
    }
  }

  const verify = async (value: string) => {
    setVerifying(true)
    setState({ kind: 'verifying' })
    try {
      const res = await phoneService.verifyOtp({ email, phone, otp: value })
      // The backend returns a fresh session token so the user is signed in.
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      await refresh().catch(() => {})
      setState({ kind: 'success' })
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      const body = err?.response?.data
      setState({
        kind: 'error',
        message: body?.message || 'Invalid or expired code.',
        attemptsRemaining: body?.attempts_remaining,
      })
      // Clear the entered code on a mismatch — it is wrong by definition.
      if (body?.mismatch || err?.response?.status === 401) {
        setDigits(Array(OTP_LENGTH).fill(''))
        inputs.current[0]?.focus()
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = () => {
    sendCode()
  }

  if (state.kind === 'verifying') {
    return (
      <AuthLayout title="Verifying...">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Confirming your mobile number...</p>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'success') {
    return (
      <AuthLayout title="Phone Verified">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">PHONE VERIFIED SUCCESSFULLY</h2>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your mobile number is confirmed.<br />
            Your account is now fully active.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            CONTINUE TO HOME
          </button>
        </div>
      </AuthLayout>
    )
  }

  const mask = (value: string) => {
    if (value.length <= 2) return value
    return `${value.slice(0, 2)}••••${value.slice(-3)}`
  }

  return (
    <AuthLayout
      title="Verify Your Mobile Number"
      subtitle={phone ? `We sent a code to ${mask(phone)}` : 'Enter the code we sent you'}
    >
      {state.kind === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {state.message}
            {state.attemptsRemaining !== undefined && state.attemptsRemaining > 0 && (
              <span className="block mt-0.5 text-red-500">
                {state.attemptsRemaining} attempt{state.attemptsRemaining === 1 ? '' : 's'} remaining
              </span>
            )}
          </span>
        </div>
      )}
      {state.kind === 'sent' && state.devCode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex gap-2">
          <MessageSquare size={16} className="shrink-0 mt-0.5" />
          <span>
            Dev mode — your code is <span className="font-bold tracking-widest">{state.devCode}</span>
            (no SMS provider is configured).
          </span>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-zinc-500 leading-relaxed flex items-start gap-2">
          <Phone size={16} className="shrink-0 mt-0.5" />
          <span>
            Enter the 6-digit code we texted you. It expires in 10 minutes and can only be used once.
          </span>
        </p>

        <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
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
          loading={verifying}
          disabled={code.length < OTP_LENGTH}
          onClick={() => verify(code)}
        >
          Verify Mobile Number
        </SubmitButton>

        <button
          onClick={handleResend}
          disabled={countdown > 0}
          className="w-full border-2 border-black text-black py-3 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>
        {!email && !phone && (
          <p className="text-xs text-zinc-400 text-center">
            No number on file — add one from your account page first.
          </p>
        )}
        <p className="text-center text-sm text-zinc-500">
          <Link to="/login" className="text-black font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

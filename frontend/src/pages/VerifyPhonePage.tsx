import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Phone, MessageSquare, AlertCircle, Loader2, CheckCircle2, ShieldCheck, Edit3 } from 'lucide-react'
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

  const email = searchParams.get('email') || user?.email || ''
  const initialPhone = searchParams.get('phone') || user?.phone || ''

  const [phoneInput, setPhoneInput] = useState(initialPhone.replace(/^\+91\s*/, ''))
  const [activePhone, setActivePhone] = useState(initialPhone)
  const [isEditingPhone, setIsEditingPhone] = useState(!initialPhone)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const [sendCount, setSendCount] = useState(0)
  const countdown = useCountdown(60, state.kind === 'sent', sendCount)

  const code = digits.join('')

  const cleanPhoneInput = phoneInput.replace(/\D/g, '').slice(0, 10)
  const isValidPhone = cleanPhoneInput.length === 10 && /^[6-9]/.test(cleanPhoneInput)

  const sendCode = async (targetPhone?: string) => {
    const destination = (targetPhone || activePhone || cleanPhoneInput).trim()
    if (!destination && !user?.phone) {
      setState({ kind: 'error', message: 'Please enter a valid 10-digit mobile number.' })
      setIsEditingPhone(true)
      return
    }

    setState({ kind: 'sending' })
    try {
      const res = await phoneService.sendOtp({
        email: email || undefined,
        phone: destination || undefined,
        purpose: 'verify_phone',
      })
      const dev = (res as OtpResponse).otp
      if (res.phone) {
        setActivePhone(res.phone)
      }
      setIsEditingPhone(false)
      setState({
        kind: 'sent',
        message: res.message,
        devCode: dev || undefined,
      })
      setSendCount((n) => n + 1)
      setTimeout(() => inputs.current[0]?.focus(), 150)
    } catch (err: any) {
      const body = err?.response?.data
      setState({
        kind: 'error',
        message: body?.message || 'Could not send the verification code. Please check the number.',
      })
    }
  }

  // Trigger send on initial arrival only if a valid phone is available
  useEffect(() => {
    if (initialPhone && isValidPhone) {
      sendCode(initialPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidPhone) {
      setState({ kind: 'error', message: 'Please enter a valid 10-digit Indian mobile number.' })
      return
    }
    const formatted = `+91${cleanPhoneInput}`
    setActivePhone(formatted)
    sendCode(formatted)
  }

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

  const fillDevCode = (dev: string) => {
    const chars = dev.slice(0, OTP_LENGTH).split('')
    const next = Array(OTP_LENGTH).fill('')
    for (let j = 0; j < chars.length; j += 1) next[j] = chars[j]
    setDigits(next)
    inputs.current[Math.min(chars.length, OTP_LENGTH) - 1]?.focus()
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
      const res = await phoneService.verifyOtp({
        email: email || undefined,
        phone: activePhone || (cleanPhoneInput ? `+91${cleanPhoneInput}` : undefined),
        otp: value,
      })
      // The backend returns a fresh Supabase-verified session token
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      await refresh().catch(() => {})
      setState({ kind: 'success' })
      setTimeout(() => navigate('/'), 2200)
    } catch (err: any) {
      const body = err?.response?.data
      setState({
        kind: 'error',
        message: body?.message || 'Invalid or expired code.',
        attemptsRemaining: body?.attempts_remaining,
      })
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
      <AuthLayout title="Verifying with Supabase...">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Confirming your mobile number in Supabase…</p>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'success') {
    return (
      <AuthLayout title="Phone Verified">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-1.5">PHONE VERIFIED SUCCESSFULLY</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold mb-4">
            <ShieldCheck size={14} className="text-emerald-600" /> Verified via Supabase
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your mobile number is securely confirmed in Supabase.<br />
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
    const raw = value.replace(/\D/g, '')
    if (raw.length <= 4) return value
    return `+91 ${raw.slice(-10, -6)}••••${raw.slice(-2)}`
  }

  return (
    <AuthLayout
      title="Verify Your Mobile Number"
      subtitle={
        activePhone && !isEditingPhone
          ? `We sent a Supabase code to ${mask(activePhone)}`
          : 'Enter your 10-digit mobile number to receive a verification code'
      }
    >
      <div className="flex items-center justify-center gap-1.5 mb-4 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold w-fit mx-auto">
        <ShieldCheck size={14} className="text-emerald-600" /> Supabase Phone Verification
      </div>

      {state.kind === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {state.message}
            {state.attemptsRemaining !== undefined && state.attemptsRemaining > 0 && (
              <span className="block mt-0.5 text-red-500 font-medium">
                {state.attemptsRemaining} attempt{state.attemptsRemaining === 1 ? '' : 's'} remaining
              </span>
            )}
          </span>
        </div>
      )}

      {state.kind === 'sent' && state.devCode && (
        <div
          onClick={() => fillDevCode(state.devCode!)}
          className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="shrink-0 text-amber-600" />
            <span>
              Verification code: <span className="font-mono font-bold tracking-widest text-base">{state.devCode}</span>
            </span>
          </div>
          <span className="text-xs bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
            Click to fill
          </span>
        </div>
      )}

      {/* Phone Number Input / Confirmation */}
      {isEditingPhone ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Mobile Number (India)
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold text-sm">
                +91
              </span>
              <input
                type="tel"
                value={cleanPhoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">10-digit mobile number starting with 6, 7, 8, or 9</p>
          </div>
          <SubmitButton loading={state.kind === 'sending'} disabled={!isValidPhone}>
            Send OTP via Supabase
          </SubmitButton>
          {activePhone && (
            <button
              type="button"
              onClick={() => setIsEditingPhone(false)}
              className="w-full text-xs text-zinc-500 hover:text-black transition-colors"
            >
              Cancel and keep {activePhone}
            </button>
          )}
        </form>
      ) : (
        <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 mb-5 text-sm">
          <div className="flex items-center gap-2">
            <Phone size={15} className="text-zinc-500" />
            <span className="font-semibold text-zinc-900">{activePhone || cleanPhoneInput}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingPhone(true)}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-black transition-colors"
          >
            <Edit3 size={13} /> Edit
          </button>
        </div>
      )}

      {/* OTP Code Digits */}
      {!isEditingPhone && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed flex items-start gap-2">
            <MessageSquare size={16} className="shrink-0 mt-0.5" />
            <span>
              Enter the 6-digit code sent to your number. Codes are verified via Supabase and valid for 10 minutes.
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
            Verify with Supabase
          </SubmitButton>

          <button
            onClick={handleResend}
            disabled={countdown > 0 || state.kind === 'sending'}
            className="w-full border-2 border-black text-black py-3 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.kind === 'sending'
              ? 'Sending code…'
              : countdown > 0
              ? `Resend in ${countdown}s`
              : 'Resend Code via Supabase'}
          </button>
        </div>
      )}

      <p className="text-center text-sm text-zinc-500 mt-6">
        <Link to="/login" className="text-black font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}

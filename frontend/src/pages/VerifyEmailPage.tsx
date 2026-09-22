import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react'
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
  | { kind: 'sent'; message: string }

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [state, setState] = useState<State>({ kind: 'idle' })
  const [manualToken, setManualToken] = useState('')
  const [resendArmed, setResendArmed] = useState(false)
  const countdown = useCountdown(30, resendArmed)

  // The user must click the link — merely opening the page verifies nothing.
  const verify = async (raw: string) => {
    setState({ kind: 'verifying' })
    try {
      const res = await authService.verifyEmail(raw)
      setState({ kind: 'success' })
      // The backend returns a session token so the user is signed in already.
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setTimeout(() => navigate('/'), 2200)
    } catch (err: any) {
      const body = err?.response?.data as AuthErrorResponse | undefined
      setState({
        kind: 'error',
        message: body?.message || 'This verification link is invalid.',
        expired: body?.expired,
      })
    }
  }

  // Arriving with ?token=… from the email is the primary path.
  useEffect(() => {
    if (token) verify(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleResend = async () => {
    if (!email) return
    setState({ kind: 'idle' })
    try {
      await authService.resendVerification(email)
      setResendArmed(true)
      setState({ kind: 'sent', message: 'A new verification link has been sent to your inbox.' })
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
          <p className="text-sm text-zinc-500">Confirming your email address...</p>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'success') {
    return (
      <AuthLayout title="Email Verified">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <MailCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">EMAIL VERIFIED SUCCESSFULLY</h2>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your TEEZO account is now active.<br />
            You can log in and start shopping.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            CONTINUE TO LOGIN
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={email ? `We sent a link to ${email}` : 'Check your inbox for a verification link'}
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
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-zinc-500 leading-relaxed">
          Click the verification button in the email we sent you. The link expires in 24 hours
          and can only be used once.
        </p>

        <button
          onClick={handleResend}
          disabled={countdown > 0 || !email}
          className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
        </button>
        {!email && (
          <p className="text-xs text-zinc-400 text-center">
            Enter your email below to receive a new link
          </p>
        )}

        <div className="border-t border-zinc-100 pt-4">
          <label className="text-sm font-medium text-zinc-700 mb-1.5 block">
            Or paste your verification link / token
          </label>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste the link or token from your email"
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => manualToken.trim() && verify(extractToken(manualToken.trim()))}
            disabled={!manualToken.trim()}
            className="mt-3 w-full border-2 border-black text-black py-3 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Verify Email
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500">
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

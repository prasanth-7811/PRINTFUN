import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { authService } from '../services/auth'
import {
  AuthLayout,
  PasswordField,
  PasswordStrength,
  SubmitButton,
} from '../components/auth/AuthFields'

type State =
  | { kind: 'checking' }
  | { kind: 'valid' }
  | { kind: 'error'; message: string; expired?: boolean }
  | { kind: 'saving' }
  | { kind: 'done' }

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [state, setState] = useState<State>(token ? { kind: 'checking' } : { kind: 'valid' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  // Confirm the token is still live before letting the user type a new password.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    authService
      .checkResetToken(token)
      .then(() => { if (!cancelled) setState({ kind: 'valid' }) })
      .catch((err) => {
        if (cancelled) return
        setState({
          kind: 'error',
          message: err?.response?.data?.message || 'This reset link is invalid.',
          expired: err?.response?.data?.expired,
        })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setState({ kind: 'saving' })
    try {
      await authService.resetPassword(token, password)
      setState({ kind: 'done' })
      setTimeout(() => navigate('/login'), 2200)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not reset password.')
      setState({ kind: 'valid' })
    }
  }

  if (state.kind === 'checking' || state.kind === 'saving') {
    return (
      <AuthLayout title={state.kind === 'saving' ? 'Resetting...' : 'Checking link...'}>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">
            {state.kind === 'saving' ? 'Saving your new password...' : 'Validating your reset link...'}
          </p>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'done') {
    return (
      <AuthLayout title="Password Reset">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">PASSWORD RESET SUCCESSFUL</h2>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your password has been updated and all other sessions were signed out.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            BACK TO LOGIN
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (state.kind === 'error') {
    return (
      <AuthLayout title="Reset Link Invalid">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{state.message}</span>
          </div>
          {state.expired ? (
            <Link
              to="/forgot-password"
              className="block text-center bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
            >
              Request a new link
            </Link>
          ) : (
            <Link
              to="/forgot-password"
              className="block text-center bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
            >
              Request a new link
            </Link>
          )}
          <Link to="/login" className="block text-center text-sm text-zinc-500 hover:text-black">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Choose a strong new password"
      footer={
        <p className="text-sm text-zinc-500">
          Remembered it?{' '}
          <Link to="/login" className="text-black font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <PasswordField
            id="new-password"
            label="New Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={undefined}
          />
          <PasswordStrength password={password} />
        </div>
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your new password"
          autoComplete="new-password"
        />
        <SubmitButton loading={false} disabled={!password || !confirm}>
          Reset Password
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}

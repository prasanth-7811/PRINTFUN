import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { authService } from '../services/auth'
import { AuthLayout, FormField, SubmitButton } from '../components/auth/AuthFields'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim().toLowerCase())
      // The response is deliberately generic — never reveals whether it exists.
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check Your Email">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
            <Mail size={30} className="text-zinc-700" />
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed mb-6">
            If an account exists for <strong>{email}</strong>, we've sent a password reset
            link to it. The link expires in 1 hour and can only be used once.
          </p>
          <button
            onClick={() => setSent(false)}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            Resend Link
          </button>
          <Link
            to="/login"
            className="block text-center text-sm text-zinc-500 hover:text-black mt-4"
          >
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="We'll email you a secure reset link"
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
        <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
      </form>
    </AuthLayout>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout, FormField, PasswordField, PasswordStrength, SubmitButton } from '../components/auth/AuthFields'
import type { AuthErrorResponse } from '../services/auth'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Enter your full name.'
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email))
      e.email = 'Enter a valid email address.'
    if (form.phone && !/^[0-9+()\-\s]{7,20}$/.test(form.phone))
      e.phone = 'Enter a valid mobile number.'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    if (!acceptTerms) e.terms = 'You must accept the Terms & Conditions.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setServerError('')
    if (!validate()) return

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirm_password: form.confirm,
        accept_terms: acceptTerms,
      })
      // Account created unverified — send the user to verify their email.
      navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase())}`)
    } catch (err: any) {
      const body = err?.response?.data as AuthErrorResponse | undefined
      setServerError(body?.message || 'Registration failed. Please try again.')
      if (body?.errors) setErrors({ ...errors, ...body.errors })
    }
  }

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join TEEZO and start designing"
      footer={
        <p className="text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="name"
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          placeholder="Rahul Sharma"
          autoComplete="name"
          error={errors.name}
          required
        />
        <FormField
          id="email"
          label="Email Address"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
          required
        />
        <FormField
          id="phone"
          label="Mobile Number"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          error={errors.phone}
        />
        <div>
          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            error={errors.password}
          />
          <PasswordStrength password={form.password} />
        </div>
        <PasswordField
          id="confirm"
          label="Confirm Password"
          value={form.confirm}
          onChange={set('confirm')}
          placeholder="Repeat password"
          autoComplete="new-password"
          error={errors.confirm}
        />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 rounded border-zinc-300 text-black focus:ring-black"
          />
          <span className="text-sm text-zinc-600">
            I accept the{' '}
            <Link to="/terms" className="text-black font-medium hover:underline">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-black font-medium hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms}</p>}

        <SubmitButton loading={loading}>Create Account</SubmitButton>
      </form>
    </AuthLayout>
  )
}

import { useState, useEffect, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { BRAND } from '../../config/brand'

/**
 * Shared shell for every authentication screen — logo, card, heading.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="font-black text-3xl tracking-tighter text-black">
            {BRAND.name}
          </a>
          {subtitle && <p className="text-zinc-500 text-sm mt-2">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm">
          <h1 className="text-2xl font-black text-zinc-900 mb-6">{title}</h1>
          {children}
        </div>
        {footer && <div className="text-center mt-6">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * Password input with a show/hide toggle.
 */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder = 'Min. 8 characters',
  id,
  autoComplete,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
  autoComplete?: string
  error?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full pr-11 pl-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black ${
            error ? 'border-red-300 bg-red-50/40' : 'border-zinc-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

/**
 * Labeled input with inline validation error.
 */
export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  id,
  autoComplete,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  id?: string
  autoComplete?: string
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black ${
          error ? 'border-red-300 bg-red-50/40' : 'border-zinc-200'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

/**
 * Password strength meter — mirrors the backend complexity rules.
 */
export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number or symbol', ok: /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const level = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
  const bar = score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-500' : 'bg-green-500'

  if (!password) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${bar} transition-all duration-300`}
            style={{ width: `${(score / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500 w-12 text-right">{level}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-xs ${c.ok ? 'text-green-600' : 'text-zinc-400'}`}
          >
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Loading-aware submit button. ``onClick`` is optional so it can also stand in
 * for a submit outside a <form> (the OTP boxes, for example).
 */
export function SubmitButton({
  loading,
  children,
  disabled,
  onClick,
}: {
  loading: boolean
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  )
}

/**
 * Resend countdown — enforces the backend cooldown client-side too.
 *
 * ``active`` arms the timer and ``key`` restarts it, so a resend before the
 * countdown lapses still waits out the server-side cooldown.
 */
export function useCountdown(seconds: number, active: boolean, key: number | string = 0) {
  const [remaining, setRemaining] = useState(active ? seconds : 0)

  useEffect(() => {
    if (!active) return
    setRemaining(seconds)
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // Re-arm whenever the countdown is armed or its key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])

  return remaining
}

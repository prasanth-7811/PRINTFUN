import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last line of defence against a white screen.
 *
 * A thrown error inside render unwinds the whole React tree and leaves the page
 * blank. Catching it here lets us show a recovery message and a way back in.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in the browser console; no external logging wired up yet.
    console.error('Uncaught render error:', error, info.componentStack)
  }

  handleReset = () => {
    // Corrupt local state is the usual suspect, so clear it before retrying.
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('cart')
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-black text-zinc-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            The page hit an unexpected error. Your saved sign-in has been cleared
            so you can try again.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReset}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="w-full border-2 border-zinc-200 text-zinc-700 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-50 transition-colors"
            >
              Go to homepage
            </a>
          </div>
          <p className="mt-6 text-[11px] text-zinc-400 break-words">{error.message}</p>
        </div>
      </div>
    )
  }
}

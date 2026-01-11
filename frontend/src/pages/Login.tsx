import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const auth = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('admin@ecopulse.ai')
  const [password, setPassword] = useState('admin123')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitLabel = useMemo(() => (mode === 'login' ? 'Sign in' : 'Create account'), [mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await auth.login(email, password)
      } else {
        await auth.register(email, password, fullName)
      }
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 py-10 md:grid-cols-2 md:items-center">
      <div>
        <h1 className="text-3xl font-bold text-white">EcoPulse AI</h1>
        <p className="mt-3 text-slate-300">
          Track and optimize the environmental impact of AI model usage with emissions accounting, green mode
          optimization, and ESG reporting.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
          <div className="font-semibold text-slate-200">Default demo users</div>
          <div className="mt-2">
            <div>admin@ecopulse.ai / admin123</div>
            <div>user@ecopulse.ai / user123</div>
          </div>
        </div>
      </div>

      <Card title={mode === 'login' ? 'Sign in' : 'Create account'}>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'register' ? (
            <div>
              <label className="text-xs text-slate-300">Full name (optional)</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs text-slate-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Working…' : submitLabel}
          </Button>

          <div className="text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <button type="button" onClick={() => setMode('register')} className="text-emerald-400 hover:underline">
                Create an account
              </button>
            ) : (
              <button type="button" onClick={() => setMode('login')} className="text-emerald-400 hover:underline">
                Back to sign in
              </button>
            )}
            <div className="mt-2">
              <Link to="/" className="text-slate-500 hover:underline">
                Continue as guest (requires API auth)
              </Link>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}

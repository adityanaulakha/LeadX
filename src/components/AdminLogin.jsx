import { useMemo, useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { Button, Card, Field, Notice, inputClass } from '../ui/ui.jsx'

export default function AdminLogin({ title = 'Sign in', subtitle = 'Account' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [isSignUp, setIsSignUp] = useState(false)

  const canSubmit = useMemo(() => email.trim() && password, [email, password])

  async function onSubmit(e) {
    e.preventDefault()
    setStatus({ type: 'loading', message: isSignUp ? 'Creating account…' : 'Signing in…' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
        setStatus({ type: 'success', message: 'Account created.' })
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        setStatus({ type: 'success', message: 'Signed in.' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Authentication failed' })
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">{subtitle}</p>
      <h2 className="mt-1 font-hero text-3xl tracking-[-0.03em]">{title}</h2>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Field label="Email" htmlFor="admin-email">
          <input id="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="admin-password">
          <input id="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className={inputClass} />
        </Field>
        <Button type="submit" variant="ink" className="w-full" disabled={!canSubmit || status.type === 'loading'}>
          {status.type === 'loading' ? 'Working…' : (isSignUp ? 'Create account' : 'Sign in')}
        </Button>
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setStatus({ type: 'idle', message: '' }) }}
          className="text-sm font-semibold underline underline-offset-4"
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
        {status.type !== 'idle' && status.type !== 'loading' && (
          <Notice tone={status.type === 'error' ? 'error' : 'success'}>{status.message}</Notice>
        )}
      </form>
    </Card>
  )
}

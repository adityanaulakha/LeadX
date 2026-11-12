import { useMemo, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth, firebaseEnabled, googleProvider } from '../lib/firebase.js'
import { useAuthState } from './AdminPage.jsx'
import { sanitizeString } from '../utils/sanitize.js'
import { ensureUserProfile } from '../lib/users.js'
import { Button, Card, Field, Notice, PageShell, inputClass, focus } from '../ui/ui.jsx'

export default function AuthPage() {
  const user = useAuthState()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [searchParams] = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup')
  const [status, setStatus] = useState({ type: 'idle', message: '', code: '' })

  useEffect(() => {
    setIsSignUp(searchParams.get('mode') === 'signup')
  }, [searchParams])

  const canSubmit = useMemo(() => email.trim() && password, [email, password])

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])



  async function handleForgotPassword() {
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'PLEASE ENTER YOUR EMAIL ADDRESS FIRST' })
      return
    }
    const cleanEmail = sanitizeString(email)
    if (!cleanEmail) {
      setStatus({ type: 'error', message: 'PLEASE ENTER A VALID EMAIL ADDRESS' })
      return
    }
    setStatus({ type: 'loading', message: 'SENDING RESET LINK...' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      await sendPasswordResetEmail(auth, cleanEmail)
      setStatus({ type: 'success', message: 'PASSWORD RESET LINK SENT TO YOUR EMAIL. CHECK SPAM/JUNK IF NOT IN INBOX.' })
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'FAILED TO SEND RESET LINK' })
    }
  }

  async function onSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    const cleanEmail = sanitizeString(email)
    const cleanPassword = sanitizeString(password)
    if (!cleanEmail || !cleanPassword) {
      setStatus({ type: 'error', message: 'PLEASE ENTER VALID CREDENTIALS' })
      return
    }
    setStatus({ type: 'loading', message: isSignUp ? 'CREATING ACCOUNT...' : 'LOGGING IN...', code: '' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      let res;
      if (isSignUp) {
        res = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
      } else {
        res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword)
      }
      
      if (res && res.user) {
        setStatus({ type: 'loading', message: 'ESTABLISHING SOCIAL HANDLE PROFILE...', code: '' })
        await ensureUserProfile(res.user.uid, res.user.email, null)
      }
    } catch (err) {
      let friendlyMessage = err?.message || 'AUTHENTICATION FAILED'
      let code = ''
      
      if (err?.code === 'auth/email-already-in-use') {
        friendlyMessage = 'THIS EMAIL IS ALREADY IN USE. CHOOSE A DIFFERENT ONE OR LOG IN.'
        code = 'email-already-in-use'
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        if (isSignUp) {
          friendlyMessage = err?.message || 'AUTHENTICATION FAILED'
        } else {
          friendlyMessage = 'THIS EMAIL IS NOT REGISTERED OR CREDENTIALS INVALID. PLEASE CHECK TYPOS OR SIGN UP.'
          code = 'user-not-found'
        }
      } else if (err?.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'EMAIL/PASSWORD LOGIN IS DISABLED! Go to console.firebase.google.com -> Authentication -> Sign-in Method and ENABLE Email/Password!'
        code = 'operation-not-allowed'
      }
      
      setStatus({ type: 'error', message: friendlyMessage, code })
    }
  }

  async function signInWithOAuth(provider) {
    setStatus({ type: 'loading', message: 'OPENING SECURE PROVIDER...', code: '' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      const res = await signInWithPopup(auth, provider)
      if (res && res.user) {
        setStatus({ type: 'loading', message: 'PREPARING GLOBAL IDENTITY PROFILE...', code: '' })
        await ensureUserProfile(res.user.uid, res.user.email, res.user.displayName)
      }
    } catch (err) {
      console.error("Firebase Auth Popup Error:", err)
      if (err?.code === 'auth/popup-closed-by-user') {
        setStatus({ type: 'idle', message: '' })
      } else if (err?.code === 'auth/unauthorized-domain') {
        setStatus({
          type: 'error',
          message: 'UNAUTHORIZED DOMAIN! Add your current domain to Firebase Console -> Authentication -> Settings -> Authorized Domains.',
          code: 'auth/unauthorized-domain'
        })
      } else if (err?.code === 'auth/operation-not-allowed') {
        setStatus({ 
          type: 'error', 
          message: 'OAUTH METHOD DISABLED! Go to console.firebase.google.com -> Authentication -> Sign-in Method and ENABLE Google provider!', 
          code: 'auth/operation-not-allowed' 
        })
      } else if (err?.code === 'auth/popup-blocked') {
        setStatus({
          type: 'error',
          message: 'POPUP BLOCKED! Please enable popups for this site in your browser address bar.',
          code: 'auth/popup-blocked'
        })
      } else {
        setStatus({ type: 'error', message: err?.message || 'OAUTH INITIATION FAILED', code: '' })
      }
    }
  }

  return (
    <PageShell>
      <div className="flex min-h-dvh items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md p-5 sm:p-8">
          <Link to="/" className={`mb-6 inline-flex rounded-sm ${focus}`} aria-label="LeadX, home">
            <img src="/Lead-X.png" alt="" className="h-9 w-auto" />
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">
            {isSignUp ? 'New organizer' : 'Sign in'}
          </p>
          <h1 className="mt-2 font-hero text-[clamp(2.4rem,6vw,3.4rem)] font-medium leading-[0.95] tracking-[-0.035em]">
            {isSignUp ? 'Start an event.' : 'Welcome back.'}
          </h1>
          {!firebaseEnabled && <Notice className="mt-5">Firebase is not configured, so sign-in cannot complete.</Notice>}

          <Button
            type="button"
            variant="white"
            className="mt-6 w-full"
            onClick={() => signInWithOAuth(googleProvider)}
            disabled={status.type === 'loading'}
          >
            Continue with Google
          </Button>

          <p className="my-5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">or email</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" htmlFor="auth-email">
              <input id="auth-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={inputClass} placeholder="you@example.com" />
            </Field>
            <Field label="Password" htmlFor="auth-password">
              <input id="auth-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} className={inputClass} placeholder="••••••••" />
            </Field>
            {!isSignUp && (
              <button type="button" onClick={handleForgotPassword} className={`text-sm font-semibold underline underline-offset-4 ${focus}`}>
                Forgot password
              </button>
            )}
            <Button type="submit" variant="ink" className="w-full" disabled={!canSubmit || status.type === 'loading'}>
              {status.type === 'loading' ? 'Working…' : (isSignUp ? 'Create account' : 'Log in')}
            </Button>
          </form>

          {status.type !== 'idle' && status.message && (
            <Notice tone={status.type === 'error' ? 'error' : 'success'} className="mt-4">
              <span>{status.message}</span>
              {status.code === 'email-already-in-use' && (
                <button type="button" className="mt-2 block underline" onClick={() => { setIsSignUp(false); setStatus({ type: 'idle', message: '', code: '' }) }}>Go to log in</button>
              )}
              {status.code === 'user-not-found' && (
                <button type="button" className="mt-2 block underline" onClick={() => { setIsSignUp(true); setStatus({ type: 'idle', message: '', code: '' }) }}>Go to sign up</button>
              )}
            </Notice>
          )}

          <div className="mt-6 border-t border-neo-black/15 pt-4 text-center">
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setStatus({ type: 'idle', message: '' }) }} className={`text-sm font-semibold underline underline-offset-4 ${focus}`}>
              {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import { Logo } from '../components/Layout'

export default function AuthView({ mode }) {
  const { login, register } = useAuth()
  const isLogin = mode === 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await (isLogin ? login : register)(email, password)
    } catch (err) {
      setError(errorMessage(err, 'Unable to reach the server'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-900 p-12 lg:flex">
        <Logo />
        <div>
          <span className="badge">Bharatiya Nyaya Sanhita, 2023</span>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white">
            Criminal law answers, <br />grounded in the statute.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Ask in plain language. Every answer cites the exact BNS sections it relies on, with the full text one click away.
          </p>
        </div>
        <p className="text-xs text-slate-500">General legal information only. Not a substitute for advice from a qualified advocate.</p>
      </div>

      <div className="flex items-center justify-center bg-slate-100 p-6">
        <form onSubmit={submit} className="card w-full max-w-md p-8">
          <div className="mb-6 lg:hidden"><Logo light={false} /></div>
          <h2 className="text-2xl font-bold text-navy-900">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            {isLogin ? 'Sign in to continue your research.' : 'Save chats, bookmarks and research notes.'}
          </p>
          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input className="input mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            className="input"
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!isLogin && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
          <button className="btn-gold mt-6 w-full" disabled={busy}>
            {busy ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? 'New here? ' : 'Already registered? '}
            <Link className="font-semibold text-gold-600 hover:underline" to={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

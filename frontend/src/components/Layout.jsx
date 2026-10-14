import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Logo = ({ light = true }) => (
  <div className="flex items-center gap-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 font-serif text-lg font-bold text-white">न्</div>
    <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
      NyayaMitra <span className="text-gold-400">AI</span>
    </span>
  </div>
)

const link = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-white/10 text-gold-400' : 'text-slate-300 hover:text-white'
  }`

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-screen flex-col">
      <header className="bg-navy-900 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="flex gap-1">
              <NavLink to="/" end className={link}>Assistant</NavLink>
              <NavLink to="/sections" className={link}>Section Explorer</NavLink>
              <NavLink to="/bookmarks" className={link}>Bookmarks</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:block">{user?.email}</span>
            <button
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
              onClick={() => { logout(); navigate('/login') }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
